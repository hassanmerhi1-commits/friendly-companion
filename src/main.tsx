import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initElectronStorage, isElectron } from "./lib/electron-storage";
import { initMockData, initBrowserWSMode } from "./lib/db-live";

// Guard against service worker issues in iframes and preview hosts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Only register PWA service worker when NOT in Electron and NOT in preview
if (!isElectron() && !isPreviewHost && !isInIframe) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
    });
  });
}

// Simple init - no automatic storage sync
initElectronStorage();

// Try browser WebSocket mode (for phone/browser access via HTTP server)
// If it fails (not served from PayrollAO), fall back to mock data
if (!isElectron()) {
  initBrowserWSMode().then((connected) => {
    if (!connected) {
      initMockData();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
