import type { Session } from '@supabase/supabase-js';
import { subscribeSyncChanges } from '../../src/sync/change-notifications';
import { getClient } from '../../src/sync/supabase';

jest.mock('../../src/sync/supabase', () => ({ getClient: jest.fn() }));

function fixture() {
  let authChanged!: (event: string, session: Session | null) => void;
  let subscribed!: (status: string) => void;
  const unsubscribe = jest.fn();
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn((callback: (status: string) => void) => { subscribed = callback; }),
  };
  const client = {
    channel: jest.fn(() => channel),
    removeChannel: jest.fn().mockResolvedValue('ok'),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } }, error: null }),
      onAuthStateChange: jest.fn((callback) => {
        authChanged = callback;
        return { data: { subscription: { unsubscribe } } };
      }),
    },
  };
  jest.mocked(getClient).mockResolvedValue(client as never);
  return { client, channel, unsubscribe, authChanged: (...args: Parameters<typeof authChanged>) => authChanged(...args),
    subscribed: (status: string) => subscribed(status) };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('uses authenticated INSERT/UPDATE hints, not unfiltered DELETE events', async () => {
  const { channel, client, subscribed, unsubscribe } = fixture();
  const changed = jest.fn();
  const stop = await subscribeSyncChanges(changed);
  const filters = channel.on.mock.calls.map((call) => call[1] as {
    event: string; schema: string; table: string; filter?: string;
  });
  expect(filters.length).toBeGreaterThan(0);
  expect(filters.every((filter) => filter.event === 'INSERT' || filter.event === 'UPDATE')).toBe(true);
  expect(filters.every((filter) => filter.schema === 'coconut')).toBe(true);
  expect(filters.find((filter) => filter.table === 'transactions')?.filter).toBe('user_id=eq.user-1');
  expect(filters.find((filter) => filter.table === 'shared_expenses')?.filter).toBeUndefined();
  subscribed('SUBSCRIBED');
  expect(changed).toHaveBeenCalledTimes(1);
  stop();
  expect(unsubscribe).toHaveBeenCalled();
  expect(client.removeChannel).toHaveBeenCalledWith(channel);
});

it('releases the old channel on account changes and sign-out', async () => {
  const { authChanged, client } = fixture();
  const stop = await subscribeSyncChanges(jest.fn());
  authChanged('SIGNED_IN', { user: { id: 'user-2' } } as Session);
  await jest.runAllTimersAsync();
  expect(client.channel).toHaveBeenLastCalledWith('coconut-sync:user-2');
  authChanged('SIGNED_OUT', null);
  await jest.runAllTimersAsync();
  expect(client.removeChannel).toHaveBeenCalledTimes(2);
  stop();
});

it('does not open a channel without a session and cleans up session failures', async () => {
  const { client, unsubscribe, authChanged } = fixture();
  client.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  const stop = await subscribeSyncChanges(jest.fn());
  expect(client.channel).not.toHaveBeenCalled();
  stop();
  client.auth.getSession.mockRejectedValueOnce(new Error('Session unavailable'));
  await expect(subscribeSyncChanges(jest.fn())).rejects.toThrow('Session unavailable');
  expect(unsubscribe).toHaveBeenCalledTimes(2);
  let rejectSession!: (error: Error) => void;
  client.auth.getSession.mockImplementationOnce(() => new Promise((_, reject) => { rejectSession = reject; }));
  const pending = subscribeSyncChanges(jest.fn());
  await Promise.resolve();
  authChanged('INITIAL_SESSION', { user: { id: 'user-1' } } as Session);
  await jest.runAllTimersAsync();
  rejectSession(new Error('Session unavailable'));
  await expect(pending).rejects.toThrow('Session unavailable');
  expect(client.removeChannel).toHaveBeenCalledTimes(1);
});
