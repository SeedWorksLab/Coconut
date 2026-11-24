import type { SQLiteDatabase } from 'expo-sqlite';
import { resolveCloudConfig } from '../config/cloud';
import { getSyncState } from '../database/syncState';
import { COMPLETE_ADAPTERS } from './serialize';
import type { CoconutClient } from './supabase';
import { getSyncDeviceName } from './device-name';
import { getMeta, setMeta } from '../database/syncMeta';

const LAST_REPORT_KEY = 'seed_usage_report_at';
const REPORT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const scheduledReports = new WeakSet<SQLiteDatabase>();

export function scheduleSeedWorksUsage(db: SQLiteDatabase, client: CoconutClient): void {
  if (scheduledReports.has(db)) return;
  scheduledReports.add(db);
  setTimeout(() => {
    void reportSeedWorksUsage(db, client)
      .catch(() => undefined)
      .finally(() => scheduledReports.delete(db));
  }, 1000);
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    bytes += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return bytes;
}

/** Reports the synced personal dataset to the SeedWorks account portal. */
export async function reportSeedWorksUsage(
  db: SQLiteDatabase,
  client: CoconutClient
): Promise<void> {
  const state = await getSyncState(db);
  const cloud = resolveCloudConfig(state);
  // A custom Supabase project does not have SeedWorks' account registry/RPC.
  if (!state.enabled || cloud.isCustom) return;
  const lastReport = await getMeta(LAST_REPORT_KEY, db);
  if (lastReport && Date.now() - Number(lastReport) < REPORT_INTERVAL_MS) return;
  // Persist the attempt too: an unavailable portal must not cause a full scan
  // on every edit. Financial sync never depends on this informational report.
  await setMeta(LAST_REPORT_KEY, String(Date.now()), db);

  let recordCount = 0;
  let byteCount = 0;
  for (const adapter of COMPLETE_ADAPTERS) {
    const fields = adapter.fields;
    const columns = fields.map((field) => `"${field.local}"`).join(', ');
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT ${columns} FROM "${adapter.localTable}"`
    );
    recordCount += rows.length;
    for (const row of rows) {
      const remoteRecord: Record<string, unknown> = {};
      for (const field of fields) {
        const value = row[field.local] ?? null;
        remoteRecord[field.remote] = field.booleanType ? Boolean(value) : value;
      }
      byteCount += utf8ByteLength(JSON.stringify(remoteRecord));
    }
  }

  const publicClient = client.schema('public' as never) as unknown as {
    rpc: (
      name: string,
      args: Record<string, string | number>
    ) => Promise<{ error: Error | null }>;
  };
  const current = await getSyncState(db);
  if (!current.enabled || resolveCloudConfig(current).supabaseUrl !== cloud.supabaseUrl ||
    resolveCloudConfig(current).apiKey !== cloud.apiKey) return;
  const { error } = await publicClient.rpc('seed_report_app_usage', {
    p_app_slug: 'coconut',
    p_record_count: recordCount,
    p_byte_count: byteCount,
    p_device_name: getSyncDeviceName(),
  });
  if (error) throw error;
}
