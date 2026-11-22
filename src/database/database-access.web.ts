import { BrowserDatabaseError } from './database-access-error';

// Expo's AccessHandlePoolVFS owns the entire origin's "expo-sqlite" pool,
// not just one account/database file. Its handles survive database.closeAsync.
export const DATABASE_ACCESS_LOCK = 'seedworks:expo-sqlite:access-handle-pool';
let accessPromise: Promise<void> | null = null;
let restartRequired: BrowserDatabaseError | null = null;

export function acquireDatabaseAccess(): Promise<void> {
  if (restartRequired) return Promise.reject(restartRequired);
  if (accessPromise) return accessPromise;
  if (typeof navigator === 'undefined' || !navigator.locks?.request) {
    return Promise.reject(new BrowserDatabaseError(
      'unsupported',
      'This browser cannot safely coordinate Coconut’s local storage. Use a current browser over HTTPS.',
    ));
  }

  const pending = new Promise<void>((resolve, reject) => {
    void navigator.locks.request(DATABASE_ACCESS_LOCK, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
      if (!lock) {
        reject(new BrowserDatabaseError(
          'busy',
          'Coconut is already open in another tab or window. Close the other Coconut tabs, then choose Try again here. Your saved data has not been changed.',
        ));
        return;
      }
      resolve();
      // Do not release on DB close, React unmount or pagehide: the SQLite
      // worker/VFS can still own OPFS handles. Browser context destruction
      // releases this lock together with its worker, including after a crash.
      await new Promise<void>(() => {});
    }).catch(reject);
  });
  accessPromise = pending;
  void pending.catch(() => {
    if (accessPromise === pending) accessPromise = null;
  });
  return pending;
}

export function normalizeDatabaseOpenError(error: unknown): unknown {
  if (error instanceof BrowserDatabaseError) return error;
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  if (/Invalid VFS state|NoModificationAllowedError|createSyncAccessHandle|Access Handles cannot be created/i.test(message)) {
    restartRequired = new BrowserDatabaseError(
      'restart',
      'Coconut could not open browser storage. Close any other Coconut tabs or windows, then reload this page. Reloading does not clear your saved data.',
    );
    return restartRequired;
  }
  return error;
}
