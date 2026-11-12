import type { SQLiteDatabase, SQLiteBindValue } from 'expo-sqlite';

import { withPullGuard } from '../database/syncMeta';
import {
  COMPLETE_ADAPTERS,
  SYNC_SETTINGS_KEYS,
  type Field,
  type SyncTableAdapter,
} from './serialize';
import { getSupabaseUserId, SyncAuthError, type CoconutClient } from './supabase';
import { isRemoteNewer, toMillis } from './time';

const PULL_PAGE_SIZE = 500;
const REPAIR_CHUNK_SIZE = 100;

const PARENT_TABLE_BY_FK_REMOTE_FIELD: Record<string, string> = {
  budget_uuid: 'budgets',
  funded_budget_uuid: 'budgets',
  fixed_expense_uuid: 'fixed_expenses',
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
}

async function loadFkMaps(db: SQLiteDatabase): Promise<FkMaps> {
  const [budgets, fixedExpenses] = await Promise.all([
    db.getAllAsync<{ uuid: string; id: number }>(
      'SELECT uuid, id FROM budgets WHERE uuid IS NOT NULL'
    ),
    db.getAllAsync<{ uuid: string; id: number }>(
      'SELECT uuid, id FROM fixed_expenses WHERE uuid IS NOT NULL'
    ),
  ]);
  return {
    budgetIdByUuid: new Map(budgets.map((row) => [row.uuid, row.id])),
    fixedExpenseIdByUuid: new Map(fixedExpenses.map((row) => [row.uuid, row.id])),
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
    return null;
  };
}

// Local FK columns that are nullable. When the referenced parent uuid is
// missing locally, the child is applied with a NULL key (lossless, mirrors the
// remote ON DELETE SET NULL semantics) instead of being dropped permanently by
// the incremental watermark. NOT NULL FK children keep skipping: an instance
// without its parent is meaningless and a NULL would violate the column.
const NULLABLE_FK_LOCAL_COLUMNS = new Set<string>(['budget_id', 'funded_budget_id']);

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
      !NULLABLE_FK_LOCAL_COLUMNS.has(field.local)
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

async function findNaturalMatch(
  db: SQLiteDatabase,
  adapter: SyncTableAdapter,
  values: Record<string, unknown>
): Promise<{ id: number; uuid: string; updated_at: string | null } | null> {
  const naturalKeys = adapter.naturalKeys ?? [];
  if (naturalKeys.length === 0) {
    return null;
  }
  const where = naturalKeys.map((col) => `${col} = ?`).join(' AND ');
  const params = naturalKeys.map((col) => toBindValue(values[col]));
  return db.getFirstAsync<{ id: number; uuid: string; updated_at: string | null }>(
    `SELECT id, uuid, updated_at FROM ${adapter.localTable} WHERE ${where} LIMIT 1`,
    params
  );
}

async function findSharedMirrorByOrigin(
  db: SQLiteDatabase,
  adapter: SyncTableAdapter,
  values: Record<string, unknown>
): Promise<{ id: number; uuid: string; updated_at: string | null } | null> {
  if (
    adapter.localTable !== 'transactions' ||
    values.origin_type !== 'shared' ||
    values.origin_id == null
  ) {
    return null;
  }
  return db.getFirstAsync<{ id: number; uuid: string; updated_at: string | null }>(
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
  }
}

async function fetchAndApplyParent(
  db: SQLiteDatabase,
  client: CoconutClient,
  field: Field,
  parentUuid: string,
  maps: FkMaps
): Promise<void> {
  const parentTable = PARENT_TABLE_BY_FK_REMOTE_FIELD[field.remote];
  if (!parentTable) {
    return;
  }
  const parentAdapter = COMPLETE_ADAPTERS.find(
    (adapter) => adapter.localTable === parentTable
  );
  if (!parentAdapter) {
    return;
  }
  // The parent may be older than the incremental watermark (or have been written
  // by a device with a slightly behind clock). Fetch it directly by uuid instead
  // of leaving the child with a NULL FK that no later pull would ever repair.
  const { data, error } = await client
    .from(parentAdapter.remoteTable)
    .select('*')
    .eq('uuid', parentUuid)
    .maybeSingle();
  if (error) {
    throw new Error(`Pull lookup failed for ${parentAdapter.remoteTable}: ${error.message}`);
  }
  if (data) {
    await applyRemoteRow(db, parentAdapter, data as Record<string, unknown>, maps, client);
  }
}

