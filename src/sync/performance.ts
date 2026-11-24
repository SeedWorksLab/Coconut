export interface SyncTiming {
  phase: string;
  durationMs: number;
  succeeded: boolean;
}

const timings: SyncTiming[] = [];

export async function measureSyncPhase<T>(phase: string, task: () => Promise<T>): Promise<T> {
  const started = performance.now();
  let succeeded = false;
  try {
    const result = await task();
    succeeded = true;
    return result;
  } finally {
    timings.push({ phase, durationMs: performance.now() - started, succeeded });
    if (timings.length > 100) timings.shift();
  }
}

export function getSyncTimings(): SyncTiming[] {
  return timings.map((timing) => ({ ...timing }));
}

export async function mapSyncDownloads<T, R>(
  items: readonly T[],
  download: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let failure: unknown;
  let failed = false;
  const workers = Array.from({ length: Math.min(4, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await download(items[index]);
      } catch (error) {
        failed = true;
        failure = error;
      }
    }
  });
  // Drain outstanding requests even on failure, before another sync can start.
  await Promise.all(workers);
  if (failed) throw failure;
  return results;
}
