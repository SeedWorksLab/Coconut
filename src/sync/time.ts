export const EPOCH = '1970-01-01T00:00:00.000Z';

// Remote `updated_at` values are written with each device's own clock. Re-reading
// a generous window keeps changes written during a pull (or by a device whose
// clock is behind) from being skipped forever by the incremental watermark. The
// manual full sync re-reads everything regardless, so this is only about keeping
// the automatic sync correct without re-downloading the whole dataset every time.
export const PULL_OVERLAP_MS = 60 * 60 * 1000;

export function nowIso(): string {
  return new Date().toISOString();
}

export function pullSince(lastSyncAt: string | null | undefined): string {
  const ms = toMillis(lastSyncAt) - PULL_OVERLAP_MS;
  if (ms <= 0) {
    return EPOCH;
  }
  return new Date(ms).toISOString();
}

export function toMillis(updatedAt: string | null | undefined): number {
  if (!updatedAt) {
    return 0;
  }
  const ms = Date.parse(updatedAt);
  return Number.isNaN(ms) ? 0 : ms;
}

export function isRemoteNewer(
  localUpdatedAt: string | null | undefined,
  remoteUpdatedAt: string | null | undefined
): boolean {
  return toMillis(remoteUpdatedAt) > toMillis(localUpdatedAt);
}