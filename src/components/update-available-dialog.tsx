import React from 'react';
import { Button, Text } from 'react-native-paper';
import { useI18n } from '../i18n';
import { AppDialog } from './app-dialog';

interface UpdateAvailableDialogProps {
  visible: boolean;
  version: string;
  onOpen: () => void;
  onClose: () => void;
  onIgnore: () => void;
}

export function UpdateAvailableDialog({
  visible,
  version,
  onOpen,
  onClose,
  onIgnore,
}: UpdateAvailableDialogProps) {
  const { t } = useI18n();
  return (
    <AppDialog visible={visible} onDismiss={onClose}>
      <AppDialog.Title>{t('update.title')}</AppDialog.Title>
      <AppDialog.Content>
        <Text variant="bodyMedium">
          {t('update.body', { version })}
        </Text>
      </AppDialog.Content>
      <AppDialog.Actions>
        <Button onPress={onIgnore}>{t('update.ignore')}</Button>
        <Button onPress={onClose}>{t('update.close')}</Button>
        <Button mode="contained" onPress={onOpen}>
          {t('update.open')}
        </Button>
      </AppDialog.Actions>
    </AppDialog>
  );
}