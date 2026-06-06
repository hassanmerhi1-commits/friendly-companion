/**
 * Download the correct better_sqlite3.node prebuild for the pinned Electron version.
 * Avoids copying stale binaries (wrong NODE_MODULE_VERSION) and avoids needing Visual Studio.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const electronVersion = String(pkg.devDependencies?.electron || '33.4.11').replace(/^[\^~]/, '');

const packedOnly = process.argv.includes('--packed');

const targets = packedOnly
  ? [path.join(root, 'release', 'win-unpacked', 'resources', 'app', 'node_modules', 'better-sqlite3')]
  : [
      path.join(root, 'node_modules', 'better-sqlite3'),
      path.join(root, 'release', 'win-unpacked', 'resources', 'app', 'node_modules', 'better-sqlite3'),
    ];

let installed = 0;

for (const dir of targets) {
  if (!fs.existsSync(path.join(dir, 'package.json'))) {
    continue;
  }

  console.log(`[native] Installing better-sqlite3 prebuild for Electron ${electronVersion} in ${dir}`);
  execSync(`npx prebuild-install --runtime electron --target ${electronVersion}`, {
    cwd: dir,
    stdio: 'inherit',
    shell: true,
  });
  installed += 1;
}

if (installed === 0 && packedOnly) {
  console.warn('[native] Packed app not found — skip (run after electron-builder).');
  process.exit(0);
}

if (installed === 0) {
  console.error('[native] better-sqlite3 package not found. Run npm install first.');
  process.exit(1);
}

console.log('[native] better-sqlite3 prebuild OK');
