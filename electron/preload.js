const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('coconutUpdater', {
  check: () => ipcRenderer.invoke('coconut-updater:check'),
  download: () => ipcRenderer.invoke('coconut-updater:download'),
  install: () => ipcRenderer.invoke('coconut-updater:install'),
  onStatus: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('coconut-updater:status', listener);
    return () => ipcRenderer.removeListener('coconut-updater:status', listener);
  },
});
