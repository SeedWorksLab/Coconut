import { getSyncTimings, mapSyncDownloads, measureSyncPhase } from '../../src/sync/performance';

it('bounds parallel downloads while preserving dependency-order results', async () => {
  let active = 0;
  let maximum = 0;
  const results = await mapSyncDownloads([0, 1, 2, 3, 4, 5, 6], async (value) => {
    active++;
    maximum = Math.max(maximum, active);
    await Promise.resolve();
    active--;
    return value * 2;
  });
  expect(maximum).toBe(4);
  expect(results).toEqual([0, 2, 4, 6, 8, 10, 12]);
});

it('drains in-flight downloads before reporting failure', async () => {
  let release!: () => void;
  let rejected = false;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  const task = mapSyncDownloads([0, 1, 2, 3, 4], async (value) => {
    if (value === 0) throw new Error('Offline');
    await wait;
    return value;
  });
  const checked = expect(task.catch((error: unknown) => {
    rejected = true;
    throw error;
  })).rejects.toThrow('Offline');
  await Promise.resolve();
  expect(rejected).toBe(false);
  release();
  await checked;
});

it('keeps bounded, data-free phase diagnostics without swallowing failures', async () => {
  for (let index = 0; index < 101; index++) {
    await measureSyncPhase('test.download', async () => 'not recorded');
  }
  await expect(measureSyncPhase('test.apply', async () => { throw new Error('Failure'); }))
    .rejects.toThrow('Failure');
  const timings = getSyncTimings();
  expect(timings).toHaveLength(100);
  expect(timings.at(-1)).toEqual({
    phase: 'test.apply', durationMs: expect.any(Number), succeeded: false,
  });
  timings[0].phase = 'modified';
  expect(getSyncTimings()[0].phase).toBe('test.download');
});
