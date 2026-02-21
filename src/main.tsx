import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initElectronStorage, isElectron } from "./lib/electron-storage";
import { initMockData } from "./lib/db-live";

// Initialize mock data for browser preview testing
if (!isElectron()) {
  initMockData();
}

// Simple init - no automatic storage sync
initElectronStorage();

createRoot(document.getElementById("root")!).render(<App />);
