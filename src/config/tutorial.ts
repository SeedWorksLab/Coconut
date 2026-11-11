import type { TranslationKey } from '../i18n/en';

export interface TutorialPage {
  icon: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}

export const tutorialPages: TutorialPage[] = [
  { icon: 'sprout-outline', titleKey: 'tutorial.page.welcome.title', bodyKey: 'tutorial.page.welcome.body' },
  {
    icon: 'wallet-outline',
    titleKey: 'tutorial.page.allowance.title',
    bodyKey: 'tutorial.page.allowance.body',
  },
  {
    icon: 'calendar-plus-outline',
    titleKey: 'tutorial.page.starting.title',
    bodyKey: 'tutorial.page.starting.body',
  },
  {
    icon: 'cash-multiple',
    titleKey: 'tutorial.page.transactions.title',
    bodyKey: 'tutorial.page.transactions.body',
  },
  {
    icon: 'tag-multiple-outline',
    titleKey: 'tutorial.page.budgets.title',
    bodyKey: 'tutorial.page.budgets.body',
  },
  {
    icon: 'calendar-check-outline',
    titleKey: 'tutorial.page.fixedExpenses.title',
    bodyKey: 'tutorial.page.fixedExpenses.body',
  },
  {
    icon: 'file-document-outline',
    titleKey: 'tutorial.page.closing.title',
    bodyKey: 'tutorial.page.closing.body',
  },
  {
    icon: 'chart-line',
    titleKey: 'tutorial.page.statistics.title',
    bodyKey: 'tutorial.page.statistics.body',
  },
  {
    icon: 'cloud-outline',
    titleKey: 'tutorial.page.sync.title',
    bodyKey: 'tutorial.page.sync.body',
  },
  {
    icon: 'account-group-outline',
    titleKey: 'tutorial.page.shared.title',
    bodyKey: 'tutorial.page.shared.body',
  },
  {
    icon: 'rocket-launch-outline',
    titleKey: 'tutorial.page.ready.title',
    bodyKey: 'tutorial.page.ready.body',
  },
];
