// Electron app entrypoint for electron-builder default main ("index.js").
// This file is intentionally tiny and only delegates to the real main process.

(async () => {
  await import('./electron/main.cjs');
})();
