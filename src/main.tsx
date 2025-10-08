import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { prefetchOnIdle } from "@/services/schema/loader";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error('Elemento #root non trovato. Assicurati che index.html contenga <div id="root"></div>.');
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Prefetch schemi (registry) in idle
prefetchOnIdle();
