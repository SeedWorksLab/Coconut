import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';

import { getMeta, setMeta } from '../database/syncMeta';
import { applySyncBatch, type SyncApplyDatabase } from '../database/sync-batch';
import { mapSyncDownloads, measureSyncPhase } from './performance';
import {
  COMPLETE_ADAPTERS,
  SYNC_SETTINGS_KEYS,
  type SyncTableAdapter,
} from './serialize';
import { getSupabaseUserId, SyncAuthError, type CoconutClient } from './supabase';
import { isRemoteNewer, toMillis } from './time';

const PULL_PAGE_SIZE = 500;
const REPAIR_CHUNK_SIZE = 100;
const APPLY_BATCH_SIZE = 100;
const NULLABLE_REPAIR_KEY = 'nullable_fk_repair_v1';
const PENDING_REPAIR_KEY = 'pending_fk_repairs_v1';

interface PendingRepair {
  table: string;
  uuid: string;
}

const PARENT_TABLE_BY_FK_REMOTE_FIELD: Record<string, string> = {
  budget_uuid: 'budgets',
  funded_budget_uuid: 'budgets',
  fixed_expense_uuid: 'fixed_expenses',
  subscription_uuid: 'yearly_subscriptions',
};

function toBindValue(value: unknown): SQLiteBindValue {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return String(value);
}

interface FkMaps {
  budgetIdByUuid: Map<string, number | null>;
  fixedExpenseIdByUuid: Map<string, number | null>;
  subscriptionIdByUuid: Map<string, number | null>;
}

async function loadFkMaps(db: SQLiteDatabase): Promise<FkMaps> {
  const [budgets, fixedExpenses, subscriptions] = await Promise.all([
    db.getAllAsync<{ uuid: string; id: number }>(
      'SELECT uuid, id FROM budgets WHERE uuid IS NOT NULL'
    ),
    db.getAllAsync<{ uuid: string; id: number }>(
      'SELECT uuid, id FROM fixed_expenses WHERE uuid IS NOT NULL'
    ),
    db.getAllAsync<{ uuid: string; id: number }>(
      'SELECT uuid, id FROM yearly_subscriptions WHERE uuid IS NOT NULL'
    ),
  ]);
  return {
    budgetIdByUuid: new Map(budgets.map((row) => [row.uuid, row.id])),
    fixedExpenseIdByUuid: new Map(fixedExpenses.map((row) => [row.uuid, row.id])),
    subscriptionIdByUuid: new Map(subscriptions.map((row) => [row.uuid, row.id])),
  };
}

function pullFkResolver(maps: FkMaps) {
  return (remoteField: string, parentUuid: string | null): string | number | null => {
    if (parentUuid === null || parentUuid === undefined) {
      return null;
    }
    if (remoteField === 'budget_uuid' || remoteField === 'funded_budget_uuid') {
      return maps.budgetIdByUuid.get(parentUuid) ?? null;
    }
    if (remoteField === 'fixed_expense_uuid') {
      return maps.fixedExpenseIdByUuid.get(parentUuid) ?? null;
    }
    if (remoteField === 'subscription_uuid') {
      return maps.subscriptionIdByUuid.get(parentUuid) ?? null;
    }
    return null;
  };
}

function hasUnresolvedFk(
  adapter: SyncTableAdapter,
  remote: Record<string, unknown>,
  values: Record<string, unknown>
): boolean {
  for (const field of adapter.fields) {
    if (!field.fk) {
      continue;
    }
    const remoteValue = remote[field.remote] as string | null;
    if (
      remoteValue != null &&
      values[field.local] == null &&
      field.requiredFk
    ) {
      return true;
    }
  }
  return false;
}

function toSetSql(
  values: Record<string, unknown>
): { sql: string; params: SQLiteBindValue[] } {
  const columns = Object.keys(values);
  return {
    sql: columns.map((col) => `${col} = ?`).join(', '),
    params: columns.map((col) => toBindValue(values[col])),
  };
}

