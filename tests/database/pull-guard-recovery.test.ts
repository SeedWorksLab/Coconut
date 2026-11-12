/// <reference types="node" />

import { DatabaseSync } from 'node:sqlite';
import { MIGRATIONS } from '../../src/database/migrations';
import { recoverPullGuard } from '../../src/database/pull-guard-recovery';

it('reenables sync change capture after an interrupted pull on startup', async () => {
  const raw = new DatabaseSync(':memory:');
  for (const migration of MIGRATIONS) {
    raw.exec(migration.sql);
  }
  raw.exec("INSERT INTO sync_meta (key, value) VALUES ('pull_in_progress', '1') ON CONFLICT (key) DO UPDATE SET value = '1'");
  await recoverPullGuard({
    runAsync: async (sql) => raw.prepare(sql).run(),
  });

  raw.exec("INSERT INTO budgets (name) VALUES ('After restart')");
  const captured = raw.prepare("SELECT COUNT(*) AS count FROM sync_outbox WHERE table_name = 'budgets'").get() as { count: number };
  expect(captured.count).toBe(1);
  raw.close();
});
