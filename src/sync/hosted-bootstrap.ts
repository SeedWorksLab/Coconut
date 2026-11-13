import type { User } from '@supabase/supabase-js';
import { getDatabase } from '../database/database';
import { setHostedDatabaseUser } from '../database/database-name';
import { getMeta, setMeta } from '../database/syncMeta';
import { getSyncState, updateSyncState } from '../database/syncState';
import { reconcileSharedTransactions } from '../database/sharedLinking';
import { ensureSyncIdentity } from './identity';
import { pullChanges } from './pull';
import { pullSharedChanges } from './shared';
import { getClient } from './supabase';
import { EPOCH, nowIso } from './time';
import { SHARED_LAST_SYNC_KEY, syncPersonalChanges, syncSharedChanges } from './engine';

const BOOTSTRAP_KEY = 'hosted_web_initial_pull_complete';

export async function openHostedAccountCache(user: User, online: boolean): Promise<void> {
  setHostedDatabaseUser(user.id);
  const db = await getDatabase();
  const state = await getSyncState(db);
  if (state.supabaseUrl || state.apiKey) {
    throw new Error('This cache uses a different cloud project. It cannot be opened on the hosted site.');
  }
  await ensureSyncIdentity(db, state, user.id);
  if (await getMeta(BOOTSTRAP_KEY, db)) {
    if (!state.enabled) {
      await updateSyncState({ enabled: true }, db);
    }
    if (online) {
      // Reconcile remote changes before app startup can auto-close a stale local month.
      if (!await syncSharedChanges(db) || !await syncPersonalChanges(db)) {
        throw new Error('Could not refresh your account before opening Coconut. Try again.');
      }
    }
    return;
  }
  if (!online) {
    throw new Error('Connect to the internet once to download this account’s Coconut data.');
  }

  const client = await getClient();
  const startedAt = nowIso();
  await pullSharedChanges(client, db);
  await pullChanges(client, db, EPOCH);
  await reconcileSharedTransactions(user.id, db);
  await setMeta(SHARED_LAST_SYNC_KEY, startedAt, db);
  await updateSyncState({
    enabled: true,
    lastSyncAt: startedAt,
    lastSyncStatus: 'success',
    lastSyncError: null,
  }, db);
  await setMeta(BOOTSTRAP_KEY, '1', db);
}
