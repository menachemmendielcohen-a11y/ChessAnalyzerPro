// Chess Analyzer Pro - Electron main process.
// Copyright (C) 2026 Chess Analyzer Pro contributors. Licensed under GPL-3.0-or-later.
'use strict';

const { app, BrowserWindow, dialog, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { Engine } = require('./engine');

let win = null;
let pendingFile = null;

const resourcesDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const enginePath = path.join(resourcesDir, 'engine', 'stockfish.exe');
const engine = new Engine(enginePath);

function pgnFromArgs(argv) {
  return argv.slice(1).find((a) => /\.pgn$/i.test(a) && fs.existsSync(a)) || null;
}

function readPgn(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
    return { path: filePath, name: path.basename(filePath), text };
  } catch (err) {
    return { path: filePath, name: path.basename(filePath), error: String(err.message || err) };
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: '#14161c',
    show: false,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.on('closed', () => {
    win = null;
  });
}

// Dev screenshot runs use their own profile so they never touch an open copy of the app.
if (process.env.CAP_SHOT && !app.isPackaged) app.setPath('userData', path.join(app.getPath('temp'), 'cap-dev-shot'));

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const file = pgnFromArgs(argv);
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      if (file) win.webContents.send('file:opened', readPgn(file));
    }
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('pro.chessanalyzer.app');
    pendingFile = pgnFromArgs(process.argv);
    createWindow();
    // Start the engine in the background so it is ready when a game is chosen.
    engine.start().catch(() => {});
  });

  app.on('window-all-closed', () => {
    engine.quit();
    app.quit();
  });
}

ipcMain.handle('file:choose', async () => {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [
      { name: 'PGN', extensions: ['pgn'] },
      { name: '*', extensions: ['*'] },
    ],
  });
  if (res.canceled || !res.filePaths.length) return null;
  return readPgn(res.filePaths[0]);
});

ipcMain.handle('file:pending', () => {
  const f = pendingFile;
  pendingFile = null;
  return f ? readPgn(f) : null;
});

ipcMain.handle('engine:info', async () => {
  try {
    const info = await engine.start();
    return { ok: true, ...info, version: app.getVersion() };
  } catch (err) {
    return { ok: false, error: String(err.message || err), version: app.getVersion() };
  }
});

ipcMain.handle('engine:analyze', async (_e, { fen, depth, multipv }) => {
  if (typeof fen !== 'string' || fen.length > 120 || !/^[1-8pnbrqkPNBRQK/]+ [wb] [KQkqA-Ha-h-]+ [a-h1-8-]+ \d+ \d+$/.test(fen)) {
    throw new Error('Invalid FEN');
  }
  const d = Math.max(6, Math.min(26, depth | 0));
  const m = Math.max(1, Math.min(5, multipv | 0));
  // Cap the time per position so sharp positions cannot stall the analysis.
  const movetime = d <= 12 ? 500 : d <= 16 ? 1200 : 3500;
  return engine.analyze(fen, { depth: d, multipv: m, movetime });
});

ipcMain.on('engine:stop', () => engine.stop());

ipcMain.handle('app:licenses', () => path.join(resourcesDir, 'engine', 'Copying.txt'));

// Development helper: CAP_SHOT=<png path> saves a screenshot after CAP_SHOT_DELAY ms and quits.
if (process.env.CAP_SHOT && !app.isPackaged) {
  app.whenReady().then(() => {
    setTimeout(async () => {
      if (process.env.CAP_SHOT_JS) await win.webContents.executeJavaScript(process.env.CAP_SHOT_JS).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      const img = await win.webContents.capturePage();
      fs.writeFileSync(process.env.CAP_SHOT, img.toPNG());
      engine.quit();
      app.quit();
    }, parseInt(process.env.CAP_SHOT_DELAY || '8000', 10));
  });
}
