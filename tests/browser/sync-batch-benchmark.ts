import { openDatabaseAsync } from 'expo-sqlite';
import { applySyncBatch } from '../../src/database/sync-batch.web';
import { coordinateDatabase } from '../../src/database/database-coordination.web';

declare global {
  interface Window {
    syncBatchBenchmark: Promise<{
      rows: number;
      baselineMs: number;
      batchedMs: number;
      rollbackPreserved: boolean;
      guardRestored: boolean;
      localEditsCaptured: boolean;
      concurrentEditQueued: boolean;
    }>;
  }
}

window.syncBatchBenchmark = (async () => {
  if (typeof SharedArrayBuffer !== 'undefined' || crossOriginIsolated) {
    throw new Error('This regression check must run without cross-origin isolation');
  }
  const db = coordinateDatabase(await openDatabaseAsync(':memory:'));
  try {
    await db.execAsync(`CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT);
      INSERT INTO sync_meta VALUES ('pull_in_progress', '1');
      CREATE TABLE benchmark_rows (id INTEGER PRIMARY KEY, amount_cents INTEGER NOT NULL);
      CREATE TABLE benchmark_outbox (id INTEGER);
      CREATE TRIGGER capture_benchmark_insert AFTER INSERT ON benchmark_rows
      WHEN (SELECT value FROM sync_meta WHERE key = 'pull_in_progress') = '0'
      BEGIN INSERT INTO benchmark_outbox VALUES (NEW.id); END;`);
    const rows = 1000;
    let start = performance.now();
    for (let id = 0; id < rows; id++) {
      await db.getFirstAsync('SELECT id FROM benchmark_rows WHERE id = ?', [id]);
      await db.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [id, 12345]);
    }
    const baselineMs = performance.now() - start;
    await db.execAsync("DELETE FROM benchmark_rows; UPDATE sync_meta SET value = '0' WHERE key = 'pull_in_progress'");
    start = performance.now();
    for (let offset = 0; offset < rows; offset += 100) {
      await applySyncBatch(db, async (batch) => {
        for (let id = offset; id < offset + 100; id++) {
          await batch.getFirstAsync('SELECT id FROM benchmark_rows WHERE id = ?', [id]);
          await batch.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [id, 12345]);
        }
      });
    }
    const batchedMs = performance.now() - start;
    await applySyncBatch(db, async (batch) => {
      for (let index = 0; index < 100; index++) {
        const row = await batch.getFirstAsync<{ amount_cents: number }>(
          'SELECT amount_cents FROM benchmark_rows WHERE id = ?', [index]);
        if (row?.amount_cents !== 12345) throw new Error('Prepared statement returned the wrong row');
      }
    });
    let rolledBack = false;
    try {
      await applySyncBatch(db, async (batch) => {
        await batch.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [rows, 12345]);
        await batch.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [0, 12345]);
      });
    } catch {
      rolledBack = true;
    }
    let concurrentEdit: Promise<unknown> | undefined;
    let concurrentEditCompleted = false;
    let concurrentEditQueued = false;
    await applySyncBatch(db, async (batch) => {
      await batch.getFirstAsync('SELECT id FROM benchmark_rows WHERE id = ?', [0]);
      concurrentEdit = db.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [rows + 2, 12345])
        .then(() => { concurrentEditCompleted = true; });
      await batch.getFirstAsync('SELECT id FROM benchmark_rows WHERE id = ?', [0]);
      concurrentEditQueued = !concurrentEditCompleted;
    });
    await concurrentEdit;
    const queuedOutbox = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM benchmark_outbox');
    concurrentEditQueued = concurrentEditQueued && concurrentEditCompleted && queuedOutbox?.count === 1;
    await db.runAsync('DELETE FROM benchmark_rows WHERE id = ?', [rows + 2]);
    await db.runAsync('DELETE FROM benchmark_outbox');
    const count = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM benchmark_rows');
    const guard = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_meta WHERE key = 'pull_in_progress'");
    const imported = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM benchmark_outbox');
    await db.runAsync('INSERT INTO benchmark_rows VALUES (?, ?)', [rows + 1, 12345]);
    const local = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM benchmark_outbox');
    return {
      rows: count?.count ?? 0, baselineMs, batchedMs, concurrentEditQueued,
      rollbackPreserved: rolledBack && count?.count === rows,
      guardRestored: guard?.value === '0',
      localEditsCaptured: imported?.count === 0 && local?.count === 1,
    };
  } finally {
    await db.closeAsync();
  }
})();
