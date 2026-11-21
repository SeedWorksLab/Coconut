/** @jest-environment node */
import { webcrypto } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { COCONUT_OAUTH } from '../../src/config/oauth';
import { SEEDWORKS_CLOUD } from '../../src/config/cloud';
import {
  createOAuthFetch, readTransaction, requestOAuthTokens, startHostedLogin, validateOAuthClaims,
} from '../../src/sync/hosted-oauth.web';

const authUrl = `${SEEDWORKS_CLOUD.supabaseUrl}/auth/v1`;
const now = 1800000000000;
const valid = { state: 's'.repeat(43), verifier: 'v'.repeat(43), createdAt: now };
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'test@example.com' };
function token(overrides: Record<string, unknown> = {}): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'ES256' })}.${encode({
    iss: authUrl, aud: 'authenticated', role: 'authenticated',
    client_id: COCONUT_OAUTH.clientId, sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  })}.${Buffer.from('signature').toString('base64url')}`;
}
function response(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('OAuth transaction and claims validation', () => {
  it('requires matching single-use state, valid verifier and a bounded transaction age', () => {
    expect(readTransaction(JSON.stringify(valid), valid.state, now)).toEqual(valid);
    for (const [value, state, time] of [
      [null, valid.state, now],
      [JSON.stringify(valid), 'wrong', now],
      [JSON.stringify(valid), valid.state, now + 600001],
      [JSON.stringify(valid), valid.state, now - 1],
      [JSON.stringify({ ...valid, verifier: 'short' }), valid.state, now],
    ] as const) expect(() => readTransaction(value, state, time)).toThrow();
  });

  it('rejects wrong project, audience, client, expired tokens and malformed JWTs', () => {
    expect(() => validateOAuthClaims(token())).not.toThrow();
    for (const change of [
      { iss: 'https://evil.example/auth/v1' }, { aud: 'other' },
      { client_id: 'other' }, { role: 'service_role' }, { exp: 1 }, { sub: null },
    ]) expect(() => validateOAuthClaims(token(change))).toThrow();
    expect(() => validateOAuthClaims('not-a-token')).toThrow();
  });
});

describe('OAuth transport', () => {
  it('uses the OAuth endpoint, verifies the returned user, and retains a nonrotated refresh token', async () => {
    const access = token();
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response({ access_token: access, expires_in: 3600, token_type: 'bearer' }))
      .mockResolvedValueOnce(response(user));
    const result = await requestOAuthTokens({ grant_type: 'refresh_token', refresh_token: 'original' }, fetcher);
    expect(await result.json()).toMatchObject({ access_token: access, refresh_token: 'original', user });
    expect(fetcher.mock.calls[0][0]).toBe(`${authUrl}/oauth/token`);
    const options = fetcher.mock.calls[0][1];
    expect(options.credentials).toBe('omit');
    expect(options.redirect).toBe('error');
    expect(options.body.get('client_id')).toBe(COCONUT_OAUTH.clientId);
    expect(fetcher.mock.calls[1][0]).toBe(`${authUrl}/user`);
  });

  it('does not accept unverified or wrong-user tokens', async () => {
    for (const verification of [response({}, 401), response({ id: 'different' })]) {
      const fetcher = jest.fn()
        .mockResolvedValueOnce(response({
          access_token: token(), refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer',
        })).mockResolvedValueOnce(verification);
      await expect(requestOAuthTokens({ grant_type: 'authorization_code' }, fetcher)).rejects.toThrow();
    }
  });

  it('passes revocation failures back without attempting user lookup', async () => {
    const fetcher = jest.fn().mockResolvedValue(response({ error: 'invalid_grant' }, 400));
    expect((await requestOAuthTokens({ grant_type: 'refresh_token', refresh_token: 'revoked' }, fetcher)).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('routes real SDK refresh and token rotation through the OAuth endpoint', async () => {
    const access = token();
    const fetcher = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === `${authUrl}/user`) return response(user);
      if (url === `${authUrl}/oauth/token`) return response({
        access_token: access, refresh_token: 'rotated', expires_in: 3600, token_type: 'bearer',
      });
      throw new Error(`Unexpected request: ${url}`);
    });
    const client = createClient(SEEDWORKS_CLOUD.supabaseUrl, SEEDWORKS_CLOUD.apiKey, {
      global: { fetch: createOAuthFetch(fetcher) },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    expect((await client.auth.setSession({ access_token: access, refresh_token: 'initial' })).error).toBeNull();
    const refreshed = await client.auth.refreshSession();
    expect(refreshed.error).toBeNull();
    expect(refreshed.data.session?.refresh_token).toBe('rotated');
    const call = fetcher.mock.calls.find(([url]) => String(url) === `${authUrl}/oauth/token`);
    expect(call).toBeDefined();
  });
});

describe('authorization start', () => {
  it('creates cryptographic PKCE and state, with no tokens or verifier in the URL', async () => {
    const storage = new Map<string, string>();
    const assign = jest.fn();
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: webcrypto });
    const fakeWindow = {
      location: { origin: String(COCONUT_OAUTH.origin), assign },
      sessionStorage: { setItem: (key: string, value: string) => storage.set(key, value) },
      top: null as unknown, self: null as unknown,
    };
    fakeWindow.top = fakeWindow.self = fakeWindow;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
    try {
      await startHostedLogin();
      const url = new URL(assign.mock.calls[0][0]);
      const transaction = JSON.parse(storage.get(COCONUT_OAUTH.transactionKey)!);
      expect(url.origin + url.pathname).toBe(`${authUrl}/oauth/authorize`);
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
      expect(url.searchParams.get('redirect_uri')).toBe(COCONUT_OAUTH.callback);
      expect(url.searchParams.get('state')).toBe(transaction.state);
      expect(url.href).not.toContain(transaction.verifier);
      expect(transaction.verifier).toHaveLength(43);
      fakeWindow.location.origin = 'https://evil.example';
      await expect(startHostedLogin()).rejects.toThrow();
    } finally {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });
});

describe('callback completion', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    Reflect.deleteProperty(globalThis, 'window');
    jest.resetModules();
  });

  function callbackWindow(query: string, stored: string | null) {
    const removeItem = jest.fn();
    const replace = jest.fn();
    const replaceState = jest.fn();
    const fakeWindow = {
      location: {
        pathname: '/auth/callback',
        href: `${COCONUT_OAUTH.callback}${query}`,
        replace,
      },
      history: { replaceState },
      sessionStorage: { getItem: () => stored, removeItem },
      top: null as unknown, self: null as unknown,
    };
    fakeWindow.top = fakeWindow.self = fakeWindow;
    Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
    return { removeItem, replace, replaceState };
  }

  it.each([
    '?code=once&state=wrong',
    `?code=once&code=twice&state=${valid.state}`,
    `?error=access_denied&state=${valid.state}`,
    `?code=once&state=${valid.state}#access_token=untrusted`,
  ])('scrubs and rejects invalid callbacks before exchanging anything: %s', async (query) => {
    const browser = callbackWindow(query, JSON.stringify({ ...valid, createdAt: Date.now() }));
    const fetcher = jest.fn();
    globalThis.fetch = fetcher;
    const { completeHostedLogin } = require('../../src/sync/hosted-oauth.web');
    await expect(completeHostedLogin({ auth: { setSession: jest.fn() } })).rejects.toThrow();
    expect(browser.replaceState).toHaveBeenCalledWith(null, '', '/auth/callback');
    expect(browser.removeItem).toHaveBeenCalledWith(COCONUT_OAUTH.transactionKey);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('exchanges a valid callback once, verifies it and installs an independent session', async () => {
    const browser = callbackWindow(`?code=once&state=${valid.state}`, JSON.stringify({ ...valid, createdAt: Date.now() }));
    const access = token();
    const fetcher = jest.fn()
      .mockResolvedValueOnce(response({ access_token: access, refresh_token: 'new-refresh', expires_in: 3600, token_type: 'bearer' }))
      .mockResolvedValueOnce(response(user));
    globalThis.fetch = fetcher;
    const setSession = jest.fn().mockResolvedValue({ data: { session: { user } }, error: null });
    const { completeHostedLogin } = require('../../src/sync/hosted-oauth.web');
    const client = { auth: { setSession } };
    const first = completeHostedLogin(client);
    const repeated = completeHostedLogin(client);
    expect(repeated).toBe(first);
    await expect(first).resolves.toBe(true);
    expect(setSession).toHaveBeenCalledTimes(1);
    expect(setSession.mock.calls[0][0]).toMatchObject({ access_token: access, refresh_token: 'new-refresh' });
    expect(browser.replace).toHaveBeenCalledWith('/');
    expect(fetcher.mock.calls[0][1].body.get('code_verifier')).toBe(valid.verifier);
  });
});