async function applyRemoteRow(
  db: SQLiteDatabase,
  adapter: SyncTableAdapter,
  remote: Record<string, unknown>,
  maps: FkMaps,
  client: CoconutClient
): Promise<void> {
  const uuid = (remote.uuid as string) ?? '';
  const remoteUpdatedAt = (remote.updated_at as string | null) ?? null;
  let values: Record<string, unknown> = adapter.fromRemote(remote, pullFkResolver(maps));
  values.updated_at = remoteUpdatedAt;

  for (const field of adapter.fields) {
    if (!field.fk) {
      continue;
    }
    const parentUuid = remote[field.remote] as string | null | undefined;
    if (parentUuid == null || values[field.local] != null) {
      continue;
    }
    await fetchAndApplyParent(db, client, field, parentUuid, maps);
  }
  values = adapter.fromRemote(remote, pullFkResolver(maps));
  values.updated_at = remoteUpdatedAt;

  if (hasUnresolvedFk(adapter, remote, values)) {
    return;
  }

  if (adapter.identityColumn === 'month_key') {
    const monthKey = values.month_key as string;
    if (!monthKey) {
      return;
    }
    const local = await db.getFirstAsync<{ updated_at: string | null }>(
      'SELECT updated_at FROM months WHERE month_key = ?',
      [monthKey]
    );
    if (local && !isRemoteNewer(local.updated_at, remoteUpdatedAt)) {
      return;
    }
    values.uuid = uuid;
    if (local) {
      const { sql, params } = toSetSql(values);
      await db.runAsync(`UPDATE months SET ${sql} WHERE month_key = ?`, [
        ...params,
        monthKey,
      ]);
    } else {
      const columns = Object.keys(values);
      await db.runAsync(
        `INSERT INTO months (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
        columns.map((col) => toBindValue(values[col]))
      );
    }
    return;
  }

  const existing = await db.getFirstAsync<{ id: number; uuid: string; updated_at: string | null }>(
    `SELECT id, uuid, updated_at FROM ${adapter.localTable} WHERE uuid = ?`,
    [uuid]
  );
  const sharedMatch = existing
    ? null
    : await findSharedMirrorByOrigin(db, adapter, values);
  const naturalMatch =
    existing || sharedMatch ? null : await findNaturalMatch(db, adapter, values);
  const target = existing ?? sharedMatch ?? naturalMatch;

  if (target) {
    if (!isRemoteNewer(target.updated_at, remoteUpdatedAt)) {
      return;
    }
    values.uuid = target.uuid;
    const { sql, params } = toSetSql(values);
    await db.runAsync(`UPDATE ${adapter.localTable} SET ${sql} WHERE uuid = ?`, [
      ...params,
      toBindValue(values.uuid),
    ]);
    return;
  }

  values.uuid = uuid;
  const columns = Object.keys(values);
  const result = await db.runAsync(
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

async function applyRemoteTombstones(
  db: SQLiteDatabase,
  client: CoconutClient,
  since: string
): Promise<{ applied: number; tombstonedKeys: Set<string> }> {
  const adapterByTable = new Map(COMPLETE_ADAPTERS.map((a) => [a.localTable, a]));
  let applied = 0;
  let offset = 0;
  const tombstonedKeys = new Set<string>();
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
    for (const tomb of page) {
      const adapter = adapterByTable.get(tomb.table_name as string);
      if (!adapter) {
        continue;
      }
      tombstonedKeys.add(`${tomb.table_name}:${tomb.row_key}`);
      if (adapter.identityColumn === 'month_key') {
        await db.runAsync('DELETE FROM months WHERE month_key = ?', [tomb.row_key]);
      } else {
        await db.runAsync(`DELETE FROM ${adapter.localTable} WHERE uuid = ?`, [
          tomb.row_key,
        ]);
      }
      await db.runAsync('DELETE FROM sync_outbox WHERE table_name = ? AND row_key = ?', [
        tomb.table_name,
        tomb.row_key,
      ]);
      if ((tomb.deleted_at as string) > since) {
        applied += 1;
      }
    }
    if (page.length < PULL_PAGE_SIZE) {
      break;
    }
    offset += PULL_PAGE_SIZE;
  }
  return { applied, tombstonedKeys };
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
  let applied = 0;
  for (const row of data ?? []) {
    const key = row.key as string;
    const value = (row.value as string) ?? '';
    const updatedAt = (row.updated_at as string | null) ?? null;
    const local = await db.getFirstAsync<{ value: string; updated_at: string | null }>(
      'SELECT value, updated_at FROM settings WHERE key = ?',
      [key]
    );
    if (local && !isRemoteNewer(local.updated_at, updatedAt)) {
      continue;
    }
    await db.runAsync(
      `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, updatedAt]
    );
    applied += 1;
  }
  return applied;
}

