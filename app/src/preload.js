// Chess Analyzer Pro - preload bridge. GPL-3.0-or-later.
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cap', {
  chooseFile: () => ipcRenderer.invoke('file:choose'),
  pendingFile: () => ipcRenderer.invoke('file:pending'),
  onFileOpened: (cb) => ipcRenderer.on('file:opened', (_e, file) => cb(file)),
  engineInfo: () => ipcRenderer.invoke('engine:info'),
  analyze: (fen, depth, multipv) => ipcRenderer.invoke('engine:analyze', { fen, depth, multipv }),
  stop: () => ipcRenderer.send('engine:stop'),
});
