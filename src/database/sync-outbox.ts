import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

export async function acknowledgeSyncRow(
  db: SQLiteDatabase,
  table: string,
  identity: string,
  rowKey: string,
  snapshot: Record<string, unknown> | null,
): Promise<void> {
  const columns = snapshot ? Object.keys(snapshot) : [];
  const conditions = columns.map((column) => `"${column}" IS ?`);
  const params = columns.map((column) => snapshot![column] as SQLiteBindValue);
  // An edit may land while its previous value is being uploaded. Acknowledge
  // only that exact snapshot, not the newer outbox entry (even on timestamp ties).
  await db.runAsync(`DELETE FROM sync_outbox WHERE table_name = ? AND row_key = ?
    AND ${snapshot ? '' : 'NOT '}EXISTS (
      SELECT 1 FROM ${table} WHERE ${identity} = ?
      ${conditions.length ? `AND ${conditions.join(' AND ')}` : ''}
    )`, [table, rowKey, rowKey, ...params]);
}
