# Release notes

Agents write `<version>.md` here after completing and verifying the selected plan.
Use user-facing paragraphs, `###` headings and `-` bullets, without wrappers.
`seed release coconut <version> --github --agent-notes` includes this text in
the marked GitHub Release Notes section. Publish the draft to expose it to apps.
Edit that published section to correct public notes without rebuilding.

## Historical Coconut notes

The existing hardcoded history is preserved here as `<version>.md` (English),
`de/<version>.md`, and `hu/<version>.md`. `legacy-whats-new.json` additionally
retains every original version, date, introduction and feature without flattening
the structured data. The TypeScript originals remain the app's offline fallback.

`node scripts/export-legacy-release-notes.js` previews an export; `--write` writes
missing files only and refuses to overwrite edited notes. This is a one-time
migration tool, not the source for future releases.

From the workspace, `seed notes backfill coconut` previews adding these notes
to existing published GitHub releases. `--apply` explicitly changes release
descriptions after saving local backups. Existing descriptions, assets and dates
are retained; missing releases and already marked notes are not overwritten.
