import { Stack, ThemeProvider } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

import { CoconutThemeProvider, useAppTheme } from '../theme';
import { buildNavigationTheme } from '../theme/navigation';
import { DataProvider, useAppData } from '../data/DataProvider';
import { UpdateNotifier } from '../components/update-notifier';
import { AutoOnboarding } from '../components/auto-onboarding';
import { MonthPlanningOverlay } from '../components/month-planning-overlay';
import { I18nProvider, useI18n } from '../i18n';

function ThemedContent() {
  const theme = useAppTheme();
  const { t } = useI18n();
  const navigationTheme = buildNavigationTheme(theme);

  return (
    <ThemeProvider value={navigationTheme}>
      <PaperProvider theme={theme}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.surface },
            headerTintColor: theme.colors.onSurface,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="transaction/new"
            options={{ title: t('screen.newTransaction'), presentation: 'modal' }}
          />
          <Stack.Screen
            name="transaction/[id]"
            options={{ title: t('screen.transaction'), presentation: 'modal' }}
          />
          <Stack.Screen
            name="income/new"
            options={{ title: t('screen.newIncome'), presentation: 'modal' }}
          />
          <Stack.Screen
            name="income/[id]"
            options={{ title: t('screen.income'), presentation: 'modal' }}
          />
          <Stack.Screen
            name="fixed-expense/new"
            options={{ title: t('screen.newFixedExpense'), headerShown: false }}
          />
          <Stack.Screen
            name="fixed-expense/[id]"
            options={{ title: t('screen.fixedExpense'), headerShown: false }}
          />
          <Stack.Screen name="budget/new" options={{ title: t('screen.newBudget'), headerShown: false }} />
          <Stack.Screen name="budget/[id]" options={{ title: t('screen.budget'), headerShown: false }} />
          <Stack.Screen
            name="subscription/new"
            options={{ title: t('screen.newSubscription'), headerShown: false }}
          />
          <Stack.Screen
            name="subscription/[id]"
            options={{ title: t('screen.subscription'), headerShown: false }}
          />
          <Stack.Screen name="about" options={{ title: t('screen.about'), headerShown: false }} />
          <Stack.Screen name="sync" options={{ title: t('screen.cloudSync') }} />
          <Stack.Screen
            name="shared/expense"
            options={{ title: t('screen.sharedExpense'), presentation: 'modal' }}
          />
          <Stack.Screen name="shared/report/[id]" options={{ title: t('screen.sharedReport') }} />
          <Stack.Screen name="shared/balances" options={{ title: t('screen.balances') }} />
          <Stack.Screen name="whats-new" options={{ title: t('screen.whatsNew'), headerShown: false }} />
          <Stack.Screen
            name="budget-transactions/[budgetId]"
            options={{ title: t('screen.budgetTransactions'), presentation: 'modal' }}
          />
          <Stack.Screen name="monthly-history" options={{ title: t('screen.monthlyHistory') }} />
          <Stack.Screen name="monthly-report/[monthKey]" options={{ title: t('screen.monthlyReport') }} />
          <Stack.Screen name="planning/month" options={{ title: t('screen.thisMonthPlan') }} />
          <Stack.Screen
            name="planning/fixed-expenses"
            options={{ title: t('screen.fixedExpenses') }}
          />
          <Stack.Screen
            name="planning/budgets"
            options={{ title: t('screen.flexibleBudgets') }}
          />
          <Stack.Screen
            name="planning/subscriptions"
            options={{ title: t('screen.subscriptions') }}
          />
          <Stack.Screen
            name="planning/reserve"
            options={{ title: t('screen.savingsReserve') }}
          />
          <Stack.Screen
            name="planning/close-month"
            options={{ title: t('screen.closeMonth'), headerShown: false }}
          />
          <Stack.Screen
            name="planning/backup"
            options={{ title: t('screen.backupRestore') }}
          />
          <Stack.Screen
            name="greeter"
            options={{ title: t('screen.greeter'), presentation: 'fullScreenModal', headerShown: false }}
          />
          <Stack.Screen
            name="tutorial"
            options={{ title: t('screen.coconutTour'), presentation: 'fullScreenModal', headerShown: false }}
          />
        </Stack>
        <UpdateNotifier />
        <AutoOnboarding />
        <MonthPlanningOverlay />
      </PaperProvider>
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { settings } = useAppData();

  return (
    <CoconutThemeProvider preference={settings.themeMode}>
      <I18nProvider language={settings.language}>
        <ThemedContent />
      </I18nProvider>
    </CoconutThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <DataProvider>
      <ThemedApp />
    </DataProvider>
  );
}