import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ReactNative from 'react-native';
import { HostedWebGate } from '../../src/components/hosted-web-gate.web';
import { darkTheme, lightTheme } from '../../src/theme';
import { getHostedAccountClient } from '../../src/sync/hosted-account-client';
import { openHostedAccountCache } from '../../src/sync/hosted-bootstrap';
import { BrowserDatabaseError } from '../../src/database/database-access-error';

jest.mock('../../src/config/hosted-web', () => ({ HOSTED_WEB: true }));
jest.mock('../../src/sync/auth-storage', () => ({ SEEDWORKS_AUTH_STORAGE_KEY: 'test-auth' }));
jest.mock('../../src/sync/hosted-bootstrap', () => ({ openHostedAccountCache: jest.fn() }));
jest.mock('../../src/sync/hosted-account-client', () => ({ getHostedAccountClient: jest.fn() }));
jest.mock('../../src/sync/hosted-oauth.web', () => ({
  completeHostedLogin: jest.fn(), startHostedLogin: jest.fn(), validateOAuthClaims: jest.fn(),
}));

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getHostedAccountClient).mockReturnValue(null);
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

it.each(['light', 'dark', 'unspecified'] as const)('pairs the auth-screen background and foreground in %s mode', async (scheme) => {
  jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue(scheme);
  const theme = scheme === 'dark' ? darkTheme : lightTheme;
  await render(<HostedWebGate><ReactNative.Text>Account data</ReactNative.Text></HostedWebGate>);
  expect(ReactNative.StyleSheet.flatten(screen.getByTestId('hosted-web-gate').props.style).backgroundColor)
    .toBe(theme.colors.background);
  for (const text of ['Coconut', 'Checking your Seed account…']) {
    expect(ReactNative.StyleSheet.flatten(screen.getByText(text).props.style).color)
      .toBe(theme.colors.onBackground);
  }
  expect(screen.queryByText('Account data')).toBeNull();
});

function signedInBrowser() {
  const user = { id: '11111111-1111-4111-8111-111111111111' };
  const reload = jest.fn();
  const browser = {
    location: { hostname: 'localhost', reload },
    addEventListener: jest.fn(), removeEventListener: jest.fn(),
    top: null as unknown, self: null as unknown,
  };
  browser.top = browser.self = browser;
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  jest.mocked(getHostedAccountClient).mockReturnValue({
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: {
        user, access_token: 'test', expires_at: Math.floor(Date.now() / 1000) + 3600,
      } } }),
      getUser: jest.fn().mockResolvedValue({ data: { user } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  } as never);
  return reload;
}

it('explains another-tab ownership and retries without asking the user to sign in again', async () => {
  signedInBrowser();
  jest.mocked(openHostedAccountCache)
    .mockRejectedValueOnce(new BrowserDatabaseError('busy', 'Coconut is already open in another tab. Close it and try again.'))
    .mockResolvedValueOnce(undefined);
  await render(<HostedWebGate><ReactNative.Text>Account data</ReactNative.Text></HostedWebGate>);
  await waitFor(() => expect(screen.getByText(/already open in another tab/)).toBeTruthy());
  expect(screen.queryByText('Sign in with SeedWorks')).toBeNull();
  await fireEvent.press(screen.getByText('Try again'));
  await waitFor(() => expect(screen.getByText('Account data')).toBeTruthy());
  expect(openHostedAccountCache).toHaveBeenCalledTimes(2);
});

it('offers reload rather than retrying a damaged SQLite worker', async () => {
  const reload = signedInBrowser();
  jest.mocked(openHostedAccountCache).mockRejectedValueOnce(
    new BrowserDatabaseError('restart', 'Close other tabs and reload.'),
  );
  await render(<HostedWebGate><ReactNative.Text>Account data</ReactNative.Text></HostedWebGate>);
  await waitFor(() => expect(screen.getByText('Reload Coconut')).toBeTruthy());
  expect(screen.queryByText('Try again')).toBeNull();
  expect(screen.queryByText('Sign in with SeedWorks')).toBeNull();
  await fireEvent.press(screen.getByText('Reload Coconut'));
  expect(reload).toHaveBeenCalledTimes(1);
});
