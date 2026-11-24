export interface SyncScheduler {
  request: () => void;
  dispose: () => void;
}

export function createSyncScheduler(sync: () => Promise<void>): SyncScheduler {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let pending = false;
  let disposed = false;

  const run = async () => {
    timer = undefined;
    if (disposed || running) return;
    running = true;
    pending = false;
    try {
      await sync();
    } catch {
      // The engine persists failures; retries are driven by edits/reconnects.
    } finally {
      running = false;
      if (pending && !disposed) timer = setTimeout(() => { void run(); }, 300);
    }
  };

  return {
    request() {
      if (disposed) return;
      pending = true;
      if (!running && timer === undefined) timer = setTimeout(() => { void run(); }, 300);
    },
    dispose() {
      disposed = true;
      if (timer !== undefined) clearTimeout(timer);
    },
  };
}
