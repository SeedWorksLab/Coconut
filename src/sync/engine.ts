import type { SQLiteDatabase } from 'expo-sqlite';

import { getDatabase } from '../database/database';
import { getSyncState, updateSyncState } from '../database/syncState';
import { getMeta, setMeta } from '../database/syncMeta';
import { reconcileSharedTransactions } from '../database/sharedLinking';
import { pushChanges, pushSettings, type PushResult } from './push';
import { pullChanges, pullSettings, type PullResult } from './pull';
import { pushSharedChanges, pullSharedChanges, type SharedPushResult, type SharedPullResult } from './shared';
import { getSupabaseSessionUser, getClient, SyncAuthError } from './supabase';
import { EPOCH, nowIso, pullSince } from './time';

/** Watermark for the incremental shared-only sync, kept in `sync_meta`. */
export const SHARED_LAST_SYNC_KEY = 'shared_last_sync_at';

export interface SyncOutcome {
  pushed: PushResult;
  pulled: PullResult;
  sharedPushed: SharedPushResult;
  sharedPulled: SharedPullResult;
}

export interface SharedQuickSyncResult {
  pushed: SharedPushResult;
  pulled: SharedPullResult;
}

export interface PersonalQuickSyncResult {
  pushed: PushResult;
  pulled: PullResult;
}

let syncInProgress: Promise<SyncOutcome | null> | null = null;
let sharedSyncInProgress: Promise<SharedQuickSyncResult | null> | null = null;
let personalSyncInProgress: Promise<PersonalQuickSyncResult | null> | null = null;

export async function isSyncRunning(): Promise<boolean> {
  return syncInProgress !== null;
}

export async function isSharedSyncRunning(): Promise<boolean> {
  return sharedSyncInProgress !== null;
}

/**
 * Background, low-cost sync of just the shared tables.
 *
 * Pushes only the local outbox (no whole-database re-seed) and pulls only rows
 * changed since the last shared sync. This is the sync that runs on app open
 * and on pull-to-refresh on the shared tab; the heavy full `syncNow` stays
 * available in Settings for emergencies (re-seeding the remote, repairing
 * divergence, retrying failed migrations).
 */
export async function syncSharedChanges(db?: SQLiteDatabase): Promise<SharedQuickSyncResult | null> {
  if (sharedSyncInProgress) {
    return sharedSyncInProgress;
  }
  if (await isSyncRunning()) {
    return null;
  }
  if (personalSyncInProgress) {
    await personalSyncInProgress;
  }
  sharedSyncInProgress = (async () => {
    const database = db ?? (await getDatabase());
    const state = await getSyncState(database);
    if (!state.enabled) {
      return null;
    }
    const user = await getSupabaseSessionUser();
    if (!user) {
      return null;
    }
    try {
      // Capture the watermark before touching the network. Anything another
      // device writes while this sync runs must be newer than it, otherwise a
      // "now" taken after the pull would skip it forever.
      const startedAt = nowIso();
      await updateSyncState({ lastSyncStatus: 'syncing' }, database);
      const client = await getClient();
      const pushed = await pushSharedChanges(client, database, user.id, { changesOnly: true });
      const since = await getMeta(SHARED_LAST_SYNC_KEY, database);
      const pulled = await pullSharedChanges(
        client,
        database,
        since ? pullSince(since) : undefined
      );
      await reconcileSharedTransactions(user.id, database);
      // The username is an account identity used by shared spaces, so it travels
      // with the lightweight sync instead of waiting for a full personal sync.
      await pushSettings(client, database, user.id, ['username']);
      await pullSettings(database, client, EPOCH, ['username']);
      await setMeta(SHARED_LAST_SYNC_KEY, startedAt, database);
      await updateSyncState({ lastSyncStatus: 'success', lastSyncError: null }, database);
      return { pushed, pulled };
    } catch (error) {
      if (error instanceof SyncAuthError) {
        return null;
      }
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await updateSyncState({ lastSyncStatus: 'error', lastSyncError: message }, database);
      throw new SyncError(message);
    }
  })();
  try {
    return await sharedSyncInProgress;
  } finally {
    sharedSyncInProgress = null;
  }
}