async function repairNullableFks(
  db: SQLiteDatabase,
  client: CoconutClient,
  maps: FkMaps
): Promise<void> {
  // A child pulled before its parent existed locally used to keep NULL forever:
  // the incremental watermark never fetched it again and an equal timestamp is
  // not "newer". Re-check every locally NULL nullable FK against the remote row
  // (the remote is the only place the original uuid still survives) and restore
  // it when the remote copy is at least as new as the local one.
  for (const adapter of COMPLETE_ADAPTERS) {
    for (const field of adapter.fields) {
      if (!field.fk || !NULLABLE_FK_LOCAL_COLUMNS.has(field.local)) {
        continue;
      }
      const locals = await db.getAllAsync<{ uuid: string; updated_at: string | null }>(
        `SELECT uuid, updated_at FROM ${adapter.localTable}
          WHERE uuid IS NOT NULL AND ${field.local} IS NULL`
      );
      if (locals.length === 0) {
        continue;
      }
      const localByUuid = new Map(locals.map((row) => [row.uuid, row]));
      for (let index = 0; index < locals.length; index += REPAIR_CHUNK_SIZE) {
        const chunk = locals
          .slice(index, index + REPAIR_CHUNK_SIZE)
          .map((row) => row.uuid);
        const { data, error } = await client
          .from(adapter.remoteTable)
          .select('*')
          .in('uuid', chunk);
        if (error) {
          throw new Error(
            `FK repair lookup failed for ${adapter.remoteTable}: ${error.message}`
          );
        }
        for (const remoteRow of data ?? []) {
          const remoteValue = remoteRow[field.remote] as string | null;
          if (remoteValue == null) {
            continue;
          }
          const local = localByUuid.get(remoteRow.uuid as string);
          if (
            !local ||
            toMillis(remoteRow.updated_at as string | null) < toMillis(local.updated_at)
          ) {
            continue;
          }
          let localId = pullFkResolver(maps)(field.remote, remoteValue);
          if (localId == null) {
            await fetchAndApplyParent(db, client, field, remoteValue, maps);
            localId = pullFkResolver(maps)(field.remote, remoteValue);
          }
          if (localId == null) {
            continue;
          }
          await db.runAsync(
            `UPDATE ${adapter.localTable} SET ${field.local} = ? WHERE uuid = ?`,
            [localId, remoteRow.uuid as string]
          );
        }
      }
    }
  }
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

  const maps = await loadFkMaps(db);
  let pulled = 0;
  let tombstones = 0;
  let settingsPulled = 0;

  await withPullGuard(db, async () => {
    const tombstoneResult = await applyRemoteTombstones(db, client, since);
    tombstones = tombstoneResult.applied;

    for (const adapter of COMPLETE_ADAPTERS) {
      const remoteRows = await fetchRemoteRows(client, adapter.remoteTable, since);
      for (const remoteRow of remoteRows) {
        const rowKey = adapter.identityColumn === 'month_key'
          ? remoteRow.month_key
          : remoteRow.uuid;
        if (tombstoneResult.tombstonedKeys.has(`${adapter.localTable}:${rowKey}`)) {
          continue;
        }
        await applyRemoteRow(db, adapter, remoteRow, maps, client);
        pulled += 1;
      }
    }

    settingsPulled = await pullSettings(db, client, since);
    await repairNullableFks(db, client, maps);
  });

  return { pulled, tombstones, settingsPulled };
}
