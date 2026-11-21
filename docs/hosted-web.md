# App subdomains on GitHub Pages

## One-time setup

1. Commit and push the Coconut build changes and deployment workflow to the
   default branch before creating the next release. Do not reuse an old web ZIP:
   it contains the former `/apps/coconut/web` asset prefix.
2. In `SeedWorksLab/Coconut` → Settings → Pages, select **GitHub Actions** as
   the build/deployment source. Set the custom domain to
   `coconut.seedworkslab.de`. Keep the organization website's domain unchanged.
3. At the DNS provider for `seedworkslab.de`, add:

   | Type | Name | Target |
   | --- | --- | --- |
   | CNAME | `coconut` | `seedworkslab.github.io` |

   The target is the organization Pages hostname, not a repository URL or a
   path. Remove conflicting records for `coconut`, not records for the apex.
   Prefer DNS-only mode while GitHub validates the domain and issues TLS.
4. Verify ownership of `seedworkslab.de` in the organization's Pages settings
   using GitHub's supplied TXT record. Avoid wildcard DNS records pointing to
   Pages; explicitly configure each app subdomain.
5. Wait for DNS validation and certificate provisioning, then enable **Enforce
   HTTPS** in Coconut's Pages settings. If the custom-domain control is not
   available until the first deployment, complete it immediately afterward.
6. Register the exact Coconut callback under **OAuth Apps** (see below).
   This is separate from the general Auth redirect allowlist. Keep the central
   account portal's signup/recovery URLs in that general allowlist; do not
   replace the shared project's Site URL with Coconut's domain.

## Central SSO: required rollout order

The browser integration is configured for the public OAuth client
`978d0b67-d40a-4cd2-a686-b0e4f9ab4d22`, using
`https://coconut.seedworkslab.de/auth/callback`.
This is a public identifier, not a secret. Confirm client type **Public** and
token endpoint authentication **none** in Supabase. No secret belongs in an
Expo environment variable or the website.

1. Back up the backend, review and test
   `Supabase/supabase/migrations/20261121120000_oauth_client_isolation.sql`,
   then apply it using the normal reviewed Supabase deployment procedure.
   It adds restrictive app-client RLS and a PostgREST pre-request guard that
   also blocks cross-app security-definer RPCs. It aborts rather than replacing
   an existing pre-request hook. If one exists, compose both checks explicitly.
   Verify the hook is active in PostgREST; do not enable production OAuth
   without this boundary. New app tables must also have a restrictive client
   policy, and new clients need an explicit backend allowlist change.
   The consent page checks `seed_oauth_sso_ready()` before displaying or
   approving a request and fails closed if the migration or loaded hook is
   missing. Recycle/reload PostgREST connections if configuration has not loaded.
2. Redeploy the updated `delete-account` Edge Function. It rejects OAuth-client
   tokens even if a non-browser caller spoofs an allowed Origin. Central account
   deletion still requires current-password verification and confirmation.
3. Deploy the central website, including `/oauth/consent.html` and its scripts.
   Supabase Site URL must be `https://seedworkslab.de`, authorization path
   `/oauth/consent.html`, and dynamic registration disabled. Keep the exact
   signup/recovery redirect URLs documented for the account page. Enable secure
   password changes in Supabase; OAuth access tokens are still authenticated
   Supabase tokens, not merely email-only credentials.
4. Configure DNS/Pages/HTTPS above, then publish a release containing the new
   hosted export. Actions verifies the release archive's SHA-256 manifest,
   rejects unsafe ZIP entries and deploys the exact archive. Action revisions
   are pinned; no cross-repository token is needed.
5. Before announcing availability, test with a non-production account:
   signed-out login → central sign-in → consent → Coconut; an existing central
   session without another password; denial; refresh-token rotation; direct
   callback refresh and callback replay rejection; local sign-out; account
   switching between tabs; grant revocation; and database denial when a Coconut
   OAuth token requests Banana or central-account endpoints. Check local/native
   sign-in remains unchanged. Never paste tokens into browser URLs or logs.

SSO only runs on the exact production origins. A hosted bundle served on
localhost can be used for UI checks but cannot initiate production SSO. For
end-to-end staging, register a separate public client and exact callback and
explicitly configure the corresponding trusted frontend/backend allowlists.

### Security and session semantics

- The PKCE verifier and random state live in the initiating tab's session storage.
  Callback transactions expire after ten minutes and are consumed once. Codes
  and errors are removed from history before token exchange.
- The frontend verifies the returned access token with the trusted Auth `/user`
  endpoint and checks issuer, audience, client, role, expiry and user identity.
  It requests only the `email` scope and does not request or rely on ID tokens.
- One hosted Supabase client owns storage locking and refresh-token rotation.
  Its refresh transport uses `/auth/v1/oauth/token` with the public client ID,
  not the ordinary password-session refresh endpoint.
- Local storage remains readable by same-origin JavaScript. CSP, pinned
  dependencies and origin isolation reduce risk, but this is not an HttpOnly
  backend-for-frontend architecture. Do not use a shared/untrusted browser.
- “Sign out” in Coconut signs out that app session. Central sign-out is separate.
  The account page lists OAuth grants and allows revocation. Revocation stops
  refresh; already-issued JWTs may remain usable until expiry. Offline caches
  cannot learn that a remote session was revoked; they remain local data and
  are not encrypted or remotely erased.
- The old same-origin build retains its existing session behavior during data
  migration. Tokens without a `client_id` retain legacy/native access; this
  migration isolates OAuth clients, not already-issued password sessions.

## Releases

Use the existing release procedure, for example
`seed release coconut <version> --github --agent-notes`, then review and publish
the draft. The release already uploads `coconut-web-<version>.zip`. Publication
of a non-prerelease starts the Pages workflow, which deploys that ZIP without
rebuilding from a different revision. The workflow uses the built-in GitHub
token and Pages OIDC permissions; no PAT or deploy key is required.

Do not publish releases using a workflow's `GITHUB_TOKEN` and expect a second
release-event workflow to run: GitHub suppresses that chaining. The current
local `seed`/GitHub CLI release flow or manual draft publication triggers it.
Check the Actions run and `github-pages` environment after publication.
To retry a failed deployment, rerun its Actions job. Publishing an older stable
release also deploys its archive, so use that only as an intentional rollback.

Direct navigation and refresh on nested routes use the exported `404.html` as
the SPA shell. GitHub Pages still returns HTTP 404 for those direct requests;
the app router handles the original path. No marketing-site script is needed.

## Existing browser data

`seedworkslab.de` and `coconut.seedworkslab.de` are different origins. Browser
SQLite, local storage and auth sessions do not carry across. The website keeps
the previous `/apps/coconut/web/` build available during migration rather than
redirecting users away from their data. Before switching, users should check
that all changes have synced, and export a backup where available. Sign in on
the new subdomain and let its initial cloud pull complete; verify the data.
Unsynced changes remain accessible only on the old origin. Do not clear that
origin's storage or remove its build until migration has been verified.

## Future apps

Repeat with the app repository's own Pages workflow, a root-based export and
an explicit `<app>.seedworkslab.de` CNAME targeting `seedworkslab.github.io`.
Keep marketing/documentation pages at `seedworkslab.de/apps/<app>/`.
Each app has independent deployment, local storage and login sessions. Register
an individual public OAuth client, extend the central consent registry and
backend client boundary explicitly, and use PKCE rather than sharing tokens.
