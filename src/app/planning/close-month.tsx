import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import dayjs, { type Dayjs } from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Appbar, Button, Card, List, Portal, Text, TextInput } from 'react-native-paper';
import { useAppData, type MonthDashboard } from '../../data/DataProvider';
import type { TransactionRating } from '../../models';
import { monthLabel } from '../../utils/date';
import { formatCents, formatSignedCents } from '../../utils/currency';
import { fixedExpenseAmount } from '../../services/forecast-service';
import { reserveDrawBehindPlan } from '../../services/allowance-service';
import { isWithinClosingWindow, monthClosingWindow } from '../../services/month-closing-service';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { LoadingScreen } from '../../components/loading-screen';
import { RatingLegend, RatingSelector } from '../../components/rating-selector';
import { ScreenToast } from '../../components/screen-toast';
import { StatCard, type Tone } from '../../components/stat-card';
import { AppDialog } from '../../components/app-dialog';
import { AnimatedNumber } from '../../components/animated-number';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';

export default function CloseMonthScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useI18n();
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();
  const {
    ready,
    settings,
    allMonths,
    dashboardFor,
    setTransactionRating,
    closeCurrentMonth,
  } = useAppData();

  const [dashboard, setDashboard] = useState<MonthDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [verdict, setVerdict] = useState('');

  const month = allMonths.find((entry) => entry.monthKey === monthKey) ?? null;
  const symbol = settings.currencySymbol;

  useEffect(() => {
    if (!ready) {
      return;
    }
    let active = true;
    void dashboardFor(monthKey).then((result) => {
      if (active) {
        setDashboard(result);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [ready, dashboardFor, monthKey]);

  if (!ready || loading) {
    return <LoadingScreen />;
  }

  if (!month) {
    return (
      <View style={styles.container}>
        <CloseMonthHeader title={t('screen.closeMonth')} onBack={() => router.back()} />
        <Text variant="bodyMedium" style={styles.empty}>
          {t('close.notAvailable')}
        </Text>
      </View>
    );
  }

  const transactions = dashboard?.transactions ?? [];
  const fixedTotalCents = dashboard
    ? dashboard.fixedExpenseStatuses.reduce(
        (total, entry) => total + fixedExpenseAmount(entry.instance),
        0
      )
    : 0;
  const subscriptionTotalCents = dashboard
    ? dashboard.subscriptions.reduce((total, entry) => total + entry.amountCents, 0)
    : 0;
  const budgetRows = (dashboard?.budgetStatuses ?? [])
    .filter((entry) => entry.status.spentCents !== 0)
    .map((entry) => ({
      id: entry.budget.id,
      name: entry.budget.name,
      spentCents: entry.status.spentCents,
      plannedCents: entry.status.plannedCents,
    }));
  const alreadyClosed = month.isClosed;
  const closingWindow = monthClosingWindow(month.monthKey);
  const withinClosingWindow = isWithinClosingWindow(month.monthKey, dayjs());

  const forecast = dashboard?.forecast;
  const reserveProjection = dashboard?.reserveProjection;
  const wantedToSpendCents = forecast?.plannedSpendingCents ?? 0;
  const actuallySpentCents = forecast?.actualSpendingCents ?? 0;
  const againstPlanCents = forecast?.remainingVsPlanCents ?? 0;
  const againstPlanTone: Tone = againstPlanCents < 0 ? 'bad' : 'good';
  const plannedReserveMoveCents = forecast?.allowanceVsPlanCents ?? 0;
  const actualReserveMoveCents = forecast?.remainingAllowanceCents ?? 0;
  const behindPlan = reserveDrawBehindPlan(plannedReserveMoveCents, actualReserveMoveCents);

  const rate = (id: number, rating: TransactionRating) => {
    setDashboard((current) =>
      current
        ? {
            ...current,
            transactions: current.transactions.map((entry) =>
              entry.id === id ? { ...entry, rating } : entry
            ),
          }
        : current
    );
    void setTransactionRating(id, rating);
  };

  return (
    <View style={styles.container}>
      <CloseMonthHeader
        title={t('close.headerTitle', { month: monthLabel(month.monthKey) })}
        onBack={() => router.back()}
      />

      <KeyboardAwareScrollView contentContainerStyle={styles.content}>
        <View style={styles.statRow}>
          <StatCard
            label={t('close.wantedToSpend')}
            value={wantedToSpendCents}
            format={(value) => formatCents(value, symbol)}
          />
          <StatCard
            label={t('close.actuallySpent')}
            value={actuallySpentCents}
            format={(value) => formatCents(value, symbol)}
          />
        </View>
        <View style={styles.statRow}>
          <StatCard
            label={t('close.wantedVsSpent')}
            value={againstPlanCents}
            format={(value) => formatCents(value, symbol)}
            tone={againstPlanTone}
            sub={againstPlanCents < 0 ? t('close.spentOverPlan') : t('close.leftUnspent')}
          />
          <StatCard
            label={t('close.transactions')}
            value={transactions.length}
            format={(value) => String(value)}
          />
        </View>

        <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.reserveTitle}>
              {t('overview.savingsReserve')}
            </Text>
            <View style={styles.reserveRow}>
              <Text variant="bodyMedium">{t('overview.startingReserve')}</Text>
              <Text variant="bodyMedium">
                {formatCents(reserveProjection?.startingReserveCents ?? 0, symbol)}
              </Text>
            </View>
            <View style={styles.reserveRow}>
              <Text variant="bodyMedium">{t('close.wantedToAdd')}</Text>
              <Text variant="bodyMedium">
                {formatSignedCents(plannedReserveMoveCents, symbol)}
              </Text>
            </View>
            <View style={styles.reserveRow}>
              <Text variant="bodyMedium">{t('close.actuallyAdded')}</Text>
              <Text
                variant="bodyMedium"
                style={{
                  color: behindPlan
                    ? theme.semantic.overBudget
                    : theme.semantic.goodBudget,
                }}
              >
                {formatSignedCents(actualReserveMoveCents, symbol)}
              </Text>
            </View>
            <View style={styles.reserveRow}>
              <Text variant="bodyMedium">
                {alreadyClosed ? t('close.endOfMonth') : t('close.willBeAtEnd')}
              </Text>
              <AnimatedNumber
                value={reserveProjection?.endingReserveCents ?? 0}
                format={(value) => formatCents(value, symbol)}
                style={{ color: theme.colors.onSurface }}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.statRow}>
          <StatCard
            label={t('settings.fixedExpenses')}
            value={fixedTotalCents}
            format={(value) => formatCents(value, symbol)}
          />
          <StatCard
            label={t('settings.subscriptions')}
            value={subscriptionTotalCents}
            format={(value) => formatCents(value, symbol)}
          />
        </View>

        <Card mode="elevated" style={styles.card}>
          <Card.Title title={t('close.perBudget')} />
          <Card.Content>
            {budgetRows.length === 0 ? (
              <Text variant="bodyMedium" style={styles.empty}>
                {t('close.noBudgetSpending')}
              </Text>
            ) : (
              budgetRows.map((row) => (
                <List.Item
                  key={row.id}
                  title={row.name}
                  description={t('close.plannedAmount', {
                    amount: formatCents(row.plannedCents, symbol),
                  })}
                  right={() => (
                    <Text variant="bodyLarge">{formatCents(row.spentCents, symbol)}</Text>
                  )}
                />
              ))
            )}
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title
            title={t('close.verdictTitle')}
            subtitle={t('close.verdictSubtitle')}
          />
          <Card.Content>
            <TextInput
              mode="outlined"
              label={t('close.verdictLabel')}
              value={verdict}
              onChangeText={setVerdict}
              multiline
              numberOfLines={4}
              placeholder={t('close.verdictPlaceholder')}
              style={styles.verdictInput}
            />
          </Card.Content>
        </Card>

        <Card mode="elevated" style={styles.card}>
          <Card.Title
            title={t('close.usefulSpending')}
            subtitle={t('close.usefulSpendingSubtitle')}
          />
          <Card.Content>
            <RatingLegend />
            <Text variant="bodySmall" style={{ color: theme.text.secondary }}>
              {t('close.ignoreDescription')}
            </Text>
            {transactions.length === 0 ? (
              <Text variant="bodyMedium" style={styles.empty}>
                {t('close.noTransactions')}
              </Text>
            ) : (
              transactions.map((transaction) => {
                const shared = transaction.originType === 'shared';
                const budgetName =
                  dashboard?.budgetNames.get(transaction.budgetId ?? -1) ?? null;
                return (
                  <View
                    key={transaction.id}
                    style={[styles.transactionRow, { borderRadius: theme.radii.medium }]}
                  >
                    <View style={styles.transactionText}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {transaction.merchant}
                      </Text>
                      <Text variant="labelSmall" style={{ color: theme.text.secondary }}>
                        {[budgetName, shared ? t('close.shared') : null].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                    <Text variant="bodyMedium">
                      {formatCents(transaction.amountCents, symbol)}
                    </Text>
                    <RatingSelector
                      value={transaction.rating}
                      disabled={alreadyClosed}
                      onChange={(rating) => rate(transaction.id, rating)}
                    />
                  </View>
                );
              })
            )}
          </Card.Content>
        </Card>

        {alreadyClosed || withinClosingWindow ? (
          <Button
            mode="contained"
            style={styles.closeButton}
            disabled={alreadyClosed || closing}
            loading={closing}
            onPress={() => setConfirm(true)}
          >
            {alreadyClosed
              ? t('close.isClosed', { month: monthLabel(month.monthKey) })
              : t('close.closeMonth')}
          </Button>
        ) : (
          <Card mode="contained" style={styles.card}>
            <Card.Content>
              <Text variant="bodyMedium">
                {t('close.window', {
                  month: monthLabel(month.monthKey),
                  start: closingWindowLabel(closingWindow.start),
                  end: closingWindowLabel(closingWindow.end),
                })}
              </Text>
            </Card.Content>
          </Card>
        )}
      </KeyboardAwareScrollView>

      <Portal>
        <AppDialog visible={confirm} onDismiss={() => setConfirm(false)}>
          <AppDialog.Title>{t('close.confirmTitle', { month: monthLabel(month.monthKey) })}</AppDialog.Title>
          <AppDialog.Content>
            <Text variant="bodyMedium">
              {t('close.confirmBody', { month: monthLabel(month.monthKey) })}
            </Text>
          </AppDialog.Content>
          <AppDialog.Actions>
            <Button onPress={() => setConfirm(false)}>{t('common.cancel')}</Button>
            <Button
              loading={closing}
              onPress={async () => {
                setClosing(true);
                try {
                  const closed = await closeCurrentMonth(
                    month.monthKey,
                    verdict.trim() === '' ? null : verdict.trim()
                  );
                  setConfirm(false);
                  if (closed) {
                    setToast(t('close.closedToast', { month: monthLabel(month.monthKey) }));
                    router.replace({
                      pathname: '/monthly-report/[monthKey]',
                      params: { monthKey: month.monthKey },
                    });
                  } else {
                    setToast(t('close.alreadyClosedToast', { month: monthLabel(month.monthKey) }));
                  }
                } finally {
                  setClosing(false);
                }
              }}
            >
              {t('close.closeMonth')}
            </Button>
          </AppDialog.Actions>
        </AppDialog>
      </Portal>

      <ScreenToast
        visible={toast !== null}
        message={toast}
        onDismiss={() => setToast(null)}
        duration={2000}
      />
    </View>
  );
}

function closingWindowLabel(moment: Dayjs): string {
  return moment.format('D MMM YYYY, HH:mm');
}

function CloseMonthHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <Appbar.Header>
      <Appbar.BackAction onPress={onBack} />
      <Appbar.Content title={title} />
    </Appbar.Header>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
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
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reserveTitle: {
    marginBottom: 8,
  },
  reserveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  empty: {
    opacity: 0.6,
    paddingVertical: 8,
  },
  verdictInput: {
    marginTop: 4,
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  transactionText: {
    flex: 1,
  },
  closeButton: {
    marginTop: 8,
  },
});
