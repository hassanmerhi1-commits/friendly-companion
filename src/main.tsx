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
// If it fails, check if we have saved server info (PWA mode) before falling back to mock
if (!isElectron()) {
  initBrowserWSMode().then((connected) => {
    if (!connected) {
      // Check if we have saved server info (PWA reopened from home screen)
      const savedInfo = localStorage.getItem('payroll_server_info');
      if (savedInfo) {
        console.log('[PWA] Have saved server info, retrying connection in 2s...');
        // Retry once after a short delay - server might still be loading
        setTimeout(() => {
          initBrowserWSMode().then((retryConnected) => {
            if (!retryConnected) {
              console.log('[PWA] Server unreachable, using mock data temporarily');
              initMockData();
            }
          });
        }, 2000);
      } else {
        initMockData();
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
