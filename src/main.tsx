import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Ensure the Service Worker is registered so the app is installable (PWA)
registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
