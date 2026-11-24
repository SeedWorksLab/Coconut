jest.mock('../../src/sync/shared', () => jest.requireActual('../../src/sync/shared.web'));
jest.mock('../../src/database/sync-batch.web', () => ({
  applySyncBatch: async (
    db: { runAsync: (sql: string) => Promise<unknown> },
    apply: (batch: unknown) => Promise<unknown>,
  ) => {
    await db.runAsync("INSERT INTO sync_meta (key, value) VALUES ('pull_in_progress', '1') ON CONFLICT(key) DO UPDATE SET value = '1'");
    try {
      return await apply(db);
    } finally {
      await db.runAsync("UPDATE sync_meta SET value = '0' WHERE key = 'pull_in_progress'");
    }
  },
}));

require('./shared.test');
