import { DatabaseSync } from 'node:sqlite';
import { acknowledgeSyncRow } from '../../src/database/sync-outbox';

it('retains a newer edit even when it shares the uploaded snapshot’s timestamp', async () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec(`CREATE TABLE sync_outbox (table_name TEXT, row_key TEXT);
    CREATE TABLE rows (uuid TEXT, updated_at TEXT, value TEXT);
    INSERT INTO sync_outbox VALUES ('rows', 'row-1');
    INSERT INTO rows VALUES ('row-1', 'same-timestamp', 'new edit');`);
  const db = {
    runAsync: async (sql: string, params: Parameters<ReturnType<DatabaseSync['prepare']>['run']>) =>
      raw.prepare(sql).run(...params),
  };
  await acknowledgeSyncRow(db as never, 'rows', 'uuid', 'row-1', {
    uuid: 'row-1', updated_at: 'same-timestamp', value: 'uploaded value',
  });
  expect(raw.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get()?.count).toBe(1);
  await acknowledgeSyncRow(db as never, 'rows', 'uuid', 'row-1', {
    uuid: 'row-1', updated_at: 'same-timestamp', value: 'new edit',
  });
  expect(raw.prepare('SELECT COUNT(*) AS count FROM sync_outbox').get()?.count).toBe(0);
  raw.close();
});
