import React, { useCallback, useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from '../components/keyboard-aware-scroll-view';
import {
  Button,
  Card,
  HelperText,
  List,
  Switch,
  Text as PaperText,
  TextInput as PaperTextInput,
} from 'react-native-paper';
import dayjs from 'dayjs';
import type { User } from '@supabase/supabase-js';
import type { SyncStatus } from '../models';
import { useAppData } from '../data/DataProvider';
import { LoadingScreen } from '../components/loading-screen';
import { ScreenToast } from '../components/screen-toast';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import {
  resolveCloudConfig,
  SEEDWORKS_ACCOUNT_URL,
  SEEDWORKS_CLOUD,
} from '../config/cloud';
import { formatMaskedKey, isValidApiKey, normalizeSupabaseUrl } from '../services/sync-service';
import {
  getSupabaseSessionUser,
  resetClient,
  signInToSupabase,
  signOutOfSupabase,
  signUpToSupabase,
} from '../sync/supabase';
import { syncNow } from '../sync/engine';
import { setMemberDisplayNameForUser } from '../database/sharedSpaces';

function statusLabel(
  lastSyncStatus: SyncStatus | null,
  t: ReturnType<typeof useI18n>['t']
): string {
  switch (lastSyncStatus) {
    case 'syncing':
      return t('sync.statusSyncing');
    case 'success':
      return t('sync.statusSuccess');
    case 'error':
      return t('sync.statusError');
    default:
      return t('sync.statusNotYet');
  }
}

export default function SyncScreen() {
  const {
    ready,
    syncState,
    saveSyncConfig,
    resetSyncConfig,
    setSyncEnabled,
    refresh,
    settings,
    setUsername,
  } = useAppData();
  const theme = useAppTheme();
  const { t } = useI18n();
  const [urlDraft, setUrlDraft] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState<string | null>(null);
  const [customProject, setCustomProject] = useState(false);
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [passwordDraft, setPasswordDraft] = useState('');
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadSessionUser = useCallback(() => {
    getSupabaseSessionUser().then(setSessionUser).catch(() => setSessionUser(null));
  }, []);

  useEffect(() => {
    loadSessionUser();
  }, [loadSessionUser]);

  if (!ready) {
    return <LoadingScreen />;
  }

  const cloud = resolveCloudConfig(syncState);
  const showCustomProject = customProject || cloud.isCustom;
  const usingCustomProject = cloud.isCustom;
  const customConfigPending = showCustomProject && !usingCustomProject;
  const urlValue = urlDraft ?? syncState.supabaseUrl ?? '';
  const keyValue = keyDraft ?? syncState.apiKey ?? '';
  const urlInvalid = urlValue.trim() !== '' && normalizeSupabaseUrl(urlValue) === null;
  const keyInvalid = keyValue.trim() !== '' && !isValidApiKey(keyValue);
  const canSave =
    urlValue.trim() !== '' && keyValue.trim() !== '' && !urlInvalid && !keyInvalid;
  const canEnable = cloud.supabaseUrl !== '' && cloud.apiKey !== '';
  const canAuth =
    canEnable &&
    !customConfigPending &&
    emailDraft.trim() !== '' &&
    passwordDraft.length >= 6;
  const signedIn = sessionUser !== null;

  async function saveConfig(): Promise<void> {
    setBusy(true);
    try {
      if (await saveSyncConfig(urlValue, keyValue)) {
        resetClient();
        setCustomProject(true);
        setToast(t('sync.customSaved'));
      } else {
        setToast(t('sync.checkUrlKey'));
      }
    } catch {
      setToast(t('sync.configSaveError'));
    } finally {
      setBusy(false);
    }
  }

  async function useSeedworksCloud(): Promise<void> {
    setBusy(true);
    try {
      await resetSyncConfig();
      resetClient();
      setUrlDraft(null);
      setKeyDraft(null);
      setCustomProject(false);
      setToast(t('sync.usingSeedworks'));
    } catch {
      setToast(t('sync.switchError'));
    } finally {
      setBusy(false);
    }
  }

  function openAccountPage(): void {
    Linking.openURL(SEEDWORKS_ACCOUNT_URL).catch(() => {
      setToast(t('sync.accountPageError'));
    });
  }

  async function runSyncNow(): Promise<void> {
    setSyncing(true);
    try {
      const outcome = await syncNow();
      await refresh();
      if (outcome) {
        setToast(t('sync.syncComplete'));
      } else {
        setToast(t('sync.enableAndSignIn'));
      }
    } catch {
      setToast(t('sync.syncFailed'));
    } finally {
      setSyncing(false);
    }
  }

  async function runSignIn(): Promise<void> {
    setBusy(true);
    try {
      await signInToSupabase(emailDraft.trim(), passwordDraft);
      setPasswordDraft('');
      setSessionUser(await getSupabaseSessionUser());
      setToast(t('sync.signedIn'));
    } catch {
      setToast(t('sync.signInFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function runSignUp(): Promise<void> {
    setBusy(true);
    try {
      await signUpToSupabase(emailDraft.trim(), passwordDraft);
      setPasswordDraft('');
      setSessionUser(await getSupabaseSessionUser());
      setToast(t('sync.accountCreated'));
    } catch {
      setToast(t('sync.signUpFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function runSignOut(): Promise<void> {
    setBusy(true);
    try {
      await signOutOfSupabase();
      setSessionUser(null);
      setToast(t('sync.signedOut'));
    } catch {
      setToast(t('sync.signOutFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function saveUsername(): Promise<void> {
    const trimmed = (usernameDraft ?? '').trim();
    const normalized = trimmed === '' ? null : trimmed;
    setBusy(true);
    try {
      if (sessionUser) {
        await setMemberDisplayNameForUser(sessionUser.id, normalized);
      }
      await setUsername(normalized);
      setUsernameDraft(null);
      setToast(t('sync.usernameSaved'));
    } catch {
      setToast(t('sync.usernameSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Card mode="elevated" style={styles.card}>
        <Card.Title
          title={t('sync.cloudTitle')}
          subtitle={t('sync.cloudSubtitle')}
          style={styles.cardTitle}
        />
        <Card.Content style={styles.cardContent}>
          <PaperText variant="bodyMedium" style={styles.text}>
            {usingCustomProject ? t('sync.introCustom') : t('sync.introSeedworks')}
          </PaperText>
          <PaperText variant="bodySmall" style={styles.hint}>
            {t('sync.disabledHint')}
          </PaperText>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title
          title={t('sync.status')}
          style={styles.cardTitle}
          right={(props) => (
            <List.Icon
              {...props}
              icon={syncState.enabled ? 'cloud-check-outline' : 'cloud-off-outline'}
            />
          )}
        />
        <Card.Content style={styles.cardContent}>
          <List.Item
            title={syncState.enabled ? t('sync.enabled') : t('sync.disabled')}
            description={t('sync.offUntilOn')}
            right={() => (
              <View style={styles.statusPill}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: syncState.enabled ? theme.semantic.success : theme.semantic.warning },
                  ]}
                />
              </View>
            )}
          />
          <List.Item
            title={
              signedIn
                ? t('sync.signedInAs', { email: sessionUser.email ?? t('sync.unknown') })
                : t('sync.notSignedIn')
            }
            description={
              signedIn ? t('sync.syncsUnderAccount') : t('sync.signInToSync')
            }
          />
          <List.Item
            title={statusLabel(syncState.lastSyncStatus, t)}
            description={
              syncState.lastSyncAt
                ? dayjs(syncState.lastSyncAt).format('D MMM YYYY, HH:mm')
                : t('sync.noSyncYet')
            }
          />
          {syncState.lastSyncError ? (
            <List.Item
              title={t('sync.lastError')}
              description={syncState.lastSyncError}
              descriptionNumberOfLines={6}
              left={(props) => <List.Icon {...props} icon="alert-circle-outline" />}
            />
          ) : null}
          <Button
            mode="contained"
            icon="sync"
            onPress={runSyncNow}
            disabled={syncing || !syncState.enabled || !signedIn}
            loading={syncing}
            style={styles.button}
          >
            {t('sync.syncNow')}
          </Button>
          <HelperText type="info">{t('sync.syncNowHint')}</HelperText>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title title={t('sync.provider')} style={styles.cardTitle} />
        <Card.Content style={styles.cardContent}>
          {!showCustomProject ? (
            <>
              <List.Item
                title={t('sync.seedworksCloud')}
                description={SEEDWORKS_CLOUD.supabaseUrl.replace(/^https?:\/\//, '')}
                left={(props) => <List.Icon {...props} icon="cloud-lock-outline" />}
              />
              <PaperText variant="bodySmall" style={styles.hint}>
                {t('sync.seedworksHint')}
              </PaperText>
              <Button
                mode="outlined"
                icon="server-outline"
                onPress={() => setCustomProject(true)}
                disabled={busy}
                style={styles.button}
              >
                {t('sync.useOwn')}
              </Button>
            </>
          ) : (
            <>
              <PaperText variant="bodySmall" style={styles.hint}>
                {t('sync.selfHostHint')}
              </PaperText>
              <PaperTextInput
                mode="outlined"
                label={t('sync.supabaseUrl')}
                value={urlValue}
                onChangeText={setUrlDraft}
                placeholder="https://xxxx.supabase.co"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                error={urlInvalid}
                style={styles.input}
              />
              {urlInvalid ? (
                <HelperText type="error">{t('sync.urlError')}</HelperText>
              ) : null}
              <PaperTextInput
                mode="outlined"
                label={t('sync.apiKey')}
                value={keyValue}
                onChangeText={setKeyDraft}
                placeholder="sb_publishable_…"
                autoCapitalize="none"
                autoCorrect={false}
                error={keyInvalid}
                style={styles.input}
              />
              {keyInvalid ? (
                <HelperText type="error">
                  {t('sync.keyError')}
                </HelperText>
              ) : null}
              {syncState.apiKey && syncState.apiKey !== keyValue ? (
                <PaperText variant="bodySmall" style={styles.hint}>
                  {t('sync.savedKey', { key: formatMaskedKey(syncState.apiKey) })}
                </PaperText>
              ) : null}
              <Button
                mode="contained"
                icon="content-save-outline"
                onPress={saveConfig}
                disabled={busy || !canSave}
                loading={busy}
                style={styles.button}
              >
                {t('sync.saveCustom')}
              </Button>
              <Button
                mode="text"
                icon="cloud-lock-outline"
                onPress={useSeedworksCloud}
                disabled={busy}
                style={styles.button}
              >
                {t('sync.useSeedworksInstead')}
              </Button>
              <PaperText variant="bodySmall" style={styles.hint}>
                {t('sync.keyHint')}
              </PaperText>
            </>
          )}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title title={t('sync.account')} style={styles.cardTitle} />
        <Card.Content style={styles.cardContent}>
          {signedIn ? (
            <>
              <List.Item
                title={sessionUser.email ?? t('sync.signedInFallback')}
                description={
                  usingCustomProject
                    ? t('sync.customAccountDescription')
                    : t('sync.seedworksAccountDescription')
                }
                left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
              />
              <Button
                mode="outlined"
                icon="logout"
                onPress={runSignOut}
                disabled={busy}
                loading={busy}
                style={styles.button}
              >
                {t('sync.signOut')}
              </Button>
            </>
          ) : (
            <>
              <PaperTextInput
                mode="outlined"
                label={t('sync.email')}
                value={emailDraft}
                onChangeText={setEmailDraft}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
              <PaperTextInput
                mode="outlined"
                label={t('sync.password')}
                value={passwordDraft}
                onChangeText={setPasswordDraft}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <View style={styles.row}>
                <Button
                  mode="contained"
                  icon="login"
                  onPress={runSignIn}
                  disabled={busy || !canAuth}
                  loading={busy}
                  style={styles.flexButton}
                >
                  {t('sync.signIn')}
                </Button>
                <Button
                  mode="outlined"
                  icon="account-plus-outline"
                  onPress={runSignUp}
                  disabled={busy || !canAuth}
                  style={styles.flexButton}
                >
                  {t('sync.createAccount')}
                </Button>
              </View>
              <PaperText variant="bodySmall" style={styles.hint}>
                {usingCustomProject
                  ? t('sync.customAuthHint')
                  : t('sync.seedworksAuthHint')}
              </PaperText>
              {customConfigPending ? (
                <HelperText type="info">{t('sync.saveCustomFirst')}</HelperText>
              ) : null}
            </>
          )}
          {!usingCustomProject ? (
            <Button
              mode="text"
              icon="open-in-new"
              onPress={openAccountPage}
              disabled={busy}
              style={styles.button}
            >
              {t('sync.manageAccount')}
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      {signedIn ? (
        <Card mode="elevated" style={styles.card}>
          <Card.Title title={t('sync.usernameTitle')} style={styles.cardTitle} />
          <Card.Content style={styles.cardContent}>
            <PaperTextInput
              mode="outlined"
              label={t('sync.username')}
              value={usernameDraft ?? settings.username ?? ''}
              onChangeText={setUsernameDraft}
              placeholder={sessionUser.email ?? ''}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Button
              mode="contained"
              icon="account-edit-outline"
              onPress={saveUsername}
              disabled={busy}
              loading={busy}
              style={styles.button}
            >
              {t('sync.saveUsername')}
            </Button>
            <PaperText variant="bodySmall" style={styles.hint}>
              {t('sync.usernameHint')}
            </PaperText>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="elevated" style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <List.Item
            title={t('sync.enableTitle')}
            description={
              usingCustomProject
                ? t('sync.enableDescriptionCustom')
                : t('sync.enableDescriptionSeedworks')
            }
            right={() => (
              <Switch
                value={syncState.enabled}
                disabled={!canEnable}
                onValueChange={(enabled) => {
                  setSyncEnabled(enabled).catch(() => setToast(t('sync.updateError')));
                }}
              />
            )}
          />
        </Card.Content>
      </Card>

      <PaperText variant="bodySmall" style={styles.footnote}>
        {usingCustomProject ? t('sync.customFootnote') : t('sync.seedworksFootnote')}
      </PaperText>

      <ScreenToast visible={toast !== null} message={toast} onDismiss={() => setToast(null)} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    paddingLeft: 24,
    paddingRight: 24,
  },
  cardContent: {
    paddingHorizontal: 24,
  },
  text: {
    marginBottom: 8,
  },
  hint: {
    opacity: 0.6,
    marginTop: 4,
  },
  input: {
    marginBottom: 4,
  },
  button: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  flexButton: {
    flex: 1,
  },
  statusPill: {
    justifyContent: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  footnote: {
    opacity: 0.6,
    marginTop: 8,
  },
});