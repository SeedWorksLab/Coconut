import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { List, Portal, Switch, Text } from 'react-native-paper';
import { useAppData } from '../../data/DataProvider';
import { LANGUAGES, useI18n, type Language } from '../../i18n';
import { formatCents } from '../../utils/currency';
import { AmountInput } from '../../components/amount-input';
import { LoadingScreen } from '../../components/loading-screen';
import { useAppTheme } from '../../theme';
import { AppDialog } from '../../components/app-dialog';
import {
  getCheckForUpdatesOnStart,
  setCheckForUpdatesOnStart,
} from '../../database/updatePrefs';

const RECENT_COUNT_OPTIONS = [3, 5, 8, 10, 15, 20];

export default function SettingsScreen() {
  const {
    ready,
    settings,
    currentMonth,
    setMonthlyAllowance,
    setThemeMode,
    setRecentTransactionsCount,
    setLanguage,
  } = useAppData();
  const { t } = useI18n();
  const theme = useAppTheme();
  const router = useRouter();
  const [allowanceDialog, setAllowanceDialog] = useState(false);
  const [allowanceDraft, setAllowanceDraft] = useState<number | null>(null);
  const [allowanceError, setAllowanceError] = useState<string | null>(null);
  const [appearanceDialog, setAppearanceDialog] = useState(false);
  const [languageDialog, setLanguageDialog] = useState(false);
  const [recentCountDialog, setRecentCountDialog] = useState(false);
  const [checkUpdatesEnabled, setCheckUpdatesEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    getCheckForUpdatesOnStart().then((enabled) => {
      if (active) {
        setCheckUpdatesEnabled(enabled);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ready) {
    return <LoadingScreen />;
  }

  const symbol = settings.currencySymbol;
  const themeOptions = [
    { value: 'system' as const, label: t('settings.themeSystem') },
    { value: 'light' as const, label: t('settings.themeLight') },
    { value: 'dark' as const, label: t('settings.themeDark') },
  ];
  const languageLabel =
    LANGUAGES.find((language) => language.code === settings.language)?.nativeLabel ??
    LANGUAGES[0].nativeLabel;

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <List.Section>
        <List.Subheader>{t('settings.money')}</List.Subheader>
        <List.Item
          title={t('settings.allowance')}
          description={t('settings.perMonth', {
            amount: formatCents(settings.monthlyAllowanceCents, symbol),
          })}
          left={(props) => <List.Icon {...props} icon="bank-outline" />}
          onPress={() => {
            setAllowanceDraft(settings.monthlyAllowanceCents);
            setAllowanceError(null);
            setAllowanceDialog(true);
          }}
        />
        <List.Item
          title={t('settings.reserve')}
          description={t('settings.reserveDescriptionShort')}
          left={(props) => <List.Icon {...props} icon="piggy-bank-outline" />}
          onPress={() => router.push('/planning/reserve')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.planning')}</List.Subheader>
        <List.Item
          title={t('settings.thisMonthPlan')}
          description={t('settings.thisMonthPlanDescription')}
          left={(props) => <List.Icon {...props} icon="calendar-edit-outline" />}
          onPress={() => router.push('/planning/month')}
        />
        <List.Item
          title={t('settings.fixedExpenses')}
          description={t('settings.fixedExpensesDescription')}
          left={(props) => <List.Icon {...props} icon="calendar-check-outline" />}
          onPress={() => router.push('/planning/fixed-expenses')}
        />
        <List.Item
          title={t('settings.flexibleBudgets')}
          description={t('settings.flexibleBudgetsDescription')}
          left={(props) => <List.Icon {...props} icon="tag-multiple-outline" />}
          onPress={() => router.push('/planning/budgets')}
        />
        <List.Item
          title={t('settings.subscriptions')}
          description={t('settings.subscriptionsDescription')}
          left={(props) => <List.Icon {...props} icon="calendar-refresh-outline" />}
          onPress={() => router.push('/planning/subscriptions')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.data')}</List.Subheader>
        <List.Item
          title={t('settings.backup')}
          description={t('settings.backupDescriptionLong')}
          left={(props) => <List.Icon {...props} icon="database-export-outline" />}
          onPress={() => router.push('/planning/backup')}
        />
        <List.Item
          title={t('settings.cloudSync')}
          description={t('settings.cloudSyncDescription')}
          left={(props) => <List.Icon {...props} icon="cloud-sync-outline" />}
          onPress={() => router.push('/sync')}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.homeScreen')}</List.Subheader>
        <List.Item
          title={t('settings.recentTransactions')}
          description={t('settings.recentTransactionsLong', {
            count: settings.recentTransactionsCount,
          })}
          left={(props) => <List.Icon {...props} icon="history" />}
          onPress={() => setRecentCountDialog(true)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.appearance')}</List.Subheader>
        <List.Item
          title={t('settings.theme')}
          description={`${themeOptions.find((option) => option.value === settings.themeMode)?.label ?? t('settings.themeSystem')}${
            settings.themeMode === 'system' ? t('settings.themeFollowsDevice') : ''
          }`}
          left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
          onPress={() => setAppearanceDialog(true)}
        />
        <List.Item
          title={t('settings.language')}
          description={languageLabel}
          left={(props) => <List.Icon {...props} icon="translate" />}
          onPress={() => setLanguageDialog(true)}
        />
      </List.Section>

      <List.Section>
        <List.Subheader>{t('settings.about')}</List.Subheader>
        <List.Item
          title={t('settings.checkForUpdates')}
          description={t('settings.checkForUpdatesDescription')}
          left={(props) => <List.Icon {...props} icon="update" />}
          right={() => (
            <Switch
              value={checkUpdatesEnabled}
              onValueChange={(value) => {
                setCheckUpdatesEnabled(value);
                void setCheckForUpdatesOnStart(value);
              }}
            />
          )}
        />
        <List.Item
          title={t('settings.welcomeTour')}
          description={t('settings.welcomeTourDescription')}
          left={(props) => <List.Icon {...props} icon="compass-outline" />}
          onPress={() => router.push('/tutorial')}
        />
        <List.Item
          title={t('settings.whatsNew')}
          description={t('settings.whatsNewLongDescription')}
          left={(props) => <List.Icon {...props} icon="creation-outline" />}
          onPress={() => router.push('/whats-new')}
        />
        <List.Item
          title={t('settings.aboutCoconut')}
          description={t('settings.aboutCoconutDescription')}
          left={(props) => <List.Icon {...props} icon="information-outline" />}
          onPress={() => router.push('/about')}
        />
      </List.Section>

      <Portal>
        <AppDialog visible={recentCountDialog} onDismiss={() => setRecentCountDialog(false)}>
          <AppDialog.Title>{t('settings.recentTransactions')}</AppDialog.Title>
          <AppDialog.Content>
            {RECENT_COUNT_OPTIONS.map((count) => (
              <List.Item
                key={count}
                title={t('settings.lastCount', { count })}
                onPress={() => {
                  setRecentTransactionsCount(count);
                  setRecentCountDialog(false);
                }}
                right={() =>
                  settings.recentTransactionsCount === count ? (
                    <List.Icon icon="check" color={theme.brand.primary.base} />
                  ) : null
                }
              />
            ))}
          </AppDialog.Content>
          <AppDialog.Actions>
            <List.Item title={t('common.cancel')} onPress={() => setRecentCountDialog(false)} />
          </AppDialog.Actions>
        </AppDialog>

        <AppDialog visible={appearanceDialog} onDismiss={() => setAppearanceDialog(false)}>
          <AppDialog.Title>{t('settings.theme')}</AppDialog.Title>
          <AppDialog.Content>
            {themeOptions.map((option) => (
              <List.Item
                key={option.value}
                title={option.label}
                onPress={() => {
                  setThemeMode(option.value);
                  setAppearanceDialog(false);
                }}
                right={() =>
                  settings.themeMode === option.value ? (
                    <List.Icon icon="check" color={theme.brand.primary.base} />
                  ) : null
                }
              />
            ))}
          </AppDialog.Content>
          <AppDialog.Actions>
            <List.Item title={t('common.cancel')} onPress={() => setAppearanceDialog(false)} />
          </AppDialog.Actions>
        </AppDialog>

        <AppDialog visible={languageDialog} onDismiss={() => setLanguageDialog(false)}>
          <AppDialog.Title>{t('settings.language')}</AppDialog.Title>
          <AppDialog.Content>
            {LANGUAGES.map((language) => (
              <List.Item
                key={language.code}
                title={language.nativeLabel}
                description={language.label}
                onPress={() => {
                  void setLanguage(language.code as Language);
                  setLanguageDialog(false);
                }}
                right={() =>
                  settings.language === language.code ? (
                    <List.Icon icon="check" color={theme.brand.primary.base} />
                  ) : null
                }
              />
            ))}
          </AppDialog.Content>
          <AppDialog.Actions>
            <List.Item title={t('common.cancel')} onPress={() => setLanguageDialog(false)} />
          </AppDialog.Actions>
        </AppDialog>

        <AppDialog visible={allowanceDialog} onDismiss={() => setAllowanceDialog(false)}>
          <AppDialog.Title>{t('settings.allowance')}</AppDialog.Title>
          <AppDialog.Content>
            <AmountInput
              label={t('settings.allowance')}
              value={allowanceDraft}
              onChange={setAllowanceDraft}
              prefix={symbol}
              error={allowanceError}
            />
            <Text variant="bodySmall" style={styles.dialogHint}>
              {t('settings.allowanceDialogHint', {
                scope: currentMonth ? t('settings.allowanceDialogScopeCurrent') : '',
              })}
            </Text>
          </AppDialog.Content>
          <AppDialog.Actions>
            <List.Item
              title={t('common.cancel')}
              onPress={() => setAllowanceDialog(false)}
              style={styles.cancelButton}
            />
            <List.Item
              title={t('common.save')}
              onPress={() => {
                if (allowanceDraft === null) {
                  setAllowanceError(t('settings.enterValidAmount'));
                  return;
                }
                if (allowanceDraft < 0) {
                  setAllowanceError(t('settings.amountCannotBeNegative'));
                  return;
                }
                setMonthlyAllowance(allowanceDraft);
                setAllowanceDialog(false);
              }}
            />
          </AppDialog.Actions>
        </AppDialog>
      </Portal>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 32,
  },
  dialogHint: {
    marginTop: 8,
    opacity: 0.6,
  },
  cancelButton: {
    paddingLeft: 8,
  },
});
