import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initElectronStorage, isElectron } from "./lib/electron-storage";

// Only register PWA service worker when NOT in Electron
if (!isElectron()) {
  import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
    });
  });
}

// Initialize Electron storage if running in Electron
async function init() {
  await initElectronStorage();
  
  createRoot(document.getElementById("root")!).render(<App />);
}

init();