/**
 * Background, low-cost sync of the personal tables (the dataset the user edits
 * on this device). Only the local outbox is pushed and only remote changes since
 * the last personal sync are pulled. The full `syncNow` remains the repair path
 * that re-seeds the whole database.
 */
export async function syncPersonalChanges(
  db?: SQLiteDatabase
): Promise<PersonalQuickSyncResult | null> {
  if (personalSyncInProgress) {
    return personalSyncInProgress;
  }
  if (await isSyncRunning()) {
    return null;
  }
  if (sharedSyncInProgress) {
    await sharedSyncInProgress;
  }
  personalSyncInProgress = (async () => {
    const database = db ?? (await getDatabase());
    const state = await getSyncState(database);
    if (!state.enabled) {
      return null;
    }
    const user = await getSupabaseSessionUser();
    if (!user) {
      return null;
    }
    const startedAt = nowIso();
    try {
      await updateSyncState({ lastSyncStatus: 'syncing' }, database);
      const client = await getClient();
      const pushed = await pushChanges(client, database, false);
      const pulled = await pullChanges(
        client,
        database,
        pullSince(state.lastSyncAt)
      );
      await reconcileSharedTransactions(user.id, database);
      await updateSyncState(
        {
          lastSyncAt: startedAt,
          lastSyncStatus: 'success',
          lastSyncError: null,
        },
        database
      );
      return { pushed, pulled };
    } catch (error) {
      if (error instanceof SyncAuthError) {
        return null;
      }
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await updateSyncState(
        { lastSyncStatus: 'error', lastSyncError: message },
        database
      );
      throw new SyncError(message);
    }
  })();
  try {
    return await personalSyncInProgress;
  } finally {
    personalSyncInProgress = null;
  }
}

export async function syncNow(db?: SQLiteDatabase): Promise<SyncOutcome | null> {
  if (syncInProgress) {
    return syncInProgress;
  }
  if (sharedSyncInProgress) {
    await sharedSyncInProgress;
  }
  if (personalSyncInProgress) {
    await personalSyncInProgress;
  }
  syncInProgress = (async () => {
    const database = db ?? (await getDatabase());
    const state = await getSyncState(database);
    if (!state.enabled) {
      return null;
    }
    const user = await getSupabaseSessionUser();
    if (!user) {
      return null;
    }
    try {
      // Captured before the first network call: the watermark must never move
      // past a row another device writes while this sync is in flight.
      const startedAt = nowIso();
      await updateSyncState({ lastSyncStatus: 'syncing' }, database);
      const client = await getClient();
      // Always re-sync the whole local database so rows that existed before
      // change-capture triggers were installed still get uploaded.
      const sharedPushed = await pushSharedChanges(client, database, user.id);
      const sharedPulled = await pullSharedChanges(client, database);
      await reconcileSharedTransactions(user.id, database);
      const pushResult = await pushChanges(client, database, true);
      // The full sync is also the repair path: re-read every personal row, not
      // just the ones since the watermark, so a historically skipped row (or a
      // FK nulled by an older build) is reconciled. This dataset is small enough
      // for a manual full sync to be worth the certainty.
      const pullResult = await pullChanges(client, database, EPOCH);
      // Personal rows are pulled after the shared ones, and a shared mirror is
      // itself a synced transaction. A device that placed the mirror in another
      // month would otherwise have that month applied here with no check, so the
      // mirrors are re-derived once more to put each one back in the month its
      // expense belongs to.
      await reconcileSharedTransactions(user.id, database);
      await setMeta(SHARED_LAST_SYNC_KEY, startedAt, database);
      await updateSyncState(
        {
          lastSyncAt: startedAt,
          lastSyncStatus: 'success',
          lastSyncError: null,
        },
        database
      );
      return { pushed: pushResult, pulled: pullResult, sharedPushed, sharedPulled };
    } catch (error) {
      if (error instanceof SyncAuthError) {
        return null;
      }
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      await updateSyncState({ lastSyncStatus: 'error', lastSyncError: message });
      throw new SyncError(message);
    }
  })();
  try {
    const outcome = await syncInProgress;
    return outcome;
  } finally {
    syncInProgress = null;
  }
}

export class SyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SyncError';
  }
}