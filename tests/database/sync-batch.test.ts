import { DatabaseSync } from 'node:sqlite';
import { applySyncBatch } from '../../src/database/sync-batch';
import { sqliteBatchFixture } from '../sync/sqlite-batch-fixture';

it('reuses statements and commits captured changes atomically with the guard restored', () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT); CREATE TABLE rows (id INTEGER PRIMARY KEY, value TEXT);');
  const db = sqliteBatchFixture(raw);
  const prepare = jest.spyOn(db, 'prepareSync');
  applySyncBatch(db as never, (batch) => {
    for (let index = 0; index < 100; index++) {
      batch.runSync('INSERT INTO rows VALUES (?, ?)', [index, 'value']);
    }
    expect(batch.getFirstSync<{ value: string }>("SELECT value FROM sync_meta WHERE key = 'pull_in_progress'")?.value)
      .toBe('1');
  });
  expect(prepare.mock.calls.filter(([sql]) => sql === 'INSERT INTO rows VALUES (?, ?)')).toHaveLength(1);
  expect(raw.prepare('SELECT COUNT(*) AS count FROM rows').get()?.count).toBe(100);
  expect(raw.prepare("SELECT value FROM sync_meta WHERE key = 'pull_in_progress'").get()?.value).toBe('0');
  raw.close();
});

it('rolls back both rows and guard on failure, permitting a clean retry', () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec("CREATE TABLE sync_meta (key TEXT PRIMARY KEY, value TEXT); INSERT INTO sync_meta VALUES ('pull_in_progress', '0'); CREATE TABLE rows (id INTEGER PRIMARY KEY);");
  const db = sqliteBatchFixture(raw);
  expect(() => applySyncBatch(db as never, (batch) => {
    batch.runSync('INSERT INTO rows VALUES (1)');
    batch.runSync('INSERT INTO rows VALUES (1)');
  })).toThrow();
  expect(raw.prepare('SELECT COUNT(*) AS count FROM rows').get()?.count).toBe(0);
  expect(raw.prepare("SELECT value FROM sync_meta WHERE key = 'pull_in_progress'").get()?.value).toBe('0');
  applySyncBatch(db as never, (batch) => batch.runSync('INSERT INTO rows VALUES (1)'));
  expect(raw.prepare('SELECT COUNT(*) AS count FROM rows').get()?.count).toBe(1);
  raw.close();
});

it('does not roll back or join an ongoing local transaction', () => {
  const raw = new DatabaseSync(':memory:');
  raw.exec('CREATE TABLE rows (id INTEGER); BEGIN; INSERT INTO rows VALUES (1);');
  expect(() => applySyncBatch(sqliteBatchFixture(raw) as never, () => undefined)).toThrow('still in progress');
  expect(raw.isTransaction).toBe(true);
  raw.exec('COMMIT');
  expect(raw.prepare('SELECT COUNT(*) AS count FROM rows').get()?.count).toBe(1);
  raw.close();
});
