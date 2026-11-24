import type { DatabaseSync } from 'node:sqlite';

type SqlParams = Parameters<ReturnType<DatabaseSync['prepare']>['get']>;

export function sqliteBatchFixture(raw: DatabaseSync) {
  return {
    isInTransactionSync: () => raw.isTransaction,
    withTransactionSync(task: () => void) {
      raw.exec('BEGIN');
      try {
        task();
        raw.exec('COMMIT');
      } catch (error) {
        raw.exec('ROLLBACK');
        throw error;
      }
    },
    prepareSync(sql: string) {
      const statement = raw.prepare(sql);
      return {
        executeSync<T>(params: unknown[] = []) {
          const args = params as SqlParams;
          if (/^\s*SELECT/i.test(sql)) {
            const rows = statement.all(...args) as T[];
            return { getFirstSync: () => rows[0] ?? null, getAllSync: () => rows };
          }
          const result = statement.run(...args);
          return { lastInsertRowId: Number(result.lastInsertRowid), changes: Number(result.changes) };
        },
        finalizeSync() {},
      };
    },
  };
}
