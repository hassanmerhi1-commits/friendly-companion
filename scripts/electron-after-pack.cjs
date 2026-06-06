/**
 * electron-builder afterPack — install Electron-matched better-sqlite3 prebuild.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  const { appOutDir, electronPlatformName, packager } = context;
  if (electronPlatformName !== 'win32') return;

  const projectDir = packager.projectDir;
  const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, 'package.json'), 'utf8'));
  const electronVersion = String(pkg.devDependencies?.electron || '33.4.11').replace(/^[\^~]/, '');

  const sqliteDir = path.join(appOutDir, 'resources', 'app', 'node_modules', 'better-sqlite3');
  if (!fs.existsSync(path.join(sqliteDir, 'package.json'))) {
    console.warn('[afterPack] better-sqlite3 not in packed app — skipping native install');
    return;
  }

  console.log(`[afterPack] prebuild-install better-sqlite3 for Electron ${electronVersion}`);
  execSync(`npx prebuild-install --runtime electron --target ${electronVersion}`, {
    cwd: sqliteDir,
    stdio: 'inherit',
    shell: true,
  });
};
