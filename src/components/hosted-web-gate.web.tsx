import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, PaperProvider, Text } from 'react-native-paper';

import { HOSTED_WEB } from '../config/hosted-web';
import { SEEDWORKS_ACCOUNT_URL } from '../config/cloud';
import { SEEDWORKS_AUTH_STORAGE_KEY } from '../sync/auth-storage';
import { openHostedAccountCache } from '../sync/hosted-bootstrap';
import { getHostedAccountClient } from '../sync/hosted-account-client';
import { completeHostedLogin, startHostedLogin, validateOAuthClaims } from '../sync/hosted-oauth.web';

export function HostedWebGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'signed-out' | 'loading' | 'ready' | 'error'>(
    HOSTED_WEB ? 'checking' : 'ready'
  );
  const [message, setMessage] = useState('');
  const [openedUserId, setOpenedUserId] = useState<string | null>(null);
  const [client] = useState(() => HOSTED_WEB ? getHostedAccountClient() : null);
  const checkInFlight = useRef<Promise<void> | null>(null);

  const checkAccount = useCallback(async () => {
    if (!client) return;
    setStatus('checking');
    try {
      if (window.top !== window.self) throw new Error('Open Coconut directly, not inside another website.');
      if (await completeHostedLogin(client)) return;
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
        if (window.location.hostname === 'coconut.seedworkslab.de') {
          validateOAuthClaims(session.access_token);
        }
      } else if (!session.expires_at || session.expires_at * 1000 <= Date.now()) {
        setStatus('signed-out');
        return;
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

  const check = useCallback((): Promise<void> => {
    if (checkInFlight.current) return checkInFlight.current;
    const operation = checkAccount();
    checkInFlight.current = operation;
    void operation.finally(() => {
      if (checkInFlight.current === operation) checkInFlight.current = null;
    });
    return operation;
  }, [checkAccount]);

  useEffect(() => {
    if (!client) return;
    void Promise.resolve().then(check);
  }, [check, client]);

  useEffect(() => {
    if (!client) return;
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if ((status === 'ready' || status === 'loading')
        && (event === 'SIGNED_OUT' || (session && session.user.id !== openedUserId))) {
        window.location.reload();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [client, status, openedUserId]);

  const signIn = async () => {
    try {
      if (window.location.hostname === 'seedworkslab.de') {
        window.location.assign(SEEDWORKS_ACCOUNT_URL);
      } else {
        await startHostedLogin();
      }
    } catch {
      setMessage('Could not start secure sign-in. Open https://coconut.seedworkslab.de and try again.');
      setStatus('error');
    }
  };

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
        void client.auth.getSession().then(async ({ data }) => {
          if (data.session?.user.id !== openedUserId) window.location.reload();
          else if (navigator.onLine !== false) {
            const verified = await client.auth.getUser();
            if (verified.error || verified.data.user?.id !== openedUserId) window.location.reload();
          }
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
            <Button mode="contained" onPress={() => void signIn()}>
              Sign in with SeedWorks
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
