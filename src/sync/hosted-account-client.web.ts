import { createClient } from '@supabase/supabase-js';
import type { CoconutClient } from './supabase';
import { SEEDWORKS_CLOUD } from '../config/cloud';
import { HOSTED_WEB } from '../config/hosted-web';
import { SEEDWORKS_AUTH_STORAGE_KEY } from './auth-storage';
import { createOAuthFetch } from './hosted-oauth.web';

let client: CoconutClient | null = null;

export function getHostedAccountClient(): CoconutClient | null {
  if (!HOSTED_WEB) return null;
  if (!client) {
    client = createClient(SEEDWORKS_CLOUD.supabaseUrl, SEEDWORKS_CLOUD.apiKey, {
      db: { schema: 'coconut' },
      // The legacy same-origin deployment retains its password-session refresh.
      global: window.location.hostname === 'coconut.seedworkslab.de'
        ? { fetch: createOAuthFetch() } : undefined,
      auth: {
        storage: window.localStorage,
        storageKey: SEEDWORKS_AUTH_STORAGE_KEY,
        persistSession: true, autoRefreshToken: true, detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return client;
}
