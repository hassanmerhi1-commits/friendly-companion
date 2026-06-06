/**
 * electron-builder afterPack — ensure better_sqlite3.node is bundled for server mode.
 */
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName !== 'win32') return;

  const projectDir = packager.projectDir;
  const appRoot = path.join(appOutDir, 'resources', 'app');
  const dest = path.join(appRoot, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node');
  const resourceCopy = path.join(appOutDir, 'resources', 'better_sqlite3.node');

  const sources = [
    path.join(projectDir, 'native-modules', 'better-sqlite3', 'Release', 'better_sqlite3.node'),
    path.join(projectDir, 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
    path.join(projectDir, 'release-test', 'win-unpacked', 'resources', 'app', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
  ];

  for (const src of sources) {
    if (!fs.existsSync(src)) continue;
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
    fs.copyFileSync(src, resourceCopy);
    console.log('[afterPack] Installed better_sqlite3.node from', src);
    return;
  }

  console.warn('[afterPack] WARNING: better_sqlite3.node not found — server database mode will fail until native module is installed.');
};
