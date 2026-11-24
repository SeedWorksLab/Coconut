# Sync performance

Normal sync remains incremental and local-first. The existing web polling
interval is unchanged. No subscriptions or reporting start with sync disabled.

- Up to four table downloads run concurrently. Rows still apply in dependency
  order; pages retain their existing stable ordering and 500-row limit.
- Local apply uses 100-row transactions and reuses prepared statements. The
  transaction body is synchronous, including on web: local edits cannot slip
  into a transaction while change capture is disabled. A busy local transaction
  aborts the sync attempt without rolling back the user's operation.
- Historical nullable-FK repair runs once per cache and during full repair.
  Unresolved relationships are retained for targeted retries. Parent lookups are
  deduplicated and batched.
- Legacy UUID backfills run once per cache, or during explicit full repair,
  rather than scanning every table on each ordinary sync.
- Account storage-size reporting runs after sync, at most once per day. It is
  informational and cannot delay financial synchronization.
- Edits schedule a short coalesced sync, personal data first. Edits arriving
  during a running cycle request another cycle. Upload acknowledgements compare
  the exact local snapshot, so a newer edit remains in the outbox.
- Active apps can use Supabase INSERT/UPDATE notifications as invalidation hints.
  Events never write local records directly. The ordinary authenticated pull
  still applies conflict/deletion rules. DELETE events are deliberately not
  subscribed to because their payloads do not receive the same RLS filtering.
  Deletions normally signal through tombstones; space deletion/access revocation
  is also caught by ordinary refreshes, reconnects, and existing web polling.

## Server prerequisite

The additive migration
`SeedWorks/Supabase/supabase/migrations/20261123140000_coconut_sync_notifications.sql`
adds Coconut's sync tables to the existing `supabase_realtime` publication.
Apply it through the normal backend deployment process; the app does not deploy
it. Self-hosted projects need the same migration and a running Realtime service.
Existing owner/membership and restrictive OAuth policies remain unchanged.
Without the server prerequisite, ordinary sync continues to work.

Subscriptions are released on sign-out, sync disable, project change, and when
the app is inactive. They are re-established on return; successful subscription
also schedules catch-up so connection gaps do not depend on receiving every event.

## Local diagnostics

`getSyncTimings()` from `src/sync/performance.ts` returns the last 100 phase
measurements (milliseconds and success/failure only). Nothing is logged,
persisted, or sent to a server. Timings separate download, local apply, upload,
and total cycles, including first-use bootstrap phases.

Compare the same account and browser/device before and after, separating:

1. First download into a new, disposable test browser profile.
2. A returning account with no remote changes.
3. One transaction edit and a larger offline backlog.
4. Interrupted downloads/uploads, followed by retry.

Never clear an existing user cache or emulator to benchmark. Timing tests on
in-memory SQLite establish batching/request behavior, not real-world latency
guarantees; browser and Android checks are still needed.

For the actual Expo SQLite browser path, start Metro with
`CI=1 npx expo start --offline --port 8098`, then run
`node tests/browser/sync-batch-smoke.mjs`. This uses in-memory test tables in a
new, disposable Chrome profile and checks rollback and guard restoration.

## Verification (2026-11-23)

- 740 Jest tests passed; TypeScript and Expo lint passed.
- Web and Android exports compiled successfully.
- Real Chrome/Expo SQLite, 1,000 in-memory rows: approximately 1.18 s for the
  old-style per-row async path versus 0.52 s for the prepared/batched path.
  Rollback, guard restoration, prepared statement reuse, and capture of a
  subsequent local edit passed. This is not an end-to-end cloud benchmark.
- All central migrations and the publication, OAuth-isolation, and profile-picture
  SQL tests passed in a disposable PostgreSQL 17 container using Auth claim
  fixtures. Reapplying the publication migration also passed. No live cloud
  migration or real Realtime-delivery test was performed.
- Android runtime verification is blocked: no device/emulator is connected.
