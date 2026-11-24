import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { AccountBubble } from '../../src/components/account-bubble';
import { getSupabaseSessionUser } from '../../src/sync/supabase';
import { getSeedProfilePicture } from '../../src/sync/profile-picture';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import('react')>('react');
    React.useEffect(callback, [callback]);
  },
}));
jest.mock('../../src/sync/supabase', () => ({ getSupabaseSessionUser: jest.fn() }));
jest.mock('../../src/sync/profile-picture', () => ({ getSeedProfilePicture: jest.fn() }));
jest.mock('../../src/i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getSupabaseSessionUser).mockResolvedValue({
    id: 'account-1', email: 'user@example.com',
  } as never);
  jest.mocked(getSeedProfilePicture).mockResolvedValue('data:image/png;base64,AAAA');
});

async function renderBubble(isCustom = false, username: string | null = 'Alex') {
  const onPress = jest.fn();
  await render(
    <PaperProvider>
      <AccountBubble username={username} isCustom={isCustom} onPress={onPress} />
    </PaperProvider>,
  );
  await waitFor(() => expect(getSupabaseSessionUser).toHaveBeenCalled());
  return onPress;
}

it('shows the username, email and Seed photo and opens Cloud settings', async () => {
  const onPress = await renderBubble();
  await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
  expect(screen.getByText('user@example.com')).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId('account-picture').props.source)
    .toEqual({ uri: 'data:image/png;base64,AAAA' }));
  await fireEvent.press(screen.getByLabelText('settings.cloudSync'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

it('does not call the Seed picture API for a custom project', async () => {
  await renderBubble(true);
  await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
  expect(getSeedProfilePicture).not.toHaveBeenCalled();
});

it('keeps account navigation available if the photo cannot load', async () => {
  jest.mocked(getSeedProfilePicture).mockRejectedValue(new Error('Offline'));
  const onPress = await renderBubble();
  await waitFor(() => expect(screen.getByText('Alex')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('settings.cloudSync'));
  expect(onPress).toHaveBeenCalled();
});

it('keeps Cloud settings reachable without a signed-in account', async () => {
  jest.mocked(getSupabaseSessionUser).mockResolvedValue(null);
  const onPress = await renderBubble();
  expect(screen.queryByText('Alex')).toBeNull();
  expect(getSeedProfilePicture).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('settings.cloudSync'));
  expect(onPress).toHaveBeenCalled();
});

it('falls back to the email when no username is set', async () => {
  await renderBubble(false, null);
  await waitFor(() => expect(screen.getAllByText('user@example.com')).toHaveLength(2));
});
