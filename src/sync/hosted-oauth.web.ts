import type { SupabaseClient } from '@supabase/supabase-js';
import { SEEDWORKS_CLOUD } from '../config/cloud';
import { COCONUT_OAUTH } from '../config/oauth';

const authUrl = `${SEEDWORKS_CLOUD.supabaseUrl}/auth/v1`;
const MAX_AGE = 10 * 60 * 1000;
const FAILURE = 'SeedWorks sign-in could not be verified. Please start sign-in again.';

interface Transaction {
  state: string;
  verifier: string;
  createdAt: number;
}

function encode(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function readTransaction(value: string | null, state: string | null, now = Date.now()): Transaction {
  let transaction: Transaction | null;
  try {
    transaction = JSON.parse(value || 'null') as Transaction | null;
  } catch {
    throw new Error(FAILURE);
  }
  if (!transaction || !state || transaction.state !== state
    || !/^[A-Za-z0-9_-]{43}$/.test(transaction.state)
    || !/^[A-Za-z0-9_-]{43}$/.test(transaction.verifier)
    || !Number.isFinite(transaction.createdAt)
    || now < transaction.createdAt || now - transaction.createdAt > MAX_AGE) {
    throw new Error(FAILURE);
  }
  return transaction;
}

export async function startHostedLogin(): Promise<void> {
  if (window.location.origin !== COCONUT_OAUTH.origin || window.top !== window.self) {
    throw new Error('SSO is available only at https://coconut.seedworkslab.de.');
  }
  const verifier = encode(crypto.getRandomValues(new Uint8Array(32)));
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  window.sessionStorage.setItem(COCONUT_OAUTH.transactionKey, JSON.stringify({ verifier, state, createdAt: Date.now() }));
  const url = new URL(`${authUrl}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: 'code', client_id: COCONUT_OAUTH.clientId,
    redirect_uri: COCONUT_OAUTH.callback, state,
    code_challenge: challenge, code_challenge_method: 'S256', scope: 'email',
  }).toString();
  window.location.assign(url.href);
}

interface Tokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// Inspect claims only after the trusted Auth server has validated this exact
// access token through /user. Decoding by itself is never authentication.
export function validateOAuthClaims(token: string, now = Date.now()): void {
  let claims: Record<string, unknown>;
  try {
    const part = token.split('.')[1];
    claims = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>;
    if (!claims || typeof claims !== 'object') throw new Error(FAILURE);
  } catch {
    throw new Error(FAILURE);
  }
  if (claims.iss !== authUrl || claims.aud !== 'authenticated'
    || claims.client_id !== COCONUT_OAUTH.clientId || claims.role !== 'authenticated'
    || typeof claims.sub !== 'string' || !claims.sub
    || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp) || claims.exp * 1000 <= now) {
    throw new Error(FAILURE);
  }
}

export async function requestOAuthTokens(
  fields: Record<string, string>,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(`${authUrl}/oauth/token`, {
    method: 'POST', credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, client_id: COCONUT_OAUTH.clientId }),
  });
  if (!response.ok) return response;
  const tokens = await response.json() as Tokens;
  if (typeof tokens.access_token !== 'string' || !tokens.access_token
    || typeof tokens.expires_in !== 'number' || !Number.isFinite(tokens.expires_in) || tokens.expires_in <= 0
    || tokens.token_type?.toLowerCase() !== 'bearer'
    || (tokens.refresh_token !== undefined && typeof tokens.refresh_token !== 'string')) {
    throw new Error(FAILURE);
  }
  const userResponse = await fetcher(`${authUrl}/user`, {
    credentials: 'omit', cache: 'no-store', redirect: 'error',
    signal: AbortSignal.timeout(15000),
    headers: { apikey: SEEDWORKS_CLOUD.apiKey, Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userResponse.ok) throw new Error(FAILURE);
  validateOAuthClaims(tokens.access_token);
  const user = await userResponse.json() as { id?: string };
  const claims = JSON.parse(atob(tokens.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { sub: string };
  if (!user.id || user.id !== claims.sub) throw new Error(FAILURE);
  const refreshToken = tokens.refresh_token || fields.refresh_token;
  if (!refreshToken) throw new Error(FAILURE);
  return new Response(JSON.stringify({ ...tokens, refresh_token: refreshToken, user }), {
    status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Preserve SDK storage locking, rotation and auth events while routing OAuth
// refreshes through the OAuth token endpoint, not the password-session endpoint.
export function createOAuthFetch(fetcher: typeof fetch = fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.href === `${authUrl}/token?grant_type=refresh_token` && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { refresh_token?: string };
      if (!body.refresh_token) throw new Error(FAILURE);
      return requestOAuthTokens({ grant_type: 'refresh_token', refresh_token: body.refresh_token }, fetcher);
    }
    return fetcher(input, init);
  };
}

let callbackPromise: Promise<boolean> | undefined;

export function completeHostedLogin(client: Pick<SupabaseClient, 'auth'>): Promise<boolean> {
  if (window.location.pathname !== '/auth/callback') return Promise.resolve(false);
  if (callbackPromise) return callbackPromise;
  const url = new URL(window.location.href);
  // Remove codes/errors from browser history before any network request.
  window.history.replaceState(null, '', '/auth/callback');
  callbackPromise = (async () => {
    const stored = window.sessionStorage.getItem(COCONUT_OAUTH.transactionKey);
    window.sessionStorage.removeItem(COCONUT_OAUTH.transactionKey);
    if (url.origin !== COCONUT_OAUTH.origin || url.hash || window.top !== window.self
      || [...url.searchParams.keys()].some((key) => url.searchParams.getAll(key).length !== 1)) {
      throw new Error(FAILURE);
    }
    const transaction = readTransaction(stored, url.searchParams.get('state'));
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code || code.length > 4096) throw new Error(FAILURE);
    const response = await requestOAuthTokens({
      grant_type: 'authorization_code', code, redirect_uri: COCONUT_OAUTH.callback,
      code_verifier: transaction.verifier,
    });
    if (!response.ok) throw new Error(FAILURE);
    const tokens = await response.json() as Tokens;
    const result = await client.auth.setSession(tokens);
    if (result.error || !result.data.session) throw new Error(FAILURE);
    window.location.replace('/');
    return true;
  })();
  return callbackPromise;
}
