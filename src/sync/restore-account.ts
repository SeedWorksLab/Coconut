import { getDatabase } from '../database/database';
import { getSyncState, updateSyncState } from '../database/syncState';
import { reconcileSharedTransactions } from '../database/sharedLinking';
import { setMeta } from '../database/syncMeta';
import { SHARED_LAST_SYNC_KEY } from './engine';
import { ensureSyncIdentity } from './identity';
import { pullChanges } from './pull';
import { pullSharedChanges } from './shared';
import { getClient, getSupabaseUserId, SyncAuthError } from './supabase';
import { EPOCH, nowIso } from './time';
import { reportSeedWorksUsage } from './usage-report';

export async function restoreAccountData(): Promise<void> {
  const db = await getDatabase();
  const state = await getSyncState(db);
  const userId = await getSupabaseUserId();
  if (!userId) throw new SyncAuthError('You must be signed in to restore your data.');
  await ensureSyncIdentity(db, state, userId);
  const client = await getClient();
  const startedAt = nowIso();
  // Restore before enabling background uploads: a fresh installation must not
  // push its defaults or newly materialized rows over the account it is opening.
  await pullSharedChanges(client, db);
  await pullChanges(client, db, EPOCH);
  await reconcileSharedTransactions(userId, db);
  await setMeta(SHARED_LAST_SYNC_KEY, startedAt, db);
  await updateSyncState({
    enabled: true,
    lastSyncAt: startedAt,
    lastSyncStatus: 'success',
    lastSyncError: null,
  }, db);
  await reportSeedWorksUsage(db, client).catch(() => undefined);
}
