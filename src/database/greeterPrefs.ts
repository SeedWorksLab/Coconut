import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from './database';

const GREETER_SEEN_KEY = 'greeter_seen';

export async function getGreeterSeen(db?: SQLiteDatabase): Promise<boolean> {
  const database = db ?? (await getDatabase());
  const row = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [GREETER_SEEN_KEY]
  );
  return row?.value === '1';
}

export async function setGreeterSeen(db?: SQLiteDatabase): Promise<void> {
  const database = db ?? (await getDatabase());
  await database.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value',
    [GREETER_SEEN_KEY, '1']
  );
}
