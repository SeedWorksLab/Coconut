# SSO implementation verification

## Passed locally

- `npm run typecheck`
- `npm run lint`
- `npm test -- --runInBand`: 69 suites, 681 tests, including PKCE generation,
  callback state/age/replay checks, duplicate callback handling, server-verified
  token identity and real Supabase SDK refresh/rotation via the OAuth endpoint.
- `npm run export:hosted-web`: root-based hosted bundle and ZIP.
- `npx expo export --platform web`: compilation checked.
- `npm run export:web`: cache-cleared account-optional export. Inspected both
  compiled modes after consecutive hosted/local builds: local uses hostname
  detection rather than a forced hosted flag; hosted mode is explicitly enabled.
  Electron now calls this isolated local export to prevent cached flags from
  changing its login requirements.
- Website `npm run check` and `npm test`: consent validation, lookalike/open
  redirects, account switching during consent, denial, existing grants and
  explicit revocation. A test executes the pinned browser SDK to check its
  actual OAuth grant API contract.
- Deployment workflow YAML, embedded shell/Python syntax, archive root assets,
  CNAME, `.nojekyll`, SPA fallback and no-referrer policy validated locally.
- All backend migrations loaded into a disposable PostgreSQL 17 container
  with stubbed Supabase Auth SQL helpers. `oauth-isolation.sql` passed.
- PostgREST 14.5 was then run against that isolated database with synthetic,
  locally signed test JWTs. Thirteen HTTP checks passed: allowed Coconut access,
  rejected Banana tables/RPCs, rejected central profiles/overview/internal RPC,
  restricted usage reporting, rejected unknown clients, and compatible legacy
  password/native access, and central-only backend readiness checks. Both test
  containers were stopped afterward.
- `git diff --check` in Coconut, the website and Supabase.

## Not yet verified

No production migrations, Edge Function deployments, commits, pushes, releases,
DNS changes or Pages deployments were performed as part of implementation.

- The actual hosted Supabase OAuth flow, callback CORS, token refresh,
  revocation, secure-password-change behavior and updated Edge Function need
  staging/production acceptance testing with a test account.
- GitHub Actions deployment and custom-domain HTTPS must be exercised after
  configuration and publication.
- No Android device/emulator was connected. Android runtime verification is
  pending; no emulator data was changed.
- No real-browser end-to-end test has run. The frontend interaction tests use
  mocked DOM/Auth responses, supplemented by actual SDK and isolated API tests.

Follow `hosted-web.md` in order. Local passing tests are not a claim of a
production security audit or of completed production rollout.
