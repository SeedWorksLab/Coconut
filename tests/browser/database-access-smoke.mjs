// Run with: node tests/browser/database-access-smoke.mjs
// Uses installed Chrome, an isolated temporary profile, and no real account.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import ts from 'typescript';

const profile = await mkdtemp('/tmp/opencode/coconut-storage-browser-');
const server = createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end('<!doctype html><title>Coconut isolated storage test</title>');
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
    }, 15000);
    pending.set(id, { resolve, reject, timer });
    chrome.stdio[3].write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
}
async function evaluate(session, expression) {
  const result = await send('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  }, session);
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}
const compile = async (name) => ts.transpileModule(
  await readFile(new URL(`../../src/database/${name}.ts`, import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const errors = await compile('database-access-error');
const access = await compile('database-access.web');
const install = `(() => {
  const errors = {};
  (function(exports) { ${errors} })(errors);
  const access = {};
  (function(exports, require) { ${access} })(access, () => errors);
  window.storageAccess = access;
})()`;

async function newTab() {
  const { targetId } = await send('Target.createTarget', { url: origin });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  // Navigating through CDP is ordered with subsequent renderer evaluation.
  await send('Page.navigate', { url: origin }, sessionId);
  await evaluate(sessionId, 'document.readyState === "complete" ? true : new Promise(resolve => window.addEventListener("load", () => resolve(true), { once: true }))');
  await evaluate(sessionId, install);
  return { targetId, sessionId };
}

// A real OPFS sync handle in a dedicated worker, as required by the browser.
function openFile(mode) {
  const source = `self.onmessage = async ({data: mode}) => {
    try {
      const root = await navigator.storage.getDirectory();
      const file = await root.getFileHandle('isolated-test.db', {create: true});
      self.handle = await file.createSyncAccessHandle();
      if (mode === 'write') {
        self.handle.write(new TextEncoder().encode('saved-data'), {at: 0});
        self.handle.flush();
      }
      const bytes = new Uint8Array(self.handle.getSize());
      self.handle.read(bytes, {at: 0});
      self.postMessage({saved: new TextDecoder().decode(bytes)});
    } catch (error) {
      self.postMessage({error: error.name});
    }
  }`;
  window.fileWorker = new Worker(URL.createObjectURL(new Blob([source], { type: 'application/javascript' })));
  return new Promise((resolve) => {
    window.fileWorker.onmessage = ({ data }) => resolve(data);
    window.fileWorker.postMessage(mode);
  });
}

try {
  await send('Browser.getVersion');
  const first = await newTab();
  const second = await newTab();
  await evaluate(first.sessionId, 'storageAccess.acquireDatabaseAccess().then(() => true)');
  assert.deepEqual(await evaluate(first.sessionId, `(${openFile})('write')`), { saved: 'saved-data' });

  const blocked = await evaluate(second.sessionId,
    'storageAccess.acquireDatabaseAccess().then(() => ({opened: true}), error => ({kind: error.kind, message: error.message}))');
  assert.equal(blocked.kind, 'busy');
  assert.match(blocked.message, /Close the other Coconut tabs/);

  // Confirm that bypassing the guard reproduces the original browser error.
  assert.deepEqual(await evaluate(second.sessionId, `(${openFile})('read')`), { error: 'NoModificationAllowedError' });
  await evaluate(second.sessionId, 'fileWorker.terminate()');
  await send('Target.closeTarget', { targetId: first.targetId });
  // Queue one short test-only lock to await complete context teardown.
  await evaluate(second.sessionId, 'navigator.locks.request(storageAccess.DATABASE_ACCESS_LOCK, () => true)');
  await evaluate(second.sessionId, 'storageAccess.acquireDatabaseAccess().then(() => true)');
  assert.deepEqual(await evaluate(second.sessionId, `(${openFile})('read')`), { saved: 'saved-data' });
  console.log('PASS: Chrome blocks a second tab before OPFS opens; retry after closing the owner succeeds; saved data is preserved.');
} finally {
  for (const callback of pending.values()) clearTimeout(callback.timer);
  pending.clear();
  chrome.kill('SIGTERM');
  await exited;
  await new Promise((resolve) => server.close(resolve));
  await rm(profile, { recursive: true, force: true });
}
