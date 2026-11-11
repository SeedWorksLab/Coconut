import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { Button, Card, List, Portal, Text as PaperText } from 'react-native-paper';
import { useAppData } from '../../data/DataProvider';
import { LoadingScreen } from '../../components/loading-screen';
import { shareBackup, pickBackupFile, restoreFromBackup } from '../../utils/backup';
import { AppDialog } from '../../components/app-dialog';
import { ScreenToast } from '../../components/screen-toast';
import { useI18n } from '../../i18n';

export default function BackupScreen() {
  const { ready, refresh } = useAppData();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [confirmUri, setConfirmUri] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!ready) {
    return <LoadingScreen />;
  }

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Card mode="elevated" style={styles.card}>
        <Card.Title title={t('backup.exportTitle')} />
        <Card.Content>
          <PaperText variant="bodyMedium" style={styles.text}>
            {t('backup.exportDescription')}
          </PaperText>
          <Button
            mode="contained"
            onPress={async () => {
              setBusy(true);
              try {
                if (await shareBackup()) {
                  setToast(t('backup.exported'));
                } else {
                  setToast(t('backup.sharingUnavailable'));
                }
              } catch {
                setToast(t('backup.createError'));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            loading={busy}
            style={styles.button}
            icon="share-variant-outline"
          >
            {t('backup.export')}
          </Button>
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card}>
        <Card.Title title={t('backup.restoreTitle')} />
        <Card.Content>
          <PaperText variant="bodyMedium" style={styles.text}>
            {t('backup.restoreDescription')}
          </PaperText>
          <Button
            mode="outlined"
            onPress={async () => {
              setBusy(true);
              try {
                const file = await pickBackupFile();
                if (file) {
                  setConfirmUri(file.uri);
                }
              } catch {
                setToast(t('backup.pickerError'));
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            style={styles.button}
            icon="folder-open-outline"
          >
            {t('backup.choose')}
          </Button>
        </Card.Content>
      </Card>

      <Portal>
        <AppDialog visible={confirmUri !== null} onDismiss={() => setConfirmUri(null)}>
          <AppDialog.Title>{t('backup.replaceTitle')}</AppDialog.Title>
          <AppDialog.Content>
            <PaperText variant="bodyMedium">
              {t('backup.replaceBody')}
            </PaperText>
          </AppDialog.Content>
          <AppDialog.Actions>
            <Button onPress={() => setConfirmUri(null)}>{t('common.cancel')}</Button>
            <Button
              loading={busy}
              disabled={busy}
              onPress={async () => {
                if (confirmUri === null) {
                  return;
                }
                setBusy(true);
                try {
                  await restoreFromBackup(confirmUri);
                  await refresh();
                  setToast(t('backup.restored'));
                } catch {
                  setToast(t('backup.restoreError'));
                } finally {
                  setBusy(false);
                  setConfirmUri(null);
                }
              }}
            >
              {t('backup.restore')}
            </Button>
          </AppDialog.Actions>
        </AppDialog>
      </Portal>

      <List.Item
        title=""
        description={t('backup.tip')}
        style={styles.tip}
      />

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
  text: {
    marginBottom: 12,
  },
  button: {
    marginTop: 4,
  },
  tip: {
    marginTop: 8,
  },
});