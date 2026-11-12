const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { safeJoin } = require('./static-server-path');
const { availableVersion } = require('./update-result');

const DIST_DIR = path.join(__dirname, '../dist');
const LOCAL_SERVER_PORT = 47821;
let mainWindow;

function reportUpdateStatus(status) {
  mainWindow?.webContents.send('coconut-updater:status', status);
}

autoUpdater.autoDownload = false;
autoUpdater.on('checking-for-update', () => reportUpdateStatus('checking'));
autoUpdater.on('update-available', () => reportUpdateStatus('available'));
autoUpdater.on('update-not-available', () => reportUpdateStatus('current'));
autoUpdater.on('download-progress', ({ percent }) => reportUpdateStatus(`downloading:${Math.round(percent)}`));
autoUpdater.on('update-downloaded', () => reportUpdateStatus('downloaded'));
autoUpdater.on('error', (error) => reportUpdateStatus(`error:${error.message}`));

ipcMain.handle('coconut-updater:check', async () => {
  const result = await autoUpdater.checkForUpdates();
  return availableVersion(result);
});
ipcMain.handle('coconut-updater:download', async () => autoUpdater.downloadUpdate());
ipcMain.handle('coconut-updater:install', () => autoUpdater.quitAndInstall());

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = safeJoin(DIST_DIR, req.url === '/' ? '/index.html' : req.url);
      if (!filePath) {
        res.writeHead(400);
        res.end('Bad request');
        return;
      }
      fs.stat(filePath, (statErr, stat) => {
        if (statErr || stat.isDirectory()) {
          if (statErr && statErr.code !== 'ENOENT') {
            res.writeHead(500);
            res.end('Internal error');
            return;
          }
          // Expo Router is an SPA; unknown routes fall back to index.html.
          filePath = path.join(DIST_DIR, 'index.html');
        }
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
            // expo-sqlite's web build uses SharedArrayBuffer / OPFS, which
            // requires cross-origin isolation.
            'Cross-Origin-Opener-Policy': 'same-origin',
            'Cross-Origin-Embedder-Policy': 'require-corp',
            'Cross-Origin-Resource-Policy': 'same-origin',
          });
          res.end(data);
        });
      });
    });
    server.on('error', reject);
    server.listen(LOCAL_SERVER_PORT, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function createWindow() {
  const { port } = await startServer();
  const win = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'Coconut',
  });
  mainWindow = win;

  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...(details.responseHeaders || {}) };
    responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
    // responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
    responseHeaders['Cross-Origin-Resource-Policy'] = ['same-origin'];
    callback({ responseHeaders });
  });

  // win.webContents.openDevTools({ mode: 'detach' });
  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});
