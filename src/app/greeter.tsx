import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Button,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput as PaperTextInput,
} from 'react-native-paper';

import { useAppData } from '../data/DataProvider';
import { LANGUAGES, useI18n, type Language } from '../i18n';
import { useAppTheme } from '../theme';
import { CoconutLogo } from '../components/coconut-logo';
import { KeyboardAwareScrollView } from '../components/keyboard-aware-scroll-view';
import { ScreenFade } from '../components/screen-fade';
import { setGreeterSeen } from '../database/greeterPrefs';
import { getTutorialSeen, setTutorialSeen } from '../database/tutorialPrefs';
import { signInToSupabase } from '../sync/supabase';
import { syncNow } from '../sync/engine';

export default function GreeterScreen() {
  const { settings, setLanguage, setSyncEnabled, refresh } = useAppData();
  const { t } = useI18n();
  const theme = useAppTheme();
  const router = useRouter();

  const [mode, setMode] = useState<'choice' | 'login'>('choice');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLogin = email.trim().length > 0 && password.length >= 6 && !busy;

  async function leaveGreeter(): Promise<void> {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  async function startFresh(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await setGreeterSeen();
      if (await getTutorialSeen()) {
        await leaveGreeter();
      } else {
        // Replace the greeter so the tutorial still has the tabs behind it and
        // can close back to the app.
        router.replace('/tutorial');
      }
    } finally {
      setBusy(false);
    }
  }

  async function restoreAccount(): Promise<void> {
    if (!canLogin) {
      return;
    }
    setBusy(true);
    setError(null);
    let signedIn = false;
    try {
      await signInToSupabase(email.trim(), password);
      signedIn = true;
      await setSyncEnabled(true);
      const outcome = await syncNow();
      if (!outcome) {
        throw new Error('Sync did not run');
      }
      await refresh();
    } catch {
      setError(signedIn ? t('greeter.restoreFailed') : t('greeter.loginFailed'));
      setBusy(false);
      return;
    }
    // An existing account already knows the app, so go straight to the data.
    await setTutorialSeen();
    await setGreeterSeen();
    await leaveGreeter();
  }

  return (
    <ScreenFade>
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <View style={styles.hero}>
            <CoconutLogo size={72} />
            <Text variant="headlineMedium" style={styles.title}>
              {t('greeter.title')}
            </Text>
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.text.secondary }]}>
              {t('greeter.subtitle')}
            </Text>
          </View>

          <View style={styles.languageBlock}>
            <Text variant="titleMedium" style={styles.languageTitle}>
              {t('greeter.languageTitle')}
            </Text>
            <Text variant="bodySmall" style={styles.hint}>
              {t('greeter.languageDescription')}
            </Text>
            <SegmentedButtons
              value={settings.language}
              onValueChange={(value) => void setLanguage(value as Language)}
              buttons={LANGUAGES.map((language) => ({
                value: language.code,
                label: language.nativeLabel,
              }))}
            />
          </View>

          {mode === 'choice' ? (
            <View style={styles.actions}>
              <Text variant="bodyMedium" style={styles.intro}>
                {t('greeter.intro')}
              </Text>
              <Button
                mode="contained"
                icon="cloud-download-outline"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setMode('login');
                }}
                style={styles.button}
              >
                {t('greeter.existingAccount')}
              </Button>
              <Button
                mode="outlined"
                icon="sprout-outline"
                loading={busy}
                disabled={busy}
                onPress={() => void startFresh()}
                style={styles.button}
              >
                {t('greeter.startFresh')}
              </Button>
              <Text variant="bodySmall" style={styles.hint}>
                {t('greeter.freshHint')}
              </Text>
            </View>
          ) : (
            <View style={styles.actions}>
              <Text variant="titleMedium">{t('greeter.loginTitle')}</Text>
              <Text variant="bodyMedium" style={styles.intro}>
                {t('greeter.loginHint')}
              </Text>
              <PaperTextInput
                mode="outlined"
                label={t('sync.email')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!busy}
                style={styles.input}
              />
              <PaperTextInput
                mode="outlined"
                label={t('sync.password')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                style={styles.input}
              />
              {error ? <HelperText type="error">{error}</HelperText> : null}
              <Button
                mode="contained"
                icon="cloud-download-outline"
                loading={busy}
                disabled={!canLogin}
                onPress={() => void restoreAccount()}
                style={styles.button}
              >
                {busy ? t('greeter.restoring') : t('greeter.login')}
              </Button>
              <Button
                mode="text"
                disabled={busy}
                onPress={() => {
                  setError(null);
                  setMode('choice');
                }}
                style={styles.button}
              >
                {t('common.back')}
              </Button>
              <Text variant="bodySmall" style={styles.hint}>
                {t('greeter.freshHint')}
              </Text>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </ScreenFade>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
  },
  languageBlock: {
    gap: 6,
    marginBottom: 28,
  },
  languageTitle: {
    textAlign: 'center',
  },
  hint: {
    opacity: 0.6,
    textAlign: 'center',
  },
  actions: {
    gap: 4,
  },
  intro: {
    marginBottom: 8,
    textAlign: 'center',
    opacity: 0.75,
  },
  input: {
    marginTop: 8,
  },
  button: {
    marginTop: 12,
  },
});
