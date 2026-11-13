import { openHostedAccountCache } from '../../src/sync/hosted-bootstrap';
import { getDatabase } from '../../src/database/database';
import { setHostedDatabaseUser } from '../../src/database/database-name';
import { getMeta, setMeta } from '../../src/database/syncMeta';
import { getSyncState, updateSyncState } from '../../src/database/syncState';
import { ensureSyncIdentity } from '../../src/sync/identity';
import { pullChanges } from '../../src/sync/pull';
import { pullSharedChanges } from '../../src/sync/shared';
import { getClient } from '../../src/sync/supabase';
import { reconcileSharedTransactions } from '../../src/database/sharedLinking';
import { syncPersonalChanges, syncSharedChanges } from '../../src/sync/engine';

jest.mock('../../src/database/database', () => ({ getDatabase: jest.fn() }));
jest.mock('../../src/database/database-name', () => ({ setHostedDatabaseUser: jest.fn() }));
jest.mock('../../src/database/syncMeta', () => ({ getMeta: jest.fn(), setMeta: jest.fn() }));
jest.mock('../../src/database/syncState', () => ({
  getSyncState: jest.fn(), updateSyncState: jest.fn(),
}));
jest.mock('../../src/database/sharedLinking', () => ({ reconcileSharedTransactions: jest.fn() }));
jest.mock('../../src/sync/identity', () => ({ ensureSyncIdentity: jest.fn() }));
jest.mock('../../src/sync/pull', () => ({ pullChanges: jest.fn() }));
jest.mock('../../src/sync/shared', () => ({ pullSharedChanges: jest.fn() }));
jest.mock('../../src/sync/supabase', () => ({ getClient: jest.fn() }));
jest.mock('../../src/sync/engine', () => ({
  SHARED_LAST_SYNC_KEY: 'shared_last_sync_at',
  syncPersonalChanges: jest.fn(),
  syncSharedChanges: jest.fn(),
}));

const db = { name: 'per-user-cache' };
const client = { name: 'official-cloud' };
const user = { id: '11111111-1111-4111-8111-111111111111' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getDatabase).mockResolvedValue(db as never);
  jest.mocked(getSyncState).mockResolvedValue({
    enabled: false, supabaseUrl: null, apiKey: null,
    lastSyncAt: null, lastSyncStatus: null, lastSyncError: null,
  });
  jest.mocked(getMeta).mockResolvedValue(null);
  jest.mocked(getClient).mockResolvedValue(client as never);
  jest.mocked(syncSharedChanges).mockResolvedValue({ pushed: {}, pulled: {} } as never);
  jest.mocked(syncPersonalChanges).mockResolvedValue({ pushed: {}, pulled: {} } as never);
});

test('first use does not open without connectivity or push local defaults', async () => {
  await expect(openHostedAccountCache(user as never, false)).rejects.toThrow('Connect to the internet');
  expect(setHostedDatabaseUser).toHaveBeenCalledWith(user.id);
  expect(ensureSyncIdentity).toHaveBeenCalledWith(db, expect.any(Object), user.id);
  expect(getClient).not.toHaveBeenCalled();
  expect(updateSyncState).not.toHaveBeenCalled();
  expect(setMeta).not.toHaveBeenCalled();
});

test('first use pulls shared and personal rows before enabling the cache', async () => {
  await openHostedAccountCache(user as never, true);
  expect(pullSharedChanges).toHaveBeenCalledWith(client, db);
  expect(pullChanges).toHaveBeenCalledWith(client, db, '1970-01-01T00:00:00.000Z');
  expect(reconcileSharedTransactions).toHaveBeenCalledWith(user.id, db);
  expect(updateSyncState).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }), db);
  expect(setMeta).toHaveBeenCalledWith('hosted_web_initial_pull_complete', '1', db);
  expect(jest.mocked(updateSyncState).mock.invocationCallOrder[0])
    .toBeGreaterThan(jest.mocked(pullChanges).mock.invocationCallOrder[0]);
});

test('interrupted pull cannot mark the cache as ready to upload', async () => {
  jest.mocked(pullChanges).mockRejectedValueOnce(new Error('offline'));
  await expect(openHostedAccountCache(user as never, true)).rejects.toThrow('offline');
  expect(updateSyncState).not.toHaveBeenCalled();
  expect(setMeta).not.toHaveBeenCalled();
});

test('returning offline user uses only a completed, bound cache', async () => {
  jest.mocked(getMeta).mockResolvedValue('1');
  await openHostedAccountCache(user as never, false);
  expect(getClient).not.toHaveBeenCalled();
  expect(updateSyncState).toHaveBeenCalledWith({ enabled: true }, db);
  expect(syncPersonalChanges).not.toHaveBeenCalled();
});

test('returning online user refreshes before opening a potentially stale month', async () => {
  jest.mocked(getMeta).mockResolvedValue('1');
  await openHostedAccountCache(user as never, true);
  expect(syncSharedChanges).toHaveBeenCalledWith(db);
  expect(syncPersonalChanges).toHaveBeenCalledWith(db);
  expect(jest.mocked(syncPersonalChanges).mock.invocationCallOrder[0])
    .toBeGreaterThan(jest.mocked(syncSharedChanges).mock.invocationCallOrder[0]);
});

test('a failed refresh keeps the cached app closed instead of changing financial history', async () => {
  jest.mocked(getMeta).mockResolvedValue('1');
  jest.mocked(syncPersonalChanges).mockRejectedValueOnce(new Error('offline'));
  await expect(openHostedAccountCache(user as never, true)).rejects.toThrow('offline');
});

test('custom cloud config is rejected before accessing the shared session', async () => {
  jest.mocked(getSyncState).mockResolvedValueOnce({
    enabled: true, supabaseUrl: 'https://another.example', apiKey: 'public',
    lastSyncAt: null, lastSyncStatus: null, lastSyncError: null,
  });
  await expect(openHostedAccountCache(user as never, true)).rejects.toThrow('different cloud project');
  expect(ensureSyncIdentity).not.toHaveBeenCalled();
  expect(getClient).not.toHaveBeenCalled();
});
