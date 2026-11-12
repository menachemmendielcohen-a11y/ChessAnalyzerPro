// Renders the Chess Analyzer Pro logo to PNG / multi-size ICO files.
// Run from app/:  npx electron ../tools/make-icons.js
const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const knight = fs.readFileSync(path.join(root, 'app/src/renderer/pieces/wN.svg')).toString('base64');

// Logo: a dark rounded tile with a green/dark board corner, a white knight,
// a small evaluation bar and a "!!" (brilliant move) badge. `simple` drops details for tiny sizes.
function html(simple) {
  const S = 512;
  return `<html><body style="margin:0;background:transparent;overflow:hidden">
<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c3446"/><stop offset="1" stop-color="#11141b"/></linearGradient>
    <linearGradient id="gr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a6dc66"/><stop offset="1" stop-color="#4f8f2e"/></linearGradient>
    <clipPath id="tile"><rect x="16" y="16" width="480" height="480" rx="108"/></clipPath>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect x="16" y="16" width="480" height="480" rx="108" fill="url(#bg)"/>
  <g clip-path="url(#tile)">
    ${simple ? '' : `<g opacity=".16" fill="#fff">
      <rect x="16" y="16" width="96" height="96"/><rect x="208" y="16" width="96" height="96"/><rect x="400" y="16" width="96" height="96"/>
      <rect x="112" y="112" width="96" height="96"/><rect x="304" y="112" width="96" height="96"/>
      <rect x="16" y="208" width="96" height="96"/><rect x="400" y="208" width="96" height="96"/>
      <rect x="112" y="304" width="96" height="96"/><rect x="304" y="304" width="96" height="96"/>
      <rect x="16" y="400" width="96" height="96"/><rect x="208" y="400" width="96" height="96"/><rect x="400" y="400" width="96" height="96"/>
    </g>`}
    <rect x="16" y="380" width="480" height="116" fill="url(#gr)"/>
  </g>
  <rect x="54" y="${simple ? 70 : 90}" width="${simple ? 46 : 34}" height="${simple ? 370 : 330}" rx="${simple ? 14 : 10}" fill="#11141b" stroke="#fff" stroke-opacity=".35" stroke-width="4"/>
  <rect x="54" y="${simple ? 200 : 210}" width="${simple ? 46 : 34}" height="${simple ? 240 : 210}" rx="${simple ? 14 : 10}" fill="#f4f4f4"/>
  <image href="data:image/svg+xml;base64,${knight}" x="${simple ? 108 : 112}" y="${simple ? 46 : 60}" width="${simple ? 390 : 350}" height="${simple ? 390 : 350}" filter="url(#sh)"/>
  ${simple ? '' : `<circle cx="392" cy="392" r="78" fill="#1fb5ad" stroke="#fff" stroke-width="14"/>
  <text x="392" y="422" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="900" font-size="88" fill="#fff">!!</text>`}
</svg></body></html>`;
}

async function render(simple) {
  const w = new BrowserWindow({ width: 512, height: 512, show: false, frame: false, transparent: true, useContentSize: true, webPreferences: { offscreen: true } });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html(simple)));
  await new Promise((r) => setTimeout(r, 500));
  const img = await w.webContents.capturePage({ x: 0, y: 0, width: 512, height: 512 });
  w.destroy();
  return img;
}

function ico(entries) {
  // entries: [{ size, png }] - PNG-compressed ICO images (supported since Windows Vista).
  const head = Buffer.alloc(6 + 16 * entries.length);
  head.writeUInt16LE(0, 0);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(entries.length, 4);
  let offset = head.length;
  entries.forEach((e, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(e.size >= 256 ? 0 : e.size, o);
    head.writeUInt8(e.size >= 256 ? 0 : e.size, o + 1);
    head.writeUInt8(0, o + 2);
    head.writeUInt8(0, o + 3);
    head.writeUInt16LE(1, o + 4);
    head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(e.png.length, o + 8);
    head.writeUInt32LE(offset, o + 12);
    offset += e.png.length;
  });
  return Buffer.concat([head, ...entries.map((e) => e.png)]);
}

app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});
app.whenReady().then(async () => {
  const full = await render(false);
  const simple = await render(true);
  const at = (img, n) => img.resize({ width: n, height: n, quality: 'best' }).toPNG();
  const pick = (n) => (n <= 32 ? simple : full);
  const sizes = [16, 20, 24, 32, 40, 48, 64, 128, 256];
  const entries = sizes.map((n) => ({ size: n, png: at(pick(n), n) }));
  const icoBuf = ico(entries);
  fs.writeFileSync(path.join(root, 'app/build/icon.ico'), icoBuf);
  fs.writeFileSync(path.join(root, 'app/build/icon.png'), at(full, 512));
  fs.writeFileSync(path.join(root, 'website/favicon.ico'), ico(entries.filter((e) => e.size <= 48)));
  fs.writeFileSync(path.join(root, 'website/assets/logo.png'), at(full, 256));
  for (const n of [16, 32, 48, 128]) fs.writeFileSync(path.join(root, `extension/icons/icon${n}.png`), at(pick(n), n));
  fs.writeFileSync(path.join(root, 'tools/shots/icon-preview.png'), at(full, 256));
  fs.writeFileSync(path.join(root, 'tools/shots/icon-small.png'), at(simple, 64));
  console.log('icons written');
  app.quit();
});
