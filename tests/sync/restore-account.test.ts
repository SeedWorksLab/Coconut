import { restoreAccountData } from '../../src/sync/restore-account';
import { getDatabase } from '../../src/database/database';
import { updateSyncState } from '../../src/database/syncState';
import { pullChanges } from '../../src/sync/pull';
import { pullSharedChanges } from '../../src/sync/shared';
import { ensureSyncIdentity } from '../../src/sync/identity';
import { getSupabaseUserId } from '../../src/sync/supabase';

jest.mock('../../src/database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../../src/database/syncState', () => ({
  getSyncState: jest.fn().mockResolvedValue({ enabled: false }),
  updateSyncState: jest.fn(),
}));
jest.mock('../../src/database/syncMeta', () => ({ setMeta: jest.fn() }));
jest.mock('../../src/database/sharedLinking', () => ({ reconcileSharedTransactions: jest.fn() }));
jest.mock('../../src/sync/engine', () => ({ SHARED_LAST_SYNC_KEY: 'shared_last_sync_at' }));
jest.mock('../../src/sync/identity', () => ({ ensureSyncIdentity: jest.fn() }));
jest.mock('../../src/sync/pull', () => ({ pullChanges: jest.fn() }));
jest.mock('../../src/sync/shared', () => ({ pullSharedChanges: jest.fn() }));
jest.mock('../../src/sync/supabase', () => ({
  getClient: jest.fn().mockResolvedValue({}),
  getSupabaseUserId: jest.fn(),
  SyncAuthError: class SyncAuthError extends Error {},
}));
jest.mock('../../src/sync/usage-report', () => ({
  reportSeedWorksUsage: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDatabase).mockResolvedValue({} as never);
  jest.mocked(getSupabaseUserId).mockResolvedValue('user-1');
});

test('downloads account data before enabling background uploads', async () => {
  await restoreAccountData();
  expect(pullSharedChanges).toHaveBeenCalled();
  expect(pullChanges).toHaveBeenCalledWith({}, {}, '1970-01-01T00:00:00.000Z');
  expect(updateSyncState).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }), {});
  expect(jest.mocked(updateSyncState).mock.invocationCallOrder[0])
    .toBeGreaterThan(jest.mocked(pullChanges).mock.invocationCallOrder[0]);
});

test('failed downloads do not enable uploads or report a successful restore', async () => {
  jest.mocked(pullChanges).mockRejectedValueOnce(new Error('Download failed'));
  await expect(restoreAccountData()).rejects.toThrow('Download failed');
  expect(updateSyncState).not.toHaveBeenCalled();
});

test('protects a dataset already bound to another account', async () => {
  jest.mocked(ensureSyncIdentity).mockRejectedValueOnce(new Error('Wrong account'));
  await expect(restoreAccountData()).rejects.toThrow('Wrong account');
  expect(pullChanges).not.toHaveBeenCalled();
  expect(updateSyncState).not.toHaveBeenCalled();
});

test('requires a signed-in account', async () => {
  jest.mocked(getSupabaseUserId).mockResolvedValueOnce(null);
  await expect(restoreAccountData()).rejects.toThrow('signed in');
  expect(pullChanges).not.toHaveBeenCalled();
});
