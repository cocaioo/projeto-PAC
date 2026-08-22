const { chromium } = require("@playwright/test");

const port = Number(process.env.PAC_LIGHTHOUSE_PORT || 4173);
const origin = `http://127.0.0.1:${port}`;

module.exports = {
  ci: {
    collect: {
      chromePath: process.env.PAC_LIGHTHOUSE_CHROME_PATH || chromium.executablePath(),
      numberOfRuns: 1,
      url: [
        `${origin}/dashboard`,
        `${origin}/demandas`,
        `${origin}/demandas/1`,
        `${origin}/catalogo`,
        `${origin}/validacoes`,
        `${origin}/dfds/consolidar`,
      ],
      settings: {
        budgetPath: "./performance/budgets.json",
        chromeFlags: "--no-sandbox --disable-dev-shm-usage",
        onlyCategories: ["performance", "accessibility", "best-practices"],
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.75 }],
        "categories:accessibility": ["error", { minScore: 0.85 }],
        "categories:best-practices": ["warn", { minScore: 0.8 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 3_000 }],
        interactive: ["warn", { maxNumericValue: 5_000 }],
        "performance-budget": "error",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
