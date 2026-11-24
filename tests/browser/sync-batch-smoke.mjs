// With Metro running: CI=1 npx expo start --offline --port 8098
// Then: node tests/browser/sync-batch-smoke.mjs
// No account, cloud endpoint, or existing browser/emulator profile is used.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer, request } from 'node:http';

const metro = process.env.METRO_ORIGIN || 'http://127.0.0.1:8098';
const profile = await mkdtemp('/tmp/opencode/coconut-sync-browser-');
const server = createServer((req, res) => {
  if (req.url === '/') {
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>GitHub Pages sync regression</title><script src="/tests/browser/sync-batch-benchmark.bundle?platform=web&dev=true&hot=false&lazy=true"></script>');
    return;
  }
  const proxy = request(new URL(req.url, metro), (response) => {
    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined) res.setHeader(key, value);
    }
    response.pipe(res);
  });
  proxy.on('error', (error) => { res.statusCode = 502; res.end(error.message); });
  proxy.end();
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_BIN || 'google-chrome', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run',
  '--disable-background-networking', '--disable-sync', '--disable-default-apps',
  '--remote-debugging-pipe', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });
const exited = new Promise((resolve) => chrome.once('exit', resolve));
let sequence = 0;
let buffer = '';
const pending = new Map();
chrome.stdio[4].on('data', (chunk) => {
  buffer += chunk.toString();
  for (let end; (end = buffer.indexOf('\0')) !== -1;) {
    const message = JSON.parse(buffer.slice(0, end));
    buffer = buffer.slice(end + 1);
    const callback = pending.get(message.id);
    if (!callback) continue;
    pending.delete(message.id);
    clearTimeout(callback.timer);
    if (message.error) callback.reject(new Error(JSON.stringify(message.error)));
    else callback.resolve(message.result);
  }
});
function send(method, params = {}, sessionId) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Browser timeout: ${method}`));
    }, 120000);
    pending.set(id, { resolve, reject, timer });
    chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
}
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url: origin }, sessionId);
  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      if (document.readyState !== 'complete') await new Promise(resolve => window.addEventListener('load', resolve, {once: true}));
      if (!window.syncBatchBenchmark) throw new Error('Benchmark bundle did not load');
      return window.syncBatchBenchmark;
    })()`,
    awaitPromise: true, returnByValue: true,
  }, sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  const measured = result.result.value;
  assert.equal(measured.rows, 1000);
  assert.equal(measured.rollbackPreserved, true);
  assert.equal(measured.guardRestored, true);
  assert.equal(measured.localEditsCaptured, true);
  assert.equal(measured.concurrentEditQueued, true);
  console.log(JSON.stringify(measured, null, 2));
} finally {
  for (const callback of pending.values()) clearTimeout(callback.timer);
  pending.clear();
  chrome.kill('SIGTERM');
  await exited;
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
