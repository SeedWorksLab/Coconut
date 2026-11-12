/// <reference types="node" />

import { DatabaseSync } from 'node:sqlite';
import { DEFAULT_SYNC_STATE } from '../../src/database/syncState';
import { ensureSyncIdentity } from '../../src/sync/identity';

function makeDb() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return {
    raw,
    api: {
      getFirstAsync: async <T>(sql: string, params: string[]) =>
        (raw.prepare(sql).get(...params) as T | undefined) ?? null,
      runAsync: async (sql: string, params: string[]) => raw.prepare(sql).run(...params),
    },
  };
}

describe('local dataset cloud identity', () => {
  it('accepts a repeat sync to the original account and project', async () => {
    const { raw, api } = makeDb();
    await ensureSyncIdentity(api as never, DEFAULT_SYNC_STATE, 'user-1');
    await expect(ensureSyncIdentity(api as never, DEFAULT_SYNC_STATE, 'user-1')).resolves.toBeUndefined();
    raw.close();
  });

  it('blocks silently uploading the same data to a different account', async () => {
    const { raw, api } = makeDb();
    await ensureSyncIdentity(api as never, DEFAULT_SYNC_STATE, 'user-1');
    await expect(ensureSyncIdentity(api as never, DEFAULT_SYNC_STATE, 'user-2')).rejects.toThrow('bound to another');
    raw.close();
  });

  it('blocks silently uploading the same data to a different project', async () => {
    const { raw, api } = makeDb();
    await ensureSyncIdentity(api as never, DEFAULT_SYNC_STATE, 'user-1');
    await expect(ensureSyncIdentity(api as never, {
      ...DEFAULT_SYNC_STATE,
      supabaseUrl: 'https://example.supabase.co', apiKey: 'sb_publishable_example',
    }, 'user-1')).rejects.toThrow('bound to another');
    raw.close();
  });
});
