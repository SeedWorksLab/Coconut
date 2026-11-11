import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, List, Switch, Text, TextInput } from 'react-native-paper';
import type { Subscription } from '../models';
import type { SubscriptionInput } from '../database/subscriptions';
import { AmountInput } from './amount-input';
import { MonthField } from './month-field';
import { currentMonthKey, EVERGREEN_MONTH_KEY } from '../utils/date';
import { monthlyFromTotal, subscriptionMonths } from '../services/subscription-service';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';

interface Props {
  initialData: Subscription | null;
  currencySymbol: string;
  submitting: boolean;
  onSubmit: (draft: SubscriptionInput) => void;
}

export function SubscriptionForm({
  initialData,
  currencySymbol,
  submitting,
  onSubmit,
}: Props) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [totalAmountCents, setTotalAmountCents] = useState<number | null>(
    initialData?.totalAmountCents ?? null
  );
  const [monthlyAmountCents, setMonthlyAmountCents] = useState<number | null>(
    initialData?.monthlyAmountCents ?? null
  );
  const [startMonth, setStartMonth] = useState(
    initialData?.startMonth ?? currentMonthKey()
  );
  const [endMonth, setEndMonth] = useState(
    initialData?.endMonth && initialData.endMonth !== EVERGREEN_MONTH_KEY
      ? initialData.endMonth
      : currentMonthKey()
  );
  const [deductMonthly, setDeductMonthly] = useState(initialData?.deductMonthly ?? true);
  const [active, setActive] = useState(initialData?.active ?? true);
  const [amountError, setAmountError] = useState<string | null>(null);
  const theme = useAppTheme();
  const { t } = useI18n();

  const hasName = name.trim().length > 0;
  const periodMonths = subscriptionMonths({ startMonth, endMonth });
  const periodValid = endMonth >= startMonth;

  function handleSubmit() {
    setAmountError(null);
    if (!hasName) {
      return;
    }
    if (!periodValid) {
      setAmountError(t('subscription.endBeforeStartError'));
      return;
    }
    if (totalAmountCents === null || totalAmountCents <= 0) {
      setAmountError(t('subscription.validTotal'));
      return;
    }
    if (monthlyAmountCents === null || monthlyAmountCents <= 0) {
      setAmountError(t('subscription.validMonthly'));
      return;
    }
    onSubmit({
      name: name.trim(),
      totalAmountCents,
      monthlyAmountCents,
      startMonth,
      endMonth,
      deductMonthly,
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
        placeholder={t('subscription.placeholder')}
        style={styles.field}
      />
      <AmountInput
        label={t('subscription.totalAmount')}
        value={totalAmountCents}
        onChange={setTotalAmountCents}
        prefix={currencySymbol}
        error={amountError}
      />
      <View style={styles.field}>
        <AmountInput
          label={t('subscription.monthlyAmount')}
          value={monthlyAmountCents}
          onChange={setMonthlyAmountCents}
          prefix={currencySymbol}
        />
      </View>
      <List.Item
        title={t('subscription.calculateMonthly', {
          count: periodMonths,
          unit: periodMonths === 1 ? t('subscription.month') : t('subscription.months'),
        })}
        description={t('subscription.calculateMonthlyDescription')}
        titleStyle={styles.helperTitle}
        descriptionStyle={styles.helperDescription}
        onPress={() => {
          if (totalAmountCents !== null && periodValid) {
            setMonthlyAmountCents(monthlyFromTotal(totalAmountCents, periodMonths));
          }
        }}
      />

      <List.Subheader style={styles.sectionSubheader}>{t('subscription.timeline')}</List.Subheader>
      <Text variant="bodyMedium" style={styles.sectionTitle}>{t('subscription.since')}</Text>
      <MonthField value={startMonth} onChange={setStartMonth} label={t('subscription.startMonth')} />
      <Text variant="bodyMedium" style={styles.sectionTitle}>{t('subscription.until')}</Text>
      <MonthField value={endMonth} onChange={setEndMonth} label={t('subscription.endMonth')} />
      {!periodValid ? (
        <Text variant="bodySmall" style={[styles.generalError, { color: theme.colors.error }]}>
          {t('subscription.endBeforeStart')}
        </Text>
      ) : null}

      <List.Item
        title={t('subscription.deductMonthly')}
        description={t('subscription.deductMonthlyDescription')}
        right={() => <Switch value={deductMonthly} onValueChange={setDeductMonthly} />}
      />
      <List.Item
        title={t('fixed.active')}
        description={t('subscription.activePlanningDescription')}
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
      {!hasName ? (
        <Text variant="bodySmall" style={[styles.generalError, { color: theme.colors.error }]}>
          {t('form.enterName')}
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
  sectionSubheader: {
    paddingHorizontal: 0,
    marginTop: 8,
  },
  sectionTitle: {
    marginTop: 4,
    opacity: 0.7,
  },
  helperTitle: {
    fontSize: 14,
  },
  helperDescription: {
    fontSize: 12,
  },
  submit: {
    marginTop: 8,
  },
  generalError: {
    marginTop: 8,
  },
});