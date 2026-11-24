import React from 'react';
import { act, render } from '@testing-library/react-native';
import { CloudChangeSync } from '../../src/components/cloud-change-sync';
import { useAppData } from '../../src/data/DataProvider';
import { observeSyncActivity } from '../../src/sync/activity';
import { subscribeSyncChanges } from '../../src/sync/change-notifications';

jest.mock('../../src/data/DataProvider', () => ({ useAppData: jest.fn() }));
jest.mock('../../src/sync/activity', () => ({ observeSyncActivity: jest.fn() }));
jest.mock('../../src/sync/change-notifications', () => ({ subscribeSyncChanges: jest.fn() }));

const personal = jest.fn().mockResolvedValue(undefined);
const shared = jest.fn().mockResolvedValue(undefined);

function data(enabled: boolean) {
  jest.mocked(useAppData).mockReturnValue({
    ready: true, syncState: { enabled, supabaseUrl: null, apiKey: null },
    syncPersonalAndRefresh: personal, syncSharedAndRefresh: shared,
  } as unknown as ReturnType<typeof useAppData>);
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});
afterEach(() => jest.useRealTimers());

it('does not initialize subscriptions or sync activity with sync disabled', async () => {
  data(false);
  await render(<CloudChangeSync />);
  expect(observeSyncActivity).not.toHaveBeenCalled();
  expect(subscribeSyncChanges).not.toHaveBeenCalled();
});

it('coalesces active change hints and releases channels and pending work on disable', async () => {
  data(true);
  let activity!: (active: boolean) => void;
  let changed!: () => void;
  const stop = jest.fn();
  const stopActivity = jest.fn();
  jest.mocked(observeSyncActivity).mockImplementation((callback) => {
    activity = callback;
    callback(true);
    return stopActivity;
  });
  jest.mocked(subscribeSyncChanges).mockImplementation(async (callback) => {
    changed = callback;
    return stop;
  });
  const view = await render(<CloudChangeSync />);
  await act(async () => { await jest.advanceTimersByTimeAsync(300); });
  expect(personal).toHaveBeenCalledTimes(1);
  expect(shared).toHaveBeenCalledTimes(1);
  await act(async () => {
    changed();
    changed();
    activity(false);
    await jest.advanceTimersByTimeAsync(300);
  });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(personal).toHaveBeenCalledTimes(1);
  data(false);
  await view.rerender(<CloudChangeSync />);
  expect(stopActivity).toHaveBeenCalled();
});
