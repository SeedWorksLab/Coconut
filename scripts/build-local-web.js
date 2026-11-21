#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const path = require('node:path');

// Metro caches inlined EXPO_PUBLIC values. Explicitly disable hosted mode and
// clear that cache before an account-optional local/Electron export.
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--clear'], {
  cwd: path.resolve(__dirname, '..'),
  env: { ...process.env, EXPO_PUBLIC_COCONUT_HOSTED_WEB: '0' },
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
