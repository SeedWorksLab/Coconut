/** @jest-environment node */
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function lockManager(initiallyBusy = false) {
  let busy = initiallyBusy;
  const request = jest.fn(async (
    name: string,
    options: { mode: string; ifAvailable: boolean },
    callback: (lock: { name: string } | null) => Promise<void>,
  ) => {
    expect(options).toEqual({ mode: 'exclusive', ifAvailable: true });
    if (busy) return callback(null);
    busy = true;
    try {
      return await callback({ name });
    } finally {
      busy = false;
    }
  });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request } } });
  return { request, makeAvailable: () => { busy = false; }, isBusy: () => busy };
}

function loadAccess() {
  let access!: typeof import('../../src/database/database-access.web');
  jest.isolateModules(() => { access = require('../../src/database/database-access.web'); });
  return access;
}

afterEach(() => {
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
});

test('takes one origin-wide lease and keeps it for the SQLite worker lifetime', async () => {
  const manager = lockManager();
  const access = loadAccess();
  const first = access.acquireDatabaseAccess();
  expect(access.acquireDatabaseAccess()).toBe(first);
  await first;
  expect(manager.request).toHaveBeenCalledTimes(1);
  expect(manager.request.mock.calls[0][0]).toBe(access.DATABASE_ACCESS_LOCK);
  expect(manager.isBusy()).toBe(true);

  // A separate module instance represents another tab, even for another user.
  const otherTab = loadAccess();
  await expect(otherTab.acquireDatabaseAccess()).rejects.toMatchObject({ kind: 'busy' });
  await expect(otherTab.acquireDatabaseAccess()).rejects.toThrow('Close the other Coconut tabs');
});

test('a second tab can retry once the owning browser context is gone', async () => {
  const manager = lockManager(true);
  const access = loadAccess();
  await expect(access.acquireDatabaseAccess()).rejects.toMatchObject({ kind: 'busy' });
  manager.makeAvailable();
  await expect(access.acquireDatabaseAccess()).resolves.toBeUndefined();
  expect(manager.request).toHaveBeenCalledTimes(2);
  expect(manager.isBusy()).toBe(true);
});

test.each([
  'Error: Invalid VFS state',
  "NoModificationAllowedError: Failed to execute 'createSyncAccessHandle'",
  'Access Handles cannot be created if there is another open Access Handle',
])('a failed VFS initialization requires reload, not another open in the damaged worker: %s', async (message) => {
  const manager = lockManager();
  const access = loadAccess();
  await access.acquireDatabaseAccess();
  const failure = access.normalizeDatabaseOpenError(new Error(message));
  expect(failure).toMatchObject({ kind: 'restart' });
  await expect(access.acquireDatabaseAccess()).rejects.toBe(failure);
  expect(manager.request).toHaveBeenCalledTimes(1);
  expect(manager.isBusy()).toBe(true);
});

test('unrelated errors retain their identity and do not poison browser storage access', async () => {
  lockManager();
  const access = loadAccess();
  const error = new Error('Network unavailable');
  expect(access.normalizeDatabaseOpenError(error)).toBe(error);
  await expect(access.acquireDatabaseAccess()).resolves.toBeUndefined();
});

test('browsers without Web Locks fail safely instead of competing for file handles', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  await expect(loadAccess().acquireDatabaseAccess()).rejects.toMatchObject({ kind: 'unsupported' });
});
