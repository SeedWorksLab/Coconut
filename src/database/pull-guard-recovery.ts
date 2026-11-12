interface PullGuardDatabase {
  runAsync(sql: string): Promise<unknown>;
}

export async function recoverPullGuard(db: PullGuardDatabase): Promise<void> {
  // A process can terminate between withPullGuard's set and finally. No pull
  // survives a process restart, so the persisted guard must not survive either.
  await db.runAsync("UPDATE sync_meta SET value = '0' WHERE key = 'pull_in_progress'");
}
