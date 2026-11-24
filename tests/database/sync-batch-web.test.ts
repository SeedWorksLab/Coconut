import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';
import { coordinateDatabase } from '../../src/database/database-coordination.web';
import { applySyncBatch } from '../../src/database/sync-batch.web';

type SqlParams = Parameters<ReturnType<DatabaseSync['prepare']>['get']>;

function fixture() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT);
    INSERT INTO sync_meta VALUES ('pull_in_progress', '0');
    CREATE TABLE entries (id INTEGER PRIMARY KEY, amount_cents INTEGER);
    CREATE TABLE outbox (id INTEGER);
    CREATE TRIGGER capture_insert AFTER INSERT ON entries
    WHEN (SELECT value FROM sync_meta WHERE key = 'pull_in_progress') = '0'
    BEGIN INSERT INTO outbox VALUES (NEW.id); END;`);
  const prepareAsync = jest.fn(async (sql: string) => {
    const statement = raw.prepare(sql);
    return {
      async executeAsync<T>(params: unknown[] = []) {
        if (/^\s*SELECT/i.test(sql)) {
          const rows = statement.all(...params as SqlParams) as T[];
          return { getFirstAsync: async () => rows[0] ?? null, getAllAsync: async () => rows };
        }
        const result = statement.run(...params as SqlParams);
        return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
      },
      finalizeAsync: jest.fn(async () => {}),
    };
  });
  const api = {
    isInTransactionAsync: async () => raw.isTransaction,
    execAsync: async (sql: string) => { raw.exec(sql); },
    runAsync: async (sql: string, params: unknown[] = []) => raw.prepare(sql).run(...params as SqlParams),
    prepareAsync,
    async withTransactionAsync(task: () => Promise<void>) {
      await this.execAsync('BEGIN');
      try {
        await task();
        await this.execAsync('COMMIT');
      } catch (error) {
        await this.execAsync('ROLLBACK');
        throw error;
      }
    },
  };
  return { raw, db: coordinateDatabase(api as unknown as SQLiteDatabase), prepareAsync };
}

describe('web sync apply without synchronous SQLite', () => {
  it('commits imports, reuses statements and queues local edits until capture is restored', async () => {
    const { raw, db, prepareAsync } = fixture();
    try {
      let edit: Promise<unknown> | undefined;
      let editDone = false;
      const result = await applySyncBatch(db, async (batch) => {
        await batch.runAsync('INSERT INTO entries VALUES (?, ?)', [1, 100]);
        edit = db.runAsync('INSERT INTO entries VALUES (?, ?)', [3, 300])
          .then(() => { editDone = true; });
        await batch.runAsync('INSERT INTO entries VALUES (?, ?)', [2, 200]);
        expect(editDone).toBe(false);
        expect(await batch.getAllAsync('SELECT id FROM entries ORDER BY id')).toEqual([{ id: 1 }, { id: 2 }]);
        expect(await batch.getFirstAsync('SELECT amount_cents FROM entries WHERE id = ?', [2]))
          .toEqual({ amount_cents: 200 });
        return 2;
      });
      await edit;
      expect(result).toBe(2);
      expect(raw.prepare('SELECT * FROM outbox').all()).toEqual([{ id: 3 }]);
      expect(prepareAsync.mock.calls.filter(([sql]) => sql === 'INSERT INTO entries VALUES (?, ?)')).toHaveLength(1);
      expect(raw.prepare('SELECT value FROM sync_meta').get()).toEqual({ value: '0' });
    } finally {
      raw.close();
    }
  });

  it('rolls back failed imports and allows later edits and batches', async () => {
    const { raw, db } = fixture();
    try {
      await expect(applySyncBatch(db, async (batch) => {
        await batch.runAsync('INSERT INTO entries VALUES (?, ?)', [1, 100]);
        await batch.runAsync('INSERT INTO entries VALUES (?, ?)', [1, 200]);
      })).rejects.toThrow();
      expect(raw.prepare('SELECT * FROM entries').all()).toEqual([]);
      expect(raw.prepare('SELECT value FROM sync_meta').get()).toEqual({ value: '0' });
      await db.runAsync('INSERT INTO entries VALUES (?, ?)', [2, 200]);
      await applySyncBatch(db, async (batch) => {
        await batch.runAsync('INSERT INTO entries VALUES (?, ?)', [3, 300]);
      });
      expect(raw.prepare('SELECT * FROM outbox').all()).toEqual([{ id: 2 }]);
    } finally {
      raw.close();
    }
  });

  it('does not enter or roll back an existing local transaction', async () => {
    const { raw, db } = fixture();
    try {
      await db.withTransactionAsync(async () => {
        await db.runAsync('INSERT INTO entries VALUES (?, ?)', [1, 100]);
        await expect(applySyncBatch(db, async () => {})).rejects.toThrow('Sync will retry');
        expect(raw.isTransaction).toBe(true);
      });
      expect(raw.prepare('SELECT * FROM entries').all()).toEqual([{ id: 1, amount_cents: 100 }]);
    } finally {
      raw.close();
    }
  });
});
