import { MIGRATIONS } from './migrations';

interface BackupValidationDatabase {
  getFirstAsync<T>(sql: string): Promise<T | null>;
  getAllAsync<T>(sql: string): Promise<T[]>;
}

const REQUIRED_COLUMNS: Record<string, string[]> = {
  months: ['month_key', 'allowance_cents'],
  settings: ['key', 'value'],
  transactions: ['month_key', 'date', 'amount_cents'],
};

export async function validateBackupDatabase(db: BackupValidationDatabase): Promise<void> {
  const integrity = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  if (integrity?.integrity_check !== 'ok') {
    throw new Error('The selected backup is not a healthy SQLite database.');
  }

  const version = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((version?.user_version ?? 0) > MIGRATIONS[MIGRATIONS.length - 1].id) {
    throw new Error('This backup was created by a newer version of Coconut.');
  }

  for (const [table, required] of Object.entries(REQUIRED_COLUMNS)) {
    const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
    if (!required.every((name) => columns.some((column) => column.name === name))) {
      throw new Error('The selected file is not a Coconut database backup.');
    }
  }
}
