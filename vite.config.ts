// vite.config.ts
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ""); // carica tutto, anche .env.local

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    envPrefix: ["VITE_"],
    define: {
      "import.meta.env.VITE_ADMIN_SEED": JSON.stringify(env.VITE_ADMIN_SEED ?? ""),
      "import.meta.env.VITE_COMPANY_SEED": JSON.stringify(env.VITE_COMPANY_SEED ?? ""),
      "import.meta.env.VITE_CREATOR_SEED": JSON.stringify(env.VITE_CREATOR_SEED ?? ""),
    },
  };
});
