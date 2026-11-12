/// <reference types="node" />

import { DatabaseSync } from 'node:sqlite';
import { validateBackupDatabase } from '../../src/database/backup-validation';

function asAsyncDatabase(raw: DatabaseSync) {
  return {
    async getFirstAsync<T>(sql: string): Promise<T | null> {
      return (raw.prepare(sql).get() as T | undefined) ?? null;
    },
    async getAllAsync<T>(sql: string): Promise<T[]> {
      return raw.prepare(sql).all() as T[];
    },
  };
}

describe('backup validation before replacing local data', () => {
  it('rejects an unrelated SQLite database', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, value TEXT)');
    await expect(validateBackupDatabase(asAsyncDatabase(raw))).rejects.toThrow('not a Coconut');
    raw.close();
  });

  it('accepts a database containing the core Coconut tables', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('CREATE TABLE months (month_key TEXT, allowance_cents INTEGER); CREATE TABLE settings (key TEXT, value TEXT); CREATE TABLE transactions (month_key TEXT, date TEXT, amount_cents INTEGER)');
    await expect(validateBackupDatabase(asAsyncDatabase(raw))).resolves.toBeUndefined();
    raw.close();
  });

  it('rejects a future schema without replacing the running database', async () => {
    const raw = new DatabaseSync(':memory:');
    raw.exec('PRAGMA user_version = 9999');
    await expect(validateBackupDatabase(asAsyncDatabase(raw))).rejects.toThrow('newer version');
    raw.close();
  });
});
