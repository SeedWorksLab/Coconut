import { createSyncScheduler } from '../../src/sync/scheduler';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('coalesces rapid edits without increasing the polling rate', async () => {
  const sync = jest.fn().mockResolvedValue(undefined);
  const scheduler = createSyncScheduler(sync);
  scheduler.request();
  scheduler.request();
  scheduler.request();
  await jest.advanceTimersByTimeAsync(299);
  expect(sync).not.toHaveBeenCalled();
  await jest.advanceTimersByTimeAsync(1);
  expect(sync).toHaveBeenCalledTimes(1);
  scheduler.dispose();
});

it('runs again for an edit made during an in-flight sync', async () => {
  let release!: () => void;
  const sync = jest.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }))
    .mockResolvedValue(undefined);
  const scheduler = createSyncScheduler(sync);
  scheduler.request();
  await jest.advanceTimersByTimeAsync(300);
  scheduler.request();
  scheduler.request();
  release();
  await jest.advanceTimersByTimeAsync(300);
  expect(sync).toHaveBeenCalledTimes(2);
  scheduler.dispose();
});

it('recovers from failure and cancels pending work when disposed', async () => {
  const sync = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
  const scheduler = createSyncScheduler(sync);
  scheduler.request();
  await jest.advanceTimersByTimeAsync(300);
  scheduler.request();
  await jest.advanceTimersByTimeAsync(300);
  expect(sync).toHaveBeenCalledTimes(2);
  scheduler.request();
  scheduler.dispose();
  scheduler.request();
  await jest.runAllTimersAsync();
  expect(sync).toHaveBeenCalledTimes(2);
});
