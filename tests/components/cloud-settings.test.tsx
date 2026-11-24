import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import SettingsScreen from '../../src/app/(tabs)/settings';
import SyncScreen from '../../src/app/sync';
import { useAppData } from '../../src/data/DataProvider';
import { lightTheme } from '../../src/theme';
import { SEEDWORKS_ACCOUNT_URL } from '../../src/config/cloud';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../src/data/DataProvider', () => ({ useAppData: jest.fn() }));
jest.mock('../../src/database/updatePrefs', () => ({
  getCheckForUpdatesOnStart: jest.fn().mockResolvedValue(false),
  setCheckForUpdatesOnStart: jest.fn(),
}));
jest.mock('../../src/database/sharedSpaces', () => ({ setMemberDisplayNameForUser: jest.fn() }));
jest.mock('../../src/sync/engine', () => ({ syncNow: jest.fn() }));
jest.mock('../../src/sync/supabase', () => ({
  getSupabaseSessionUser: jest.fn().mockResolvedValue(null),
}));
jest.mock('../../src/components/account-bubble', () => ({
  AccountBubble: ({ onPress }: { onPress: () => void }) => {
    const { Button } = jest.requireActual<typeof import('react-native-paper')>('react-native-paper');
    return <Button onPress={onPress}>Account bubble</Button>;
  },
}));
jest.mock('../../src/i18n', () => ({
  LANGUAGES: [{ code: 'en', nativeLabel: 'English' }],
  useI18n: () => ({ t: (key: string) => key }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function mockData(enabled: boolean) {
  jest.mocked(useAppData).mockReturnValue({
    ready: true,
    settings: {
      username: 'Alex', currencySymbol: '€', language: 'en', themeMode: 'light',
      monthlyAllowanceCents: 0, recentTransactionsCount: 5,
    },
    syncState: {
      enabled, supabaseUrl: null, apiKey: null,
      lastSyncAt: null, lastSyncStatus: null, lastSyncError: null,
    },
  } as ReturnType<typeof useAppData>);
}

it.each([false, true])('shows exactly the appropriate Cloud entry when enabled=%p', async (enabled) => {
  mockData(enabled);
  await render(<PaperProvider theme={lightTheme}><SettingsScreen /></PaperProvider>);
  await waitFor(() => expect(screen.getByText(enabled ? 'Account bubble' : 'settings.cloudSync')).toBeTruthy());
  expect(screen.queryByText(enabled ? 'settings.cloudSync' : 'Account bubble')).toBeNull();
  await fireEvent.press(screen.getByText(enabled ? 'Account bubble' : 'settings.cloudSync'));
  expect(mockPush).toHaveBeenCalledWith('/sync');
});

it('offers sign-in and website registration, not in-app account creation', async () => {
  mockData(false);
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<PaperProvider theme={lightTheme}><SyncScreen /></PaperProvider>);
  expect(screen.getByText('sync.signIn')).toBeTruthy();
  expect(screen.queryByText('sync.createAccount')).toBeNull();
  await fireEvent.press(screen.getByText('sync.registerOnWebsite'));
  expect(openURL).toHaveBeenCalledWith(SEEDWORKS_ACCOUNT_URL);
  openURL.mockRestore();
});
