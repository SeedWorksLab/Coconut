import type { SQLiteDatabase } from 'expo-sqlite';
import { resolveCloudConfig } from '../config/cloud';
import type { SyncState } from '../models';
import { getMeta, setMeta } from '../database/syncMeta';

const SYNC_IDENTITY_KEY = 'sync_identity_binding';

export async function ensureSyncIdentity(
  db: SQLiteDatabase,
  state: SyncState,
  userId: string
): Promise<void> {
  const identity = JSON.stringify({ url: resolveCloudConfig(state).supabaseUrl, userId });
  const existing = await getMeta(SYNC_IDENTITY_KEY, db);
  if (existing !== null && existing !== identity) {
    throw new Error(
      'This local dataset is bound to another cloud account or project. Sync was stopped to protect your data.'
    );
  }
  if (existing === null) {
    await setMeta(SYNC_IDENTITY_KEY, identity, db);
  }
}
