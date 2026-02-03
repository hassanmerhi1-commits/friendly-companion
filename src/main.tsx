import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initElectronStorage, isElectron } from "./lib/electron-storage";
import { initMockData } from "./lib/db-live";

// Only register PWA service worker when NOT in Electron
if (!isElectron()) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
    });
  });
  
  // Initialize mock data for browser preview testing
  initMockData();
}

// Simple init - no automatic storage sync
initElectronStorage();

createRoot(document.getElementById("root")!).render(<App />);
