import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/keyboard-aware-scroll-view';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, List, Portal, Text } from 'react-native-paper';
import type { Attachment, Transaction } from '../../models';
import { getTransaction } from '../../database/transactions';
import { getExpenseTraceByOriginId, type SharedExpenseTrace } from '../../database/sharedExpenses';
import { useAppData } from '../../data/DataProvider';
import { useI18n } from '../../i18n';
import { TransactionForm } from '../../components/transaction-form';
import { TransactionDetails } from '../../components/transaction-details';
import { AttachmentField } from '../../components/attachment-field';
import { BudgetSelect } from '../../components/budget-select';
import { AppDialog } from '../../components/app-dialog';
import { LoadingScreen } from '../../components/loading-screen';
import { useAppTheme } from '../../theme';
import { formatCents } from '../../utils/currency';
import { monthLabel } from '../../utils/date';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    budgets,
    settings,
    activeMonthKey,
    allMonths,
    currentDashboard,
    saveTransaction,
    saveTransactionAttachment,
    saveTransactionBudget,
    removeTransaction,
    suggestBudgets,
  } = useAppData();
  const theme = useAppTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [budgetId, setBudgetId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [trace, setTrace] = useState<SharedExpenseTrace | null>(null);

  // A transaction in the running month can only be assigned to a budget that is
  // part of that month's plan. Past months keep their existing choices, and the
  // currently selected budget is always shown even if it is no longer offered.
  const selectableBudgets = useMemo(() => {
    const monthBudgets =
      currentDashboard && transaction && currentDashboard.monthKey === transaction.monthKey
        ? currentDashboard.budgetStatuses.map((entry) => entry.budget)
        : budgets;
    if (budgetId !== null && !monthBudgets.some((budget) => budget.id === budgetId)) {
      const selected = budgets.find((budget) => budget.id === budgetId);
      return selected ? [...monthBudgets, selected] : monthBudgets;
    }
    return monthBudgets;
  }, [currentDashboard, transaction, budgets, budgetId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getTransaction(Number(id)).then((result) => {
        if (active && result) {
          setTransaction(result);
          setBudgetId(result.budgetId);
          setAttachment(
            result.attachment
              ? {
                  name: result.attachmentName ?? 'attachment',
                  mime: result.attachmentMime ?? 'application/octet-stream',
                  bytes: result.attachment,
                }
              : null
          );
        }
      });
      return () => {
        active = false;
      };
    }, [id])
  );

  useFocusEffect(
    useCallback(() => {
      if (!transaction || transaction.originType !== 'shared' || !transaction.originId) {
        return;
      }
      let active = true;
      // Reload on every focus so a just-synced edit of the shared expense is
      // reflected here (paid by, total) instead of the stale first load.
      getExpenseTraceByOriginId(transaction.originId).then((result) => {
        if (active) {
          setTrace(result);
        }
      });
      return () => {
        active = false;
      };
    }, [transaction])
  );

  if (!transaction) {
    return <LoadingScreen />;
  }

  const openSharedExpense = () => {
    if (!trace) {
      return;
    }
    router.push({
      pathname: '/shared/expense',
      params: { spaceId: String(trace.spaceId), id: String(trace.expenseId) },
    });
  };

  const handleAttachmentChange = (next: Attachment | null) => {
    if (!transaction) {
      return;
    }
    setAttachment(next);
    void saveTransactionAttachment(transaction.id, next);
  };

  const handleBudgetChange = (next: number | null) => {
    if (!transaction) {
      return;
    }
    setBudgetId(next);
    setTransaction({ ...transaction, budgetId: next });
    void saveTransactionBudget(transaction.id, next);
  };

  // A closed month is final, so its purchases are shown but never edited; only
  // deleting and the rating recorded during the closing review remain possible.
  const transactionMonth = allMonths.find((month) => month.monthKey === transaction.monthKey);
  const isClosedMonth = transactionMonth?.isClosed ?? false;
  const budgetName =
    transaction.budgetId === null
      ? null
      : budgets.find((budget) => budget.id === transaction.budgetId)?.name ?? '';

  return (
    <KeyboardAwareScrollView contentContainerStyle={styles.container}>
      {trace ? (
        <Card mode="outlined" style={styles.sharedCard}>
          <Card.Title
            title={t('route.sharedExpense')}
            subtitle={trace.spaceName}
            left={(props) => <List.Icon {...props} icon="account-group-outline" />}
          />
          <Card.Content>
            <View style={styles.traceRow}>
              <Text variant="bodyMedium">{t('route.paidBy')}</Text>
              <Text variant="bodyMedium">{trace.paidByName}</Text>
            </View>
            <View style={styles.traceRow}>
              <Text variant="bodyMedium">{t('route.expenseTotal')}</Text>
              <Text variant="bodyMedium">
                {formatCents(trace.totalAmountCents, settings.currencySymbol)}
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.traceHint}>
              {t('route.sharedDerivedHint')}
            </Text>
            <Button mode="outlined" icon="open-in-new" onPress={openSharedExpense} style={styles.traceButton}>
              {t('route.openSharedExpense')}
            </Button>
          </Card.Content>
        </Card>
      ) : null}
      {transaction.originType === 'shared' ? (
        <View>
          <TransactionDetails transaction={transaction} symbol={settings.currencySymbol} />
          <BudgetSelect
            budgets={selectableBudgets}
            selectedId={budgetId}
            onSelect={handleBudgetChange}
            symbol={settings.currencySymbol}
            budgetStatuses={
              currentDashboard && currentDashboard.monthKey === transaction.monthKey
                ? currentDashboard.budgetStatuses
                : []
            }
            editedTransaction={transaction}
          />
          <Text variant="bodySmall" style={styles.attachmentHint}>
            {t('route.attachmentLocal')}
          </Text>
          <AttachmentField value={attachment} onChange={handleAttachmentChange} />
        </View>
      ) : isClosedMonth ? (
        <View>
          <TransactionDetails
            transaction={transaction}
            symbol={settings.currencySymbol}
            budgetName={budgetName ?? ''}
          />
          <Text variant="bodySmall" style={styles.closedHint}>
            {t('route.closedTransactionReadOnly', {
              month: monthLabel(transaction.monthKey),
            })}
          </Text>
        </View>
      ) : (
        <TransactionForm
          initial={transaction}
          budgets={selectableBudgets}
          budgetStatuses={currentDashboard?.budgetStatuses ?? []}
          symbol={settings.currencySymbol}
          activeMonthKey={activeMonthKey}
          suggestMerchant={suggestBudgets}
          onSubmit={async (input) => {
            await saveTransaction(transaction.id, input);
            router.back();
          }}
        />
      )}
      {transaction.originType === 'shared' ? null : (
        <View style={styles.deleteRow}>
          <Button
            mode="text"
            textColor={theme.semantic.delete}
            onPress={() => setConfirmDelete(true)}
          >
            {t('route.deleteTransaction')}
          </Button>
        </View>
      )}
      <Portal>
        <AppDialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <AppDialog.Title>{t('route.deleteTransactionTitle')}</AppDialog.Title>
          <AppDialog.Content>
            <Text variant="bodyMedium">
              {t('route.deleteTransactionBody')}
            </Text>
          </AppDialog.Content>
          <AppDialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>{t('common.cancel')}</Button>
            <Button
              mode="contained"
              buttonColor={theme.semantic.delete}
              onPress={() => {
                setConfirmDelete(false);
                removeTransaction(transaction.id).then(() => router.back());
              }}
            >
              {t('route.delete')}
            </Button>
          </AppDialog.Actions>
        </AppDialog>
      </Portal>
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  sharedCard: {
    marginBottom: 16,
  },
  traceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  traceHint: {
    marginTop: 6,
    opacity: 0.6,
  },
  traceButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  attachmentHint: {
    marginTop: 12,
    opacity: 0.6,
  },
  closedHint: {
    marginTop: 12,
    opacity: 0.6,
  },
  deleteRow: {
    alignItems: 'center',
    marginTop: 16,
  },
});