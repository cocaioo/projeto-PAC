import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { configDefaults } from "vitest/config";

// Configuração do Vite + Vitest para o front-end React do PAC UFPI.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-router-dom": fileURLToPath(
        new URL("./src/router/react-router-dom.js", import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": `http://127.0.0.1:${process.env.PAC_E2E_BACKEND_PORT || 8000}`,
    },
  },
  build: {
    outDir: "dist",
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    exclude: [...configDefaults.exclude, "e2e/**", "src/performance/**"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
