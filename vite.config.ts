import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-i18next', 'i18next'],
    exclude: ['better-sqlite3', 'electron-updater', 'ws'],
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3', 'electron-updater', 'ws', 'electron'],
    },
  },
}));
