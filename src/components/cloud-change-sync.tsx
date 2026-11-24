import { useEffect } from 'react';
import { useAppData } from '../data/DataProvider';
import { observeSyncActivity } from '../sync/activity';
import { subscribeSyncChanges } from '../sync/change-notifications';
import { createSyncScheduler } from '../sync/scheduler';

export function CloudChangeSync() {
  const { ready, syncState, syncPersonalAndRefresh, syncSharedAndRefresh } = useAppData();
  useEffect(() => {
    if (!ready || !syncState.enabled) return;
    let disposed = false;
    let isActive = false;
    let generation = 0;
    let unsubscribe: (() => void) | undefined;
    const scheduler = createSyncScheduler(async () => {
      if (disposed || !isActive) return;
      try {
        await syncPersonalAndRefresh();
      } finally {
        await syncSharedAndRefresh();
      }
    });
    const stopActivity = observeSyncActivity((active) => {
      if (active === isActive) {
        if (active) scheduler.request();
        return;
      }
      isActive = active;
      const current = ++generation;
      unsubscribe?.();
      unsubscribe = undefined;
      if (!active) return;
      scheduler.request();
      void subscribeSyncChanges(() => {
        if (isActive && !disposed) scheduler.request();
      }).then((stop) => {
        if (disposed || current !== generation) stop();
        else unsubscribe = stop;
      }).catch(() => {
        // Existing refresh/polling still works if Realtime is unavailable.
      });
    });
    return () => {
      disposed = true;
      stopActivity();
      unsubscribe?.();
      scheduler.dispose();
    };
  }, [ready, syncState.enabled, syncState.supabaseUrl, syncState.apiKey,
    syncPersonalAndRefresh, syncSharedAndRefresh]);
  return null;
}