function findNaturalMatch(
  db: SyncApplyDatabase,
  adapter: SyncTableAdapter,
  values: Record<string, unknown>
): { id: number; uuid: string; updated_at: string | null } | null {
  const naturalKeys = adapter.naturalKeys ?? [];
  if (naturalKeys.length === 0) {
    return null;
  }
  const where = naturalKeys.map((col) => `${col} = ?`).join(' AND ');
  const params = naturalKeys.map((col) => toBindValue(values[col]));
  return db.getFirstSync<{ id: number; uuid: string; updated_at: string | null }>(
    `SELECT id, uuid, updated_at FROM ${adapter.localTable} WHERE ${where} LIMIT 1`,
    params
  );
}

function findSharedMirrorByOrigin(
  db: SyncApplyDatabase,
  adapter: SyncTableAdapter,
  values: Record<string, unknown>
): { id: number; uuid: string; updated_at: string | null } | null {
  if (
    adapter.localTable !== 'transactions' ||
    values.origin_type !== 'shared' ||
    values.origin_id == null
  ) {
    return null;
  }
  return db.getFirstSync<{ id: number; uuid: string; updated_at: string | null }>(
    `SELECT id, uuid, updated_at FROM transactions
      WHERE origin_type = 'shared' AND origin_id = ?
      ORDER BY id ASC LIMIT 1`,
    [toBindValue(values.origin_id)]
  );
}

function captureInsertedParent(maps: FkMaps, adapter: SyncTableAdapter, values: Record<string, unknown>, id: number): void {
  const uuid = values.uuid as string | null;
  if (!uuid) {
    return;
  }
  if (adapter.localTable === 'budgets') {
    maps.budgetIdByUuid.set(uuid, id);
  } else if (adapter.localTable === 'fixed_expenses') {
    maps.fixedExpenseIdByUuid.set(uuid, id);
  } else if (adapter.localTable === 'yearly_subscriptions') {
    maps.subscriptionIdByUuid.set(uuid, id);
  }
}

