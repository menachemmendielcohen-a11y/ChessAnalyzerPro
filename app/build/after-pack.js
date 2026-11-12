// Sets the program icon and version info on the Windows exe after packaging.
// (electron-builder's own step needs a signing toolkit that cannot be unpacked on every machine.)
const path = require('path');
module.exports = async (context) => {
  if (context.electronPlatformName !== 'win32') return;
  const mod = await import('rcedit');
  const rcedit = mod.rcedit || mod.default;
  const name = context.packager.appInfo.productFilename;
  const exe = path.join(context.appOutDir, `${name}.exe`);
  const v = context.packager.appInfo.version;
  await rcedit(exe, {
    icon: path.join(__dirname, 'icon.ico'),
    'file-version': v,
    'product-version': v,
    'version-string': {
      ProductName: 'Chess Analyzer Pro',
      FileDescription: 'Chess Analyzer Pro',
      CompanyName: 'Chess Analyzer Pro',
      LegalCopyright: 'GPL-3.0-or-later',
      OriginalFilename: `${name}.exe`,
    },
  });
};
