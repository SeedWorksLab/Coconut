import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, PaperProvider, Text } from 'react-native-paper';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { HOSTED_WEB } from '../config/hosted-web';
import { SEEDWORKS_CLOUD } from '../config/cloud';
import { SEEDWORKS_AUTH_STORAGE_KEY } from '../sync/auth-storage';
import { openHostedAccountCache } from '../sync/hosted-bootstrap';

const ACCOUNT_URL = '/account.html';

function createAccountClient(): SupabaseClient {
  return createClient(SEEDWORKS_CLOUD.supabaseUrl, SEEDWORKS_CLOUD.apiKey, {
    auth: {
      storageKey: SEEDWORKS_AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
}

export function HostedWebGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'loading' | 'ready' | 'error'>(
    HOSTED_WEB ? 'checking' : 'ready'
  );
  const [message, setMessage] = useState('');
  const [openedUserId, setOpenedUserId] = useState<string | null>(null);
  const [client] = useState(() => HOSTED_WEB ? createAccountClient() : null);

  const check = useCallback(async () => {
    if (!client) return;
    setStatus('checking');
    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) {
        setStatus('signed-out');
        return;
      }
      const online = navigator.onLine !== false;
      let user = session.user;
      if (online) {
        const verified = await client.auth.getUser();
        if (verified.error || !verified.data.user || verified.data.user.id !== user.id) {
          setStatus('signed-out');
          return;
        }
        user = verified.data.user;
      }
      setOpenedUserId(user.id);
      setStatus('loading');
      await openHostedAccountCache(user, online);
      const { data: { session: currentSession } } = await client.auth.getSession();
      if (currentSession?.user.id !== user.id) {
        throw new Error('Your Seed account changed while Coconut was loading. Reload this page.');
      }
      setStatus('ready');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not open your account.');
      setStatus('error');
    }
  }, [client]);

  useEffect(() => {
    if (!client) return;
    void Promise.resolve().then(check);
  }, [check, client]);

  useEffect(() => {
    if (!client) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === SEEDWORKS_AUTH_STORAGE_KEY || event.key === null) {
        const storedUserId = (() => {
          try {
            const value = event.newValue ? JSON.parse(event.newValue) as { user?: { id?: string } } : null;
            return value?.user?.id ?? null;
          } catch {
            return null;
          }
        })();
        if ((status === 'ready' || status === 'loading') && storedUserId !== openedUserId) {
          window.location.reload();
        } else if (status !== 'ready' && status !== 'loading') {
          void check();
        }
      }
    };
    window.addEventListener('storage', onStorage);
    const onFocus = () => {
      if (status === 'ready') {
        void client.auth.getSession().then(({ data }) => {
          if (data.session?.user.id !== openedUserId) window.location.reload();
        }).catch(() => window.location.reload());
      } else if (status !== 'loading') {
        void check();
      }
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [check, client, status, openedUserId]);

  if (status === 'ready') return children;
  return (
    <PaperProvider>
      <View style={styles.container}>
        <Text variant="headlineMedium">Coconut</Text>
        <Text variant="bodyLarge">
          {status === 'signed-out'
            ? 'Sign in to your Seed account to open Coconut on the web.'
            : status === 'loading'
              ? 'Loading your Coconut data from SeedWorks Cloud…'
              : status === 'error' ? message : 'Checking your Seed account…'}
        </Text>
        {status === 'signed-out' || status === 'error' ? (
          <>
            <Button mode="contained" onPress={() => window.location.assign(ACCOUNT_URL)}>
              Open Seed account
            </Button>
            <Button onPress={() => void check()}>Try again</Button>
          </>
        ) : null}
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    padding: 24,
  },
});
