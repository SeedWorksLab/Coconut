import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { Button, Card, List, Portal, Text } from 'react-native-paper';
import { useAppData } from '../../data/DataProvider';
import { formatCents } from '../../utils/currency';
import { monthLabel } from '../../utils/date';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';
import { StatCard } from '../../components/stat-card';
import { AmountInput } from '../../components/amount-input';
import { AppDialog } from '../../components/app-dialog';
import { LoadingScreen } from '../../components/loading-screen';
import { ScreenToast } from '../../components/screen-toast';

export default function ReserveScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useI18n();
  const {
    ready,
    settings,
    currentDashboard,
    reserveHistory,
    setInitialReserve,
  } = useAppData();

  const [initialDialog, setInitialDialog] = useState(false);
  const [initialDraft, setInitialDraft] = useState<number | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  if (!ready) {
    return <LoadingScreen />;
  }

  const symbol = settings.currencySymbol;
  // Before a month is started there is nothing to project, but the history and
  // the setting behind it are still real and still worth reaching.
  const projection = currentDashboard?.reserveProjection ?? null;

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      {projection ? (
        <>
          <View style={styles.statRow}>
            <StatCard
              label={t('reserve.startingReserve')}
              value={projection.startingReserveCents}
              format={(v) => formatCents(v, symbol)}
            />
            <StatCard
              label={t('reserve.endingReserve')}
              value={projection.endingReserveCents}
              format={(v) => formatCents(v, symbol)}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              label={t('reserve.monthSurplus')}
              value={projection.adjustmentCents}
              format={(v) => (v >= 0 ? '+' : '') + formatCents(v, symbol)}
              sub={
                projection.overspent ? t('reserve.overspent') : t('reserve.unusedStays')
              }
              tone={projection.overspent ? 'bad' : 'good'}
            />
          </View>
        </>
      ) : (
        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium">
              {t('reserve.noMonth')}
            </Text>
            <Button mode="contained" style={styles.button} onPress={() => router.replace('/')}>
              {t('reserve.startMonth')}
            </Button>
          </Card.Content>
        </Card>
      )}
        <Card mode="elevated" style={styles.card}>
          <Card.Title
            title={t('reserve.historyTitle')}
            subtitle={t('reserve.historySubtitle')}
          />
          <Card.Content>
            {reserveHistory.length === 0 ? (
              <Text variant="bodyMedium" style={styles.empty}>
                {t('reserve.nothingRecorded')}
              </Text>
            ) : (
              reserveHistory.map((entry) => (
                <List.Item
                  key={entry.id}
                  title={monthLabel(entry.monthKey)}
                  description={
                    entry.direction === 'to-reserve' ? t('reserve.added') : t('reserve.drawn')
                  }
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={entry.direction === 'to-reserve' ? 'arrow-down' : 'arrow-up'}
                    />
                  )}
                  right={() => (
                    <Text
                      variant="bodyLarge"
                      style={{
                        color:
                          entry.direction === 'to-reserve'
                            ? theme.semantic.goodBudget
                            : theme.semantic.overBudget,
                      }}
                    >
                      {`${entry.direction === 'to-reserve' ? '+' : '-'}${formatCents(entry.amountCents, symbol)}`}
                    </Text>
                  )}
                />
              ))
            )}
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title title={t('reserve.settings')} />
        <Card.Content>
          <List.Item
            title={t('reserve.initial')}
            description={t('reserve.initialDescription')}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              setInitialDraft(settings.initialReserveCents);
              setInitialError(null);
              setInitialDialog(true);
            }}
          />
        </Card.Content>
      </Card>

      <Portal>
        <AppDialog visible={initialDialog} onDismiss={() => setInitialDialog(false)}>
          <AppDialog.Title>{t('reserve.initial')}</AppDialog.Title>
          <AppDialog.Content>
            <AmountInput
              label={t('reserve.initial')}
              value={initialDraft}
              onChange={setInitialDraft}
              prefix={symbol}
              error={initialError}
            />
          </AppDialog.Content>
          <AppDialog.Actions>
            <Button onPress={() => setInitialDialog(false)}>{t('common.cancel')}</Button>
            <Button
              onPress={async () => {
                if (initialDraft === null) {
                  setInitialError(t('form.enterValidAmount'));
                  return;
                }
                if (initialDraft < 0) {
                  setInitialError(t('settings.amountCannotBeNegative'));
                  return;
                }
                setInitialError(null);
                await setInitialReserve(initialDraft);
                setInitialDialog(false);
                setToast(t('reserve.updated'));
              }}
            >
              {t('common.save')}
            </Button>
          </AppDialog.Actions>
        </AppDialog>
      </Portal>

      <ScreenToast visible={toast !== null} message={toast} onDismiss={() => setToast(null)} duration={2000} />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  statRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
  },
  empty: {
    opacity: 0.6,
    paddingVertical: 8,
  },
  button: {
    marginTop: 12,
  },
});