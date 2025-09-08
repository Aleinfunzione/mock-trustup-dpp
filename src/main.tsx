import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { useUI } from "@/stores/uiStore";

// Inizializza il tema il prima possibile
(function initThemeEarly() {
  try {
    const saved = (localStorage.getItem("theme") as "light" | "dark" | "system") || "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved === "dark" || (saved === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
  } catch {}
})();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Inizializzazione completa (listener changes) dopo il mount
requestAnimationFrame(() => {
  try {
    useUI.getState().initTheme();
  } catch {}
});
