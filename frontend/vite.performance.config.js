import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-router-dom": fileURLToPath(
        new URL("./src/router/react-router-dom.js", import.meta.url)
      ),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./vitest.setup.js",
    include: ["src/performance/**/*.test.{js,jsx}"],
    testTimeout: 15_000,
    css: false,
  },
});
