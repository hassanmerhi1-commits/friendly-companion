// Electron app entrypoint for electron-builder default main ("index.js").
// This file is intentionally tiny and only delegates to the real main process.
// Using require() instead of import() for compatibility with electron-builder.

require('./electron/main.cjs');
