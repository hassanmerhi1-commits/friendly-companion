/**
 * Fail fast when package.json and package-lock.json versions diverge (breaks npm ci on CI).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const lockRoot = lock.packages?.['']?.version || lock.version;

if (pkg.version !== lock.version || pkg.version !== lockRoot) {
  console.error(
    `[version-sync] MISMATCH package.json=${pkg.version} lock.version=${lock.version} lock.root=${lockRoot}`
  );
  process.exit(1);
}

console.log(`[version-sync] OK — ${pkg.version}`);
