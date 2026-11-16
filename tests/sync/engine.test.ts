import type { SQLiteDatabase } from 'expo-sqlite';
import { syncPersonalChanges, syncSharedChanges, syncNow } from '../../src/sync/engine';
import { pushChanges } from '../../src/sync/push';
import { pullChanges } from '../../src/sync/pull';
import { pullSharedChanges } from '../../src/sync/shared';
import { reconcileSharedTransactions } from '../../src/database/sharedLinking';

jest.mock('../../src/database/syncState', () => ({
  getSyncState: jest.fn().mockResolvedValue({ enabled: true, lastSyncAt: null }),
  updateSyncState: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/database/syncMeta', () => ({
  getMeta: jest.fn().mockResolvedValue(null),
  setMeta: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/database/sharedLinking', () => ({
  reconcileSharedTransactions: jest.fn().mockResolvedValue({ removed: 0 }),
}));
jest.mock('../../src/sync/supabase', () => ({
  getSupabaseSessionUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
  getClient: jest.fn().mockResolvedValue({}),
  SyncAuthError: class SyncAuthError extends Error {},
}));
jest.mock('../../src/sync/identity', () => ({
  ensureSyncIdentity: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/sync/usage-report', () => ({
  reportSeedWorksUsage: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../src/sync/push', () => ({
  pushChanges: jest.fn(),
  pushSettings: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../src/sync/pull', () => ({
  pullChanges: jest.fn().mockResolvedValue({ pulled: 0, tombstones: 0, settingsPulled: 0 }),
  pullSettings: jest.fn().mockResolvedValue(0),
}));
jest.mock('../../src/sync/shared', () => ({
  pushSharedChanges: jest.fn().mockResolvedValue({ pushed: 0, tombstones: 0 }),
  pullSharedChanges: jest.fn().mockResolvedValue({ pulled: 0, tombstones: 0 }),
}));

const db = {} as SQLiteDatabase;
const pushed = { pushed: 1, tombstones: 0, settingsPushed: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(pushChanges).mockReset().mockResolvedValue(pushed);
});

it('reconciles local shared mirrors before an upload can fail', async () => {
  jest.mocked(pushChanges).mockImplementationOnce(async () => {
    expect(reconcileSharedTransactions).toHaveBeenCalledWith('user-1', db);
    throw new Error('Upload failed');
  });
  await expect(syncPersonalChanges(db)).rejects.toThrow('Upload failed');
  expect(pullChanges).not.toHaveBeenCalled();

  await expect(syncPersonalChanges(db)).resolves.toMatchObject({ pushed });
  expect(pullChanges).toHaveBeenCalled();
});

it.each(['shared', 'full'] as const)('allows a waiting %s sync to proceed after a failed personal upload', async (mode) => {
  let rejectUpload!: (error: Error) => void;
  let enteredUpload!: () => void;
  const entered = new Promise<void>((resolve) => { enteredUpload = resolve; });
  jest.mocked(pushChanges).mockImplementationOnce(() => {
    enteredUpload();
    return new Promise((_, reject) => { rejectUpload = reject; });
  });
  const personal = syncPersonalChanges(db);
  const failed = expect(personal).rejects.toThrow('Upload failed');
  await entered;
  const waiting = mode === 'shared' ? syncSharedChanges(db) : syncNow(db);
  await Promise.resolve();
  rejectUpload(new Error('Upload failed'));

  await failed;
  await expect(waiting).resolves.not.toBeNull();
  expect(pullSharedChanges).toHaveBeenCalled();
  expect(reconcileSharedTransactions).toHaveBeenCalledWith('user-1', db);
});
