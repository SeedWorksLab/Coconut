import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { Card, List, Text } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';

import { useAppData } from '../../data/DataProvider';
import { getMonthlyReport } from '../../database/monthlyReports';
import type { MonthlyReport } from '../../services/monthly-report-service';
import { formatCents, formatSignedCents } from '../../utils/currency';
import { monthLabel } from '../../utils/date';
import { LoadingScreen } from '../../components/loading-screen';
import { useI18n } from '../../i18n';
import { useAppTheme } from '../../theme';

function ReportRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad';
}) {
  const theme = useAppTheme();
  const color =
    tone === 'good'
      ? theme.semantic.goodBudget
      : tone === 'bad'
        ? theme.semantic.overBudget
        : theme.colors.onSurface;
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
        {label}
      </Text>
      <Text variant="bodyMedium" style={{ color }}>
        {value}
      </Text>
    </View>
  );
}

export default function MonthlyReportScreen() {
  const { monthKey } = useLocalSearchParams<{ monthKey: string }>();
  const { ready, settings } = useAppData();
  const theme = useAppTheme();
  const { t } = useI18n();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!ready || !monthKey) {
      return;
    }
    let active = true;
    void getMonthlyReport(monthKey).then((result) => {
      if (active) {
        setReport(result);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [ready, monthKey]);

  if (!ready || !loaded) {
    return <LoadingScreen />;
  }
  if (!report) {
    return (
      <KeyboardAwareScrollView contentContainerStyle={styles.container}>
        <Text variant="bodyMedium" style={styles.empty}>
          {t('report.empty')}
        </Text>
      </KeyboardAwareScrollView>
    );
  }

  const symbol = settings.currencySymbol;
  const saved = report.adjustmentCents > 0;
  const drawn = report.adjustmentCents < 0;

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>
        {monthLabel(report.monthKey)}
      </Text>

      <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
        <Card.Title title={t('report.summary')} />
        <Card.Content>
          <ReportRow label={t('report.monthlyAllowance')} value={formatCents(report.allowanceCents, symbol)} />
          <ReportRow label={t('report.oneOffIncome')} value={formatCents(report.incomeCents, symbol)} />
          <ReportRow label={t('report.totalSpent')} value={formatCents(report.spendingCents, symbol)} />
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
        <Card.Title
          title={t('settings.fixedExpenses')}
          subtitle={t('report.fixedTotal', {
            amount: formatCents(report.fixedTotalCents, symbol),
          })}
        />
        <Card.Content>
          {report.fixedExpenses.length === 0 ? (
            <Text variant="bodyMedium" style={styles.empty}>
              {t('report.noFixed')}
            </Text>
          ) : (
            report.fixedExpenses.map((expense) => (
              <List.Item
                key={expense.name}
                title={expense.name}
                description={
                  expense.actualCents !== null
                    ? t('report.actual')
                    : t('report.estimatedExpected', {
                        amount: formatCents(expense.expectedCents, symbol),
                      })
                }
                left={(props) => <List.Icon {...props} icon="calendar-check-outline" />}
                right={() => (
                  <Text variant="bodyLarge">{formatCents(expense.chargedCents, symbol)}</Text>
                )}
              />
            ))
          )}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
        <Card.Title
          title={t('settings.subscriptions')}
          subtitle={t('report.subscriptionsDeducted', {
            amount: formatCents(report.subscriptionTotalCents, symbol),
          })}
        />
        <Card.Content>
          {report.subscriptions.length === 0 ? (
            <Text variant="bodyMedium" style={styles.empty}>
              {t('report.noSubscriptions')}
            </Text>
          ) : (
            report.subscriptions.map((subscription) => (
              <List.Item
                key={subscription.name}
                title={subscription.name}
                description={t('report.monthlyDeduction')}
                left={(props) => <List.Icon {...props} icon="calendar-refresh-outline" />}
                right={() => (
                  <Text variant="bodyLarge">{formatCents(subscription.monthlyCents, symbol)}</Text>
                )}
              />
            ))
          )}
        </Card.Content>
      </Card>

      <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
        <Card.Title
          title={t('report.flexibleBudgets')}
          subtitle={t('report.amountSpent', {
            amount: formatCents(report.budgetSpentTotalCents, symbol),
          })}
        />
        <Card.Content>
          {report.budgets.length === 0 ? (
            <Text variant="bodyMedium" style={styles.empty}>
              {t('report.noBudgets')}
            </Text>
          ) : (
            report.budgets.map((budget) => {
              if (!budget.active) {
                return (
                  <View key={budget.name} style={styles.budgetRow}>
                    <View style={styles.row}>
                      <Text variant="bodyMedium">{budget.name}</Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {budget.spentCents > 0
                          ? t('report.inactiveSpent', { amount: formatCents(budget.spentCents, symbol) })
                          : t('report.inactiveThisMonth')}
                      </Text>
                    </View>
                  </View>
                );
              }
              const over = budget.spentCents > budget.plannedCents;
              return (
                <View key={budget.name} style={styles.budgetRow}>
                  <View style={styles.row}>
                    <Text variant="bodyMedium">{budget.name}</Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: over ? theme.semantic.overBudget : theme.colors.onSurfaceVariant,
                      }}
                    >
                      {formatCents(budget.spentCents, symbol)} / {formatCents(budget.plannedCents, symbol)}
                      {over ? t('report.over') : ''}
                    </Text>
                  </View>
                  {budget.startingCents !== null && (
                    <Text variant="bodySmall" style={styles.planLine}>
                      {budget.startingCents === budget.plannedCents
                        ? t('report.plannedNeverAdjusted', {
                          amount: formatCents(budget.plannedCents, symbol),
                        })
                        : t('report.startedAdjusted', {
                          start: formatCents(budget.startingCents, symbol),
                          end: formatCents(budget.plannedCents, symbol),
                        })}
                    </Text>
                  )}
                  <ReportRow
                    label={over ? t('report.overBy') : t('report.remaining')}
                    value={over ? formatCents(-budget.remainingCents, symbol) : formatCents(budget.remainingCents, symbol)}
                    tone={over ? 'bad' : undefined}
                  />
                </View>
              );
            })
          )}
        </Card.Content>
      </Card>

      {report.endingDrawCents !== null && (
        <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
          <Card.Title
            title={t('report.plannedDraw')}
            subtitle={t('report.plannedDrawSubtitle')}
          />
          <Card.Content>
            <ReportRow
              label={t('report.plannedAtStart')}
              value={formatCents(report.initialDrawCents ?? 0, symbol)}
            />
            <ReportRow
              label={t('report.leftPlanningAt')}
              value={formatCents(report.endingDrawCents, symbol)}
            />
          </Card.Content>
        </Card>
      )}

      {report.closingVerdict ? (
        <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
          <Card.Title title={t('report.verdictTitle')} subtitle={t('report.verdictSubtitle')} />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.verdictText}>
              {report.closingVerdict}
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="elevated" style={styles.card} contentStyle={styles.cardContent}>
        <Card.Title title={t('report.savingsReserve')} />
        <Card.Content>
          <ReportRow
            label={t('report.previouslyOnAccount')}
            value={formatCents(report.startingReserveCents, symbol)}
          />
          <ReportRow
            label={saved || !drawn ? t('report.addedAtMonthEnd') : t('report.takenAtMonthEnd')}
            value={formatSignedCents(report.adjustmentCents, symbol)}
            tone={saved && report.adjustmentCents !== 0 ? 'good' : drawn ? 'bad' : undefined}
          />
          <ReportRow
            label={t('report.endingReserve')}
            value={
              report.endingReserveCents !== null
                ? formatCents(report.endingReserveCents, symbol)
                : '—'
            }
          />
        </Card.Content>
      </Card>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  card: {
    marginBottom: 12,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  budgetRow: {
    marginVertical: 6,
  },
  planLine: {
    opacity: 0.6,
    paddingBottom: 2,
  },
  empty: {
    opacity: 0.6,
    paddingVertical: 8,
  },
  verdictText: {
    lineHeight: 22,
  },
});