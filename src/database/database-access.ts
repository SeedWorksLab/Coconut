export async function acquireDatabaseAccess(): Promise<void> {
  // Native SQLite does not use the browser's origin-wide OPFS handle pool.
}

export function normalizeDatabaseOpenError(error: unknown): unknown {
  return error;
}
