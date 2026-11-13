#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'build', 'hosted-web');
const archive = path.join(root, 'build', 'coconut-web.zip');
const env = { ...process.env, EXPO_PUBLIC_COCONUT_HOSTED_WEB: '1' };
const result = spawnSync('npx', ['expo', 'export', '--platform', 'web', '--output-dir', output], {
  cwd: root, env, stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status || 1);

const htmlFile = path.join(output, 'index.html');
let html = fs.readFileSync(htmlFile, 'utf8');
const policy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://qslmlcvskctvyngofipe.supabase.co https://api.github.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-src 'none'",
  'upgrade-insecure-requests',
].join('; ');
html = html.replace('<head>', `<head>\n    <meta name="robots" content="noindex">\n    <meta name="referrer" content="no-referrer">\n    <meta http-equiv="Content-Security-Policy" content="${policy}">`);
html = html.replace('</head>', '  <script src="/assets/js/coconut-route-redirect.js"></script>\n  </head>');
if (!html.includes('/apps/coconut/web/_expo/')) {
  throw new Error('Hosted web export is missing its GitHub Pages asset prefix.');
}
fs.writeFileSync(htmlFile, html);
fs.copyFileSync(htmlFile, path.join(output, '404.html'));
fs.rmSync(archive, { force: true });
const zipped = spawnSync('zip', ['-q', '-r', archive, '.'], { cwd: output, stdio: 'inherit' });
if (zipped.status !== 0) process.exit(zipped.status || 1);
console.log(`Hosted web bundle: ${archive}`);