function applyRemoteRow(
  db: SyncApplyDatabase,
  adapter: SyncTableAdapter,
  remote: Record<string, unknown>,
  maps: FkMaps
): void {
  const uuid = (remote.uuid as string) ?? '';
  const remoteUpdatedAt = (remote.updated_at as string | null) ?? null;
  const values: Record<string, unknown> = adapter.fromRemote(remote, pullFkResolver(maps));
  values.updated_at = remoteUpdatedAt;

  if (hasUnresolvedFk(adapter, remote, values)) {
    return;
  }

  if (adapter.identityColumn === 'month_key') {
    const monthKey = values.month_key as string;
    if (!monthKey) {
      return;
    }
    const local = db.getFirstSync<{ updated_at: string | null }>(
      'SELECT updated_at FROM months WHERE month_key = ?',
      [monthKey]
    );
    if (local && !isRemoteNewer(local.updated_at, remoteUpdatedAt)) {
      return;
    }
    values.uuid = uuid;
    if (local) {
      const { sql, params } = toSetSql(values);
      db.runSync(`UPDATE months SET ${sql} WHERE month_key = ?`, [
        ...params,
        monthKey,
      ]);
    } else {
      const columns = Object.keys(values);
      db.runSync(
        `INSERT INTO months (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        columns.map((col) => toBindValue(values[col]))
      );
    }
    return;
  }

  const existing = db.getFirstSync<{ id: number; uuid: string; updated_at: string | null }>(
    `SELECT id, uuid, updated_at FROM ${adapter.localTable} WHERE uuid = ?`,
    [uuid]
  );
  const sharedMatch = existing
    ? null
    : findSharedMirrorByOrigin(db, adapter, values);
  const naturalMatch =
    existing || sharedMatch ? null : findNaturalMatch(db, adapter, values);
  const target = existing ?? sharedMatch ?? naturalMatch;

  if (target) {
    if (!isRemoteNewer(target.updated_at, remoteUpdatedAt)) {
      return;
    }
    values.uuid = target.uuid;
    const { sql, params } = toSetSql(values);
    db.runSync(`UPDATE ${adapter.localTable} SET ${sql} WHERE uuid = ?`, [
      ...params,
      toBindValue(values.uuid),
    ]);
    return;
  }

  values.uuid = uuid;
  const columns = Object.keys(values);
  const result = db.runSync(
    `INSERT INTO ${adapter.localTable} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    columns.map((col) => toBindValue(values[col]))
  );
  captureInsertedParent(maps, adapter, values, result.lastInsertRowId);
}

async function fetchRemoteRows(
  client: CoconutClient,
  remoteTable: string,
  since: string
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let offset = 0;
  // PostgREST caps a response at a server-configured row limit, so an
  // unpaginated pull silently truncates large datasets. Walk pages until a short
  // page arrives; uuid is only a tie-breaker so pagination is stable when many
  // rows share the same timestamp.
  for (;;) {
    const { data, error } = await client
      .from(remoteTable)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
      .order('uuid', { ascending: true })
      .range(offset, offset + PULL_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Pull failed for ${remoteTable}: ${error.message}`);
    }
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (page.length < PULL_PAGE_SIZE) {
      break;
    }
    offset += PULL_PAGE_SIZE;
  }
  return rows;
}

interface RemoteTombstone {
  table_name: string;
  row_key: string;
  deleted_at: string;
}

async function fetchRemoteTombstones(
  client: CoconutClient,
): Promise<RemoteTombstone[]> {
  const rows: RemoteTombstone[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from('sync_tombstones')
      .select('table_name, row_key, deleted_at')
      // An older tombstone must also remove a stale local copy and block any
      // subsequently reinserted stale remote row.
      .gt('deleted_at', '1970-01-01T00:00:00.000Z')
      .order('deleted_at', { ascending: true })
      .order('row_key', { ascending: true })
      .range(offset, offset + PULL_PAGE_SIZE - 1);
    if (error) {
      throw new Error(`Pull of tombstones failed: ${error.message}`);
    }
    const page = data ?? [];
    rows.push(...page as RemoteTombstone[]);
    if (page.length < PULL_PAGE_SIZE) {
      break;
    }
    offset += PULL_PAGE_SIZE;
  }
  return rows;
}

export async function pullSettings(
  db: SQLiteDatabase,
  client: CoconutClient,
  since: string,
  keys: readonly string[] = SYNC_SETTINGS_KEYS
): Promise<number> {
  const { data, error } = await client
    .from('settings')
    .select('key, value, updated_at')
    .in('key', keys)
    .gt('updated_at', since);
  if (error) {
    throw new Error(`Pull of settings failed: ${error.message}`);
  }
  return applySyncBatch(db, (batch) => applySettings(batch, data ?? []));
}

function applySettings(db: SyncApplyDatabase, rows: Record<string, unknown>[]): number {
  let applied = 0;
  for (const row of rows) {
    const key = row.key as string;
    const value = (row.value as string) ?? '';
    const updatedAt = (row.updated_at as string | null) ?? null;
    const local = db.getFirstSync<{ value: string; updated_at: string | null }>(
      'SELECT value, updated_at FROM settings WHERE key = ?',
      [key]
    );
    if (local && !isRemoteNewer(local.updated_at, updatedAt)) {
      continue;
    }
    db.runSync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, updatedAt]
    );
    applied += 1;
  }
  return applied;
}

async function fetchRepairRows(
  db: SQLiteDatabase,
  client: CoconutClient,
  full: boolean,
): Promise<Record<string, unknown>[][]> {
  // A child pulled before its parent existed locally used to keep NULL forever:
  // the incremental watermark never fetched it again and an equal timestamp is
  // not "newer". Re-check every locally NULL nullable FK against the remote row
  // (the remote is the only place the original uuid still survives) and restore
  // it when the remote copy is at least as new as the local one.
  const stored = await getMeta(PENDING_REPAIR_KEY, db);
  const pending = stored ? JSON.parse(stored) as PendingRepair[] : [];
  return mapSyncDownloads(COMPLETE_ADAPTERS, async (adapter) => {
    const uuids = new Set(pending.filter((row) => row.table === adapter.localTable).map((row) => row.uuid));
    for (const field of full ? adapter.fields : []) {
      if (!field.fk || field.requiredFk) {
        continue;
      }
      const locals = await db.getAllAsync<{ uuid: string; updated_at: string | null }>(
        `SELECT uuid, updated_at FROM ${adapter.localTable}
          WHERE uuid IS NOT NULL AND ${field.local} IS NULL`
      );
      for (const row of locals) uuids.add(row.uuid);
    }
    const keys = [...uuids];
    const rows: Record<string, unknown>[] = [];
    for (let index = 0; index < keys.length; index += REPAIR_CHUNK_SIZE) {
      const chunk = keys.slice(index, index + REPAIR_CHUNK_SIZE);
      const { data, error } = await client
        .from(adapter.remoteTable)
        .select('*')
        .in('uuid', chunk);
      if (error) {
        throw new Error(`FK repair lookup failed for ${adapter.remoteTable}: ${error.message}`);
      }
      rows.push(...data ?? []);
    }
    return rows;
  });
}

function repairNullableFks(
  db: SyncApplyDatabase,
  adapter: SyncTableAdapter,
  rows: Record<string, unknown>[],
  maps: FkMaps,
): void {
  for (const remoteRow of rows) {
    for (const field of adapter.fields) {
      if (!field.fk || field.requiredFk) continue;
      const remoteValue = remoteRow[field.remote] as string | null;
      if (remoteValue == null) continue;
      const local = db.getFirstSync<{ updated_at: string | null }>(
        `SELECT updated_at FROM ${adapter.localTable} WHERE uuid = ? AND ${field.local} IS NULL`,
        [toBindValue(remoteRow.uuid)],
      );
      if (!local || toMillis(remoteRow.updated_at as string | null) < toMillis(local.updated_at)) continue;
      const localId = pullFkResolver(maps)(field.remote, remoteValue);
      if (localId == null) continue;
      db.runSync(
        `UPDATE ${adapter.localTable} SET ${field.local} = ? WHERE uuid = ?`,
        [localId, remoteRow.uuid as string]
      );
    }
  }
}

async function fetchMissingParents(
  client: CoconutClient,
  downloaded: Record<string, unknown>[][],
  repairs: Record<string, unknown>[][],
  maps: FkMaps,
): Promise<void> {
  const missing = new Map<string, Set<string>>();
  for (const [index, adapter] of COMPLETE_ADAPTERS.entries()) {
    for (const row of [...downloaded[index], ...repairs[index]]) {
      for (const field of adapter.fields) {
        const uuid = row[field.remote];
        const table = PARENT_TABLE_BY_FK_REMOTE_FIELD[field.remote];
        if (!table || typeof uuid !== 'string' || pullFkResolver(maps)(field.remote, uuid) != null) continue;
        const keys = missing.get(table) ?? new Set<string>();
        keys.add(uuid);
        missing.set(table, keys);
      }
    }
  }
  await mapSyncDownloads([...missing], async ([table, keys]) => {
    const index = COMPLETE_ADAPTERS.findIndex((adapter) => adapter.localTable === table);
    const existing = new Set(downloaded[index].map((row) => row.uuid));
    const needed = [...keys].filter((uuid) => !existing.has(uuid));
    for (let offset = 0; offset < needed.length; offset += REPAIR_CHUNK_SIZE) {
      const { data, error } = await client.from(COMPLETE_ADAPTERS[index].remoteTable)
        .select('*').in('uuid', needed.slice(offset, offset + REPAIR_CHUNK_SIZE));
      if (error) throw new Error(`Pull lookup failed for ${table}: ${error.message}`);
      downloaded[index].push(...data ?? []);
    }
  });
}

export interface PullResult {
  pulled: number;
  tombstones: number;
  settingsPulled: number;
}

export async function pullChanges(
  client: CoconutClient,
  db: SQLiteDatabase,
  since: string
): Promise<PullResult> {
  const userId = await getSupabaseUserId();
  if (!userId) {
    throw new SyncAuthError('You must be signed in to sync.');
  }

  let pulled = 0;
  let tombstones = 0;
  let settingsPulled = 0;

  const needsRepair = since === '1970-01-01T00:00:00.000Z' || !await getMeta(NULLABLE_REPAIR_KEY, db);
  const { downloaded, deleted, settings, repairs } = await measureSyncPhase('personal.download', async () => {
    const downloaded = await mapSyncDownloads(COMPLETE_ADAPTERS, (adapter) =>
      fetchRemoteRows(client, adapter.remoteTable, since));
    const deleted = await fetchRemoteTombstones(client);
    const { data: settings, error } = await client.from('settings')
      .select('key, value, updated_at').in('key', SYNC_SETTINGS_KEYS).gt('updated_at', since);
    if (error) throw new Error(`Pull of settings failed: ${error.message}`);
    const repairs = await fetchRepairRows(db, client, needsRepair);
    await fetchMissingParents(client, downloaded, repairs, await loadFkMaps(db));
    return { downloaded, deleted, settings: settings ?? [], repairs };
  });
  const maps = await loadFkMaps(db);
  const tombstonedKeys = new Set(deleted.map((row) => `${row.table_name}:${row.row_key}`));
  const localDeletes = await db.getAllAsync<{ table_name: string; row_key: string }>(
    'SELECT table_name, row_key FROM sync_tombstones');
  for (const row of localDeletes) tombstonedKeys.add(`${row.table_name}:${row.row_key}`);
  for (const [table, map] of [
    ['budgets', maps.budgetIdByUuid],
    ['fixed_expenses', maps.fixedExpenseIdByUuid],
    ['yearly_subscriptions', maps.subscriptionIdByUuid],
  ] as const) {
    for (const uuid of map.keys()) {
      if (tombstonedKeys.has(`${table}:${uuid}`)) map.delete(uuid);
    }
  }
  const pending: PendingRepair[] = [];
  await measureSyncPhase('personal.apply', async () => {
    const adapterByTable = new Map(COMPLETE_ADAPTERS.map((adapter) => [adapter.localTable, adapter]));
    for (let offset = 0; offset < deleted.length; offset += APPLY_BATCH_SIZE) {
      applySyncBatch(db, (batch) => {
        for (const tomb of deleted.slice(offset, offset + APPLY_BATCH_SIZE)) {
          const adapter = adapterByTable.get(tomb.table_name);
          if (!adapter) continue;
          batch.runSync(`DELETE FROM ${adapter.localTable} WHERE ${adapter.identityColumn} = ?`, [tomb.row_key]);
          batch.runSync('DELETE FROM sync_outbox WHERE table_name = ? AND row_key = ?', [tomb.table_name, tomb.row_key]);
          if (tomb.deleted_at > since) tombstones += 1;
        }
      });
    }
    for (const [index, adapter] of COMPLETE_ADAPTERS.entries()) {
      const byUuid = new Map<string, Record<string, unknown>>();
      for (const row of [...downloaded[index], ...repairs[index]]) {
        const key = String(row.uuid);
        const previous = byUuid.get(key);
        if (!previous || toMillis(row.updated_at as string) >= toMillis(previous.updated_at as string)) {
          byUuid.set(key, row);
        }
      }
      const remoteRows = [...byUuid.values()];
      for (let offset = 0; offset < remoteRows.length; offset += APPLY_BATCH_SIZE) {
        applySyncBatch(db, (batch) => {
          for (const remoteRow of remoteRows.slice(offset, offset + APPLY_BATCH_SIZE)) {
            const rowKey = adapter.identityColumn === 'month_key' ? remoteRow.month_key : remoteRow.uuid;
            if (tombstonedKeys.has(`${adapter.localTable}:${rowKey}`)) continue;
            applyRemoteRow(batch, adapter, remoteRow, maps);
            if (adapter.fields.some((field) => field.fk && remoteRow[field.remote] != null &&
              pullFkResolver(maps)(field.remote, remoteRow[field.remote] as string) == null)) {
              pending.push({ table: adapter.localTable, uuid: remoteRow.uuid as string });
            }
            pulled += 1;
          }
        });
      }
      const repairRows = repairs[index].filter((row) => !tombstonedKeys.has(`${adapter.localTable}:${row.uuid}`));
      for (let offset = 0; offset < repairRows.length; offset += APPLY_BATCH_SIZE) {
        applySyncBatch(db, (batch) =>
          repairNullableFks(batch, adapter, repairRows.slice(offset, offset + APPLY_BATCH_SIZE), maps));
      }
    }
    settingsPulled = applySyncBatch(db, (batch) => applySettings(batch, settings));
  });
  await setMeta(PENDING_REPAIR_KEY, JSON.stringify(pending), db);
  if (needsRepair) await setMeta(NULLABLE_REPAIR_KEY, '1', db);
  return { pulled, tombstones, settingsPulled };
}
