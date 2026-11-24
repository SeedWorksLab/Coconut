import type { RealtimeChannel } from '@supabase/supabase-js';
import { COMPLETE_ADAPTERS } from './serialize';
import { SHARED_ADAPTERS } from './shared-serialize';
import { getClient } from './supabase';

export async function subscribeSyncChanges(onChange: () => void): Promise<() => void> {
  const client = await getClient();
  let channel: RealtimeChannel | null = null;
  let userId: string | null = null;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function updateUser(nextUserId: string | null) {
    if (disposed || nextUserId === userId) return;
    userId = nextUserId;
    if (channel) void client.removeChannel(channel).catch(() => undefined);
    channel = null;
    if (!userId) return;
    channel = client.channel(`coconut-sync:${userId}`);
    const tables = [
      ...COMPLETE_ADAPTERS.map((adapter) => ({ table: adapter.remoteTable, personal: true })),
      { table: 'settings', personal: true },
      { table: 'sync_tombstones', personal: true },
      ...SHARED_ADAPTERS.map((adapter) => ({ table: adapter.remoteTable, personal: false })),
      { table: 'shared_sync_tombstones', personal: false },
    ];
    for (const { table, personal } of tables) {
      // DELETE payloads are not protected by row-level SELECT policies. Deletes
      // propagate through RLS-protected tombstone inserts instead.
      for (const event of ['INSERT', 'UPDATE'] as const) {
        channel.on('postgres_changes', {
          event, schema: 'coconut', table,
          ...(personal ? { filter: `user_id=eq.${userId}` } : {}),
        }, onChange);
      }
    }
    channel.subscribe((status) => {
      if (!disposed && status === 'SUBSCRIBED') onChange();
    });
  }

  const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
    // Leave Supabase's auth callback before starting channel/network work.
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => updateUser(session?.user.id ?? null), 0);
  });
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    updateUser(session?.user.id ?? null);
  } catch (error) {
    disposed = true;
    subscription.unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
    if (channel) void client.removeChannel(channel).catch(() => undefined);
    throw error;
  }
  return () => {
    disposed = true;
    subscription.unsubscribe();
    if (timer !== undefined) clearTimeout(timer);
    if (channel) void client.removeChannel(channel).catch(() => undefined);
  };
}
