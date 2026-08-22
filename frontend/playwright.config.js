import { defineConfig, devices } from "@playwright/test";

const frontendPort = Number(process.env.PAC_E2E_FRONTEND_PORT || 4173);
const backendPort = Number(process.env.PAC_E2E_BACKEND_PORT || 8000);
const baseURL = process.env.PAC_E2E_BASE_URL || `http://127.0.0.1:${frontendPort}`;
const manageServers = process.env.PAC_E2E_EXTERNAL_SERVERS !== "1";

export default defineConfig({
  testDir: "./e2e/specs",
  outputDir: "./test-results/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  globalSetup: manageServers ? "./e2e/support/global-setup.mjs" : undefined,
  globalTeardown: manageServers ? "./e2e/support/global-teardown.mjs" : undefined,
  reporter: process.env.CI
    ? [["line"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Fortaleza",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
