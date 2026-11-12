// Dev helper: screenshots of the generated website. Run from app/: npx electron ../tools/shot-site.js
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const site = path.join(__dirname, '..', 'website');
const outDir = path.join(__dirname, 'shots');
const shots = [
  ['he-desktop', 'index.html', 1280, 900, 0],
  ['he-desktop-2', 'index.html', 1280, 900, 1500],
  ['he-mobile', 'index.html', 390, 800, 0],
  ['en-install', 'en/install.html', 1280, 900, 0],
];
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [name, file, w, h, scroll] of shots) {
    const win = new BrowserWindow({ width: w, height: h, show: false, useContentSize: true });
    await win.loadFile(path.join(site, file));
    await win.webContents.executeJavaScript(`window.scrollTo(0, ${scroll})`);
    await new Promise((r) => setTimeout(r, 700));
    fs.writeFileSync(path.join(outDir, name + '.png'), (await win.webContents.capturePage()).toPNG());
    win.destroy();
  }
  app.quit();
});
