import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initElectronStorage, isElectron } from "./lib/electron-storage";
import { initMockData, initBrowserWSMode } from "./lib/db-live";
import { restoreCriticalKeys } from "./lib/resilient-storage";
import { useConnectionStore } from "./lib/connection-store";

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

// Startup: restore critical keys from IndexedDB, then connect
if (!isElectron()) {
  restoreCriticalKeys().then(() => {
    initBrowserWSMode().then((connected) => {
      if (!connected) {
        // Aggressive retry loop - keep trying every 3s if we have server info
        const savedInfo = localStorage.getItem('payroll_server_info');
        if (savedInfo) {
          useConnectionStore.getState().setState('reconnecting');
          console.log('[PWA] Have saved server info, starting retry loop...');
          
          let attempts = 0;
          const retryLoop = setInterval(() => {
            attempts++;
            useConnectionStore.getState().setRetryCount(attempts);
            console.log(`[PWA] Reconnect attempt #${attempts}`);
            
            initBrowserWSMode().then((retryConnected) => {
              if (retryConnected) {
                clearInterval(retryLoop);
                console.log('[PWA] ✅ Connected on attempt', attempts);
              } else if (attempts >= 20) {
                // After ~60s of trying, fall back to mock but keep retrying slower
                clearInterval(retryLoop);
                console.log('[PWA] Server unreachable after 20 attempts, using mock data');
                useConnectionStore.getState().setState('offline');
                initMockData();
                
                // Continue retrying every 10s in background
                setInterval(() => {
                  initBrowserWSMode().then((bgConnected) => {
                    if (bgConnected) {
                      console.log('[PWA] ✅ Background reconnect succeeded');
                      window.location.reload();
                    }
                  });
                }, 10000);
              }
            });
          }, 3000);
        } else {
          initMockData();
        }
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
