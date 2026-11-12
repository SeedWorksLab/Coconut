import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';
import { resolveCloudConfig } from '../config/cloud';
import { getSyncState } from '../database/syncState';
import { COMPLETE_ADAPTERS } from './serialize';
import type { CoconutClient } from './supabase';

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
  if (cloud.isCustom) return;

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
  const { error } = await publicClient.rpc('seed_report_app_usage', {
    p_app_slug: 'coconut',
    p_record_count: recordCount,
    p_byte_count: byteCount,
    p_device_name: `Coconut (${Platform.OS})`,
  });
  if (error) throw error;
}
