import { expect, test as base } from "@playwright/test";

export const E2E_PASSWORD = process.env.PAC_E2E_PASSWORD || "Pac-E2E-Only-2026!";

export const USERS = Object.freeze({
  usuario: "usuario_e2e",
  admin: "admin_e2e",
  adminOutroGrupo: "admin_outro_e2e",
  adminMaster: "admin_master_e2e",
});

export const CATALOG_ITEM = "Notebook E2E";
export const CATALOG_GROUP = "Tecnologia E2E";

export const test = base.extend({
  marker: async ({}, use, testInfo) => {
    const title = testInfo.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/gu, "")
      .replace(/[^a-z0-9]+/giu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 28);
    await use(`E2E-${testInfo.workerIndex}-${testInfo.retry}-${title}-${Date.now()}`);
  },
});

export { expect };
