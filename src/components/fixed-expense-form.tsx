import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, List, Menu, SegmentedButtons, Switch, Text, TextInput } from 'react-native-paper';
import type {
  EstimationStrategy,
  FixedExpense,
  FixedExpenseKind,
} from '../models';
import { AmountInput } from './amount-input';
import { useI18n, type TranslationKey } from '../i18n';
import { useAppTheme } from '../theme';

export type FixedExpenseDraft = Omit<FixedExpense, 'id' | 'sortOrder'> & { sortOrder: number };

const STRATEGY_LABEL_KEYS: Record<EstimationStrategy, TranslationKey> = {
  manual: 'fixed.manual',
  'last-month': 'fixed.lastMonth',
  average: 'fixed.recentAverage',
  'history-average': 'fixed.allHistory',
};

const STRATEGY_HINT_KEYS: Record<EstimationStrategy, TranslationKey> = {
  manual: 'fixed.manualHint',
  'last-month': 'fixed.lastMonthHint',
  average: 'fixed.recentAverageHint',
  'history-average': 'fixed.allHistoryHint',
};

interface Props {
  initialData: FixedExpense | null;
  currencySymbol: string;
  submitting: boolean;
  onSubmit: (draft: FixedExpenseDraft) => void;
}

export function FixedExpenseForm({ initialData, currencySymbol, submitting, onSubmit }: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [expectedAmountCents, setExpectedAmountCents] = useState<number | null>(
    initialData?.expectedAmountCents ?? null
  );
  const [kind, setKind] = useState<FixedExpenseKind>(initialData?.kind ?? 'variable');
  const [strategy, setStrategy] = useState<EstimationStrategy>(
    initialData?.estimationStrategy ?? 'manual'
  );
  const [averageMonths, setAverageMonths] = useState(
    String(initialData?.averageMonths ?? '3')
  );
  const [active, setActive] = useState(initialData?.active ?? true);
  const [strategyMenu, setStrategyMenu] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);
  const theme = useAppTheme();
  const { t } = useI18n();

  const isVariable = kind === 'variable';
  const averageMonthsNumber = Number(averageMonths);
  const hasName = name.trim().length > 0;
  const hasAverageMonths =
    !isVariable || strategy !== 'average' || (Number.isInteger(averageMonthsNumber) && averageMonthsNumber > 0);

  function handleSubmit() {
    setAmountError(null);
    if (!hasName || !hasAverageMonths) {
      return;
    }
    if (expectedAmountCents === null) {
      setAmountError(t('form.enterValidAmount'));
      return;
    }
    if (expectedAmountCents < 0) {
      setAmountError(t('settings.amountCannotBeNegative'));
      return;
    }
    setAmountError(null);
    onSubmit({
      name: name.trim(),
      expectedAmountCents,
      kind,
      recurrence: 'monthly',
      estimationStrategy: isVariable ? strategy : 'manual',
      averageMonths:
        isVariable && strategy === 'average' ? averageMonthsNumber : null,
      active,
      sortOrder: initialData?.sortOrder ?? 0,
    });
  }

  return (
    <View style={styles.container}>
      <TextInput
        label={t('form.name')}
        value={name}
        onChangeText={setName}
        mode="outlined"
        style={styles.field}
      />
      <AmountInput
        label={isVariable ? t('fixed.expectedAmount') : t('form.amount')}
        value={expectedAmountCents}
        onChange={setExpectedAmountCents}
        prefix={currencySymbol}
        error={amountError}
      />

      <SegmentedButtons
        value={kind}
        onValueChange={(value) => setKind(value as FixedExpenseKind)}
        buttons={[
          { value: 'variable', label: t('fixed.variable') },
          { value: 'fixed', label: t('fixed.fixed') },
        ]}
        style={styles.field}
      />

      {isVariable && (
        <>
          <Menu
            visible={strategyMenu}
            onDismiss={() => setStrategyMenu(false)}
            anchor={
              <List.Item
                title={t('fixed.estimationStrategy')}
                description={t(STRATEGY_HINT_KEYS[strategy])}
                right={(props) => <List.Icon {...props} icon="chevron-down" />}
                onPress={() => setStrategyMenu(true)}
              />
            }
          >
            {(Object.keys(STRATEGY_LABEL_KEYS) as EstimationStrategy[]).map((key) => (
              <Menu.Item
                key={key}
                title={t(STRATEGY_LABEL_KEYS[key])}
                onPress={() => {
                  setStrategy(key);
                  setStrategyMenu(false);
                }}
              />
            ))}
          </Menu>

          {strategy === 'average' && (
            <TextInput
              label={t('fixed.monthsToAverage')}
              value={averageMonths}
              onChangeText={setAverageMonths}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.field}
            />
          )}
        </>
      )}

      <List.Item
        title={t('fixed.active')}
        description={t('fixed.activeDescription')}
        right={() => <Switch value={active} onValueChange={setActive} />}
      />

      <Button
        mode="contained"
        onPress={handleSubmit}
        disabled={submitting}
        loading={submitting}
        style={styles.submit}
      >
        {t('common.save')}
      </Button>
      {!hasName || !hasAverageMonths ? (
        <Text variant="bodySmall" style={[styles.generalError, { color: theme.colors.error }]}>
          {!hasName
            ? t('form.enterName')
            : !hasAverageMonths
              ? t('fixed.monthsError')
              : null}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  field: {
    marginBottom: 16,
  },
  submit: {
    marginTop: 8,
  },
  generalError: {
    marginTop: 8,
  },
});