import { create } from "zustand";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme === "dark" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
}

export const useUI = create<{
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleDark: () => void;
  initTheme: () => void;
}>((set, get) => ({
  theme: "system",
  setTheme: (t) => {
    set({ theme: t });
    localStorage.setItem("theme", t);
    applyTheme(t);
  },
  toggleDark: () => {
    const current = get().theme;
    const next: Theme = current === "dark" ? "light" : "dark";
    get().setTheme(next);
  },
  initTheme: () => {
    const saved = (localStorage.getItem("theme") as Theme) || "system";
    set({ theme: saved });
    applyTheme(saved);
    // aggiorna automaticamente se cambia preferenza di sistema quando theme=system
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (get().theme === "system") applyTheme("system");
    };
    mq.addEventListener?.("change", handler);
  },
}));
