import type { SQLiteBindValue, SQLiteDatabase, SQLiteRunResult, SQLiteStatement } from 'expo-sqlite';

export interface SyncApplyDatabase {
  getFirstSync<T>(sql: string, params?: SQLiteBindValue[]): T | null;
  getAllSync<T>(sql: string, params?: SQLiteBindValue[]): T[];
  runSync(sql: string, params?: SQLiteBindValue[]): SQLiteRunResult;
}

export function applySyncBatch<T>(
  db: SQLiteDatabase,
  apply: (batch: SyncApplyDatabase) => T,
): T {
  if (db.isInTransactionSync()) {
    throw new Error('A local database operation is still in progress. Sync will retry.');
  }
  const statements = new Map<string, SQLiteStatement>();
  const statement = (sql: string) => {
    let prepared = statements.get(sql);
    if (!prepared) {
      prepared = db.prepareSync(sql);
      statements.set(sql, prepared);
    }
    return prepared;
  };
  const batch: SyncApplyDatabase = {
    getFirstSync: <R>(sql: string, params: SQLiteBindValue[] = []) =>
      statement(sql).executeSync<R>(params).getFirstSync(),
    getAllSync: <R>(sql: string, params: SQLiteBindValue[] = []) =>
      statement(sql).executeSync<R>(params).getAllSync(),
    runSync: (sql, params = []) => statement(sql).executeSync(params),
  };
  let result!: T;
  try {
    // No awaits or network inside this transaction: another local edit cannot
    // interleave while change capture is suppressed, including on web.
    db.withTransactionSync(() => {
      batch.runSync(`INSERT INTO sync_meta (key, value) VALUES ('pull_in_progress', '1')
        ON CONFLICT(key) DO UPDATE SET value = '1'`);
      result = apply(batch);
      batch.runSync("UPDATE sync_meta SET value = '0' WHERE key = 'pull_in_progress'");
    });
    return result;
  } finally {
    for (const prepared of statements.values()) prepared.finalizeSync();
  }
}
