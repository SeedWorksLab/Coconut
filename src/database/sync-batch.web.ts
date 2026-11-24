import type { SQLiteBindValue, SQLiteDatabase, SQLiteRunResult, SQLiteStatement } from 'expo-sqlite';
import { withSerializedDatabase } from './database-coordination.web';

export interface SyncApplyDatabase {
  getFirstAsync<T>(sql: string, params?: SQLiteBindValue[]): Promise<T | null>;
  getAllAsync<T>(sql: string, params?: SQLiteBindValue[]): Promise<T[]>;
  runAsync(sql: string, params?: SQLiteBindValue[]): Promise<SQLiteRunResult>;
}

export async function applySyncBatch<T>(
  db: SQLiteDatabase,
  apply: (batch: SyncApplyDatabase) => Promise<T>,
): Promise<T> {
  return withSerializedDatabase(db, (connection) => applyBatch(connection, apply));
}

async function applyBatch<T>(
  connection: SQLiteDatabase,
  apply: (batch: SyncApplyDatabase) => Promise<T>,
): Promise<T> {
  if (await connection.isInTransactionAsync()) {
    throw new Error('A local database operation is still in progress. Sync will retry.');
  }
  const statements = new Map<string, SQLiteStatement>();
  const statement = async (sql: string) => {
    let prepared = statements.get(sql);
    if (!prepared) {
      prepared = await connection.prepareAsync(sql);
      statements.set(sql, prepared);
    }
    return prepared;
  };
  const batch: SyncApplyDatabase = {
    getFirstAsync: async <R>(sql: string, params: SQLiteBindValue[] = []) =>
      (await (await statement(sql)).executeAsync<R>(params)).getFirstAsync(),
    getAllAsync: async <R>(sql: string, params: SQLiteBindValue[] = []) =>
      (await (await statement(sql)).executeAsync<R>(params)).getAllAsync(),
    runAsync: async (sql, params = []) => (await statement(sql)).executeAsync(params),
  };
  let began = false;
  try {
    await connection.execAsync('BEGIN IMMEDIATE');
    began = true;
    await batch.runAsync(`INSERT INTO sync_meta (key, value) VALUES ('pull_in_progress', '1')
      ON CONFLICT(key) DO UPDATE SET value = '1'`);
    const result = await apply(batch);
    await batch.runAsync("UPDATE sync_meta SET value = '0' WHERE key = 'pull_in_progress'");
    await connection.execAsync('COMMIT');
    began = false;
    return result;
  } catch (error) {
    if (began) await connection.execAsync('ROLLBACK');
    throw error;
  } finally {
    for (const prepared of statements.values()) await prepared.finalizeAsync();
  }
}
