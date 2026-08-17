import { expect, test, USERS } from "../fixtures/pac.js";
import { loginAs } from "../support/pac-actions.js";

const VIEWPORT = { width: 1280, height: 800 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const PIXEL_TOLERANCE = 1;
const ROUTES = [
  {
    name: "catálogo",
    path: "/catalogo",
    username: USERS.usuario,
    heading: /Cat.logo de itens/i,
    expectsTable: true,
  },
  {
    name: "demandas",
    path: "/demandas",
    username: USERS.usuario,
    heading: /Minhas demandas/i,
  },
  {
    name: "validações",
    path: "/validacoes",
    username: USERS.admin,
    heading: /Demandas recebidas/i,
  },
  {
    name: "consolidação de DFD",
    path: "/dfds/consolidar",
    username: USERS.admin,
    heading: /Consolida..o e v.nculo de DFD/i,
  },
];

async function waitForStablePage(page, route) {
  await page.goto(route.path);
  await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
  await expect(page.getByText(/Carregando/i)).toHaveCount(0);
  await page.evaluate(async () => {
    if (document.fonts) await document.fonts.ready;
  });
}

async function installControlledOverflow(page) {
  const main = page.locator('[data-scroll-container="main"]');
  await expect(main).toHaveCount(1);
  await main.evaluate((node) => {
    const inner = node.querySelector(":scope > .app-content__inner");
    if (!inner) throw new Error("AppLayout sem .app-content__inner.");

    const probe = document.createElement("div");
    probe.setAttribute("data-e2e-scroll-probe", "");
    probe.style.display = "flex";
    probe.style.height = "160vh";
    probe.style.alignItems = "flex-end";

    const focusTarget = document.createElement("button");
    focusTarget.type = "button";
    focusTarget.textContent = "Alvo de foco da rolagem";
    focusTarget.setAttribute("data-e2e-scroll-focus", "");
    probe.append(focusTarget);
    inner.prepend(probe);
  });
  return main;
}

async function readLayoutMetrics(page) {
  return page.evaluate((tolerance) => {
    const main = document.querySelector('[data-scroll-container="main"]');
    const scrollingElement = document.scrollingElement;
    const tableWraps = [...document.querySelectorAll(".pac-table-wrap")];
    const verticalScrollers = [...document.body.querySelectorAll("*")]
      .filter((element) => {
        const { overflowY } = getComputedStyle(element);
        return (
          ["auto", "scroll"].includes(overflowY)
          && element.scrollHeight > element.clientHeight + tolerance
        );
      })
      .map((element) => element.getAttribute("data-scroll-container") || (
        element.classList.contains("app-sidebar__nav") ? "sidebar" : "unexpected"
      ));

    return {
      bodyHasScroll: document.body.scrollHeight > document.body.clientHeight + tolerance,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      documentClientHeight: scrollingElement.clientHeight,
      documentScrollHeight: scrollingElement.scrollHeight,
      documentScrollTop: scrollingElement.scrollTop,
      mainOverflowY: getComputedStyle(main).overflowY,
      mainClientHeight: main.clientHeight,
      mainScrollHeight: main.scrollHeight,
      declaredScrollContainers: [
        ...document.querySelectorAll("[data-scroll-container]"),
      ].map((element) => element.getAttribute("data-scroll-container")),
      verticalScrollers,
      tableWraps: tableWraps.map((element) => ({
        direction: element.getAttribute("data-scroll-direction"),
        overflowY: getComputedStyle(element).overflowY,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      })),
    };
  }, PIXEL_TOLERANCE);
}

async function resetScroll(page, main) {
  await main.evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.evaluate(() => {
    document.scrollingElement.scrollTop = 0;
  });
}

async function expectDocumentAtTop(page) {
  await expect.poll(() => page.evaluate(
    () => document.scrollingElement.scrollTop
  )).toBe(0);
}

async function expectMainScrolled(main) {
  await expect.poll(() => main.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
}

async function exerciseScrollInputs(page, main) {
  await resetScroll(page, main);
  await main.hover();
  await page.mouse.wheel(0, 600);
  await expectMainScrolled(main);
  await expectDocumentAtTop(page);

  for (const key of ["PageDown", "Space", "ArrowDown"]) {
    await resetScroll(page, main);
    await main.focus();
    await page.keyboard.press(key);
    await expectMainScrolled(main);
    await expectDocumentAtTop(page);
  }

  await resetScroll(page, main);
  await main.focus();
  await page.keyboard.press("Tab");
  const focusTarget = page.locator("[data-e2e-scroll-focus]");
  await expect(focusTarget).toBeFocused();
  await expect(focusTarget).toBeInViewport();
  await expectMainScrolled(main);
  await expectDocumentAtTop(page);
}

test.describe("contrato de rolagem do AppLayout", () => {
  for (const route of ROUTES) {
    test(`${route.name}: mantém um único dono da rolagem vertical`, async ({ page }) => {
      await page.setViewportSize(VIEWPORT);
      await loginAs(page, route.username);
      await waitForStablePage(page, route);
      const main = await installControlledOverflow(page);
      const metrics = await readLayoutMetrics(page);

      expect(metrics.bodyHasScroll).toBe(false);
      expect(["hidden", "clip"]).toContain(metrics.bodyOverflowY);
      expect(metrics.documentScrollHeight).toBeLessThanOrEqual(
        metrics.documentClientHeight + PIXEL_TOLERANCE
      );
      expect(metrics.documentScrollTop).toBe(0);
      expect(["auto", "scroll"]).toContain(metrics.mainOverflowY);
      expect(metrics.mainScrollHeight).toBeGreaterThan(
        metrics.mainClientHeight + PIXEL_TOLERANCE
      );
      expect(metrics.declaredScrollContainers).toEqual(["main"]);
      expect(metrics.verticalScrollers).toEqual(["main"]);
      if (route.expectsTable) expect(metrics.tableWraps.length).toBeGreaterThan(0);
      for (const table of metrics.tableWraps) {
        expect(table.direction).toBe("horizontal");
        expect(["hidden", "clip"]).toContain(table.overflowY);
        expect(table.scrollHeight).toBeLessThanOrEqual(
          table.clientHeight + PIXEL_TOLERANCE
        );
      }

      await page.evaluate(() => window.scrollTo(0, 99_999));
      await expectDocumentAtTop(page);
      await exerciseScrollInputs(page, main);
    });
  }

  test("viewport móvel preserva o main vertical e a tabela horizontal", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await loginAs(page, USERS.usuario);
    await waitForStablePage(page, ROUTES[0]);
    const main = await installControlledOverflow(page);
    const metrics = await readLayoutMetrics(page);
    const topology = await page.evaluate(() => {
      const shell = document.querySelector(".app-shell");
      const appMain = document.querySelector(".app-main");
      const header = document.querySelector(".app-header");
      const mainElement = document.querySelector('[data-scroll-container="main"]');
      const sidebarNav = document.querySelector(".app-sidebar__nav");
      return {
        shellDirection: getComputedStyle(shell).flexDirection,
        appMainHeight: appMain.clientHeight,
        mainBottom: mainElement.getBoundingClientRect().bottom,
        headerTop: header.getBoundingClientRect().top,
        headerBottom: header.getBoundingClientRect().bottom,
        sidebarOverflowY: getComputedStyle(sidebarNav).overflowY,
      };
    });

    expect(metrics.bodyHasScroll).toBe(false);
    expect(metrics.declaredScrollContainers).toEqual(["main"]);
    expect(metrics.mainScrollHeight).toBeGreaterThan(metrics.mainClientHeight + PIXEL_TOLERANCE);
    expect(topology.shellDirection).toBe("column");
    expect(topology.appMainHeight).toBeGreaterThan(0);
    expect(topology.mainBottom).toBeLessThanOrEqual(MOBILE_VIEWPORT.height + PIXEL_TOLERANCE);
    expect(topology.headerTop).toBeGreaterThanOrEqual(0);
    expect(topology.headerBottom).toBeLessThanOrEqual(MOBILE_VIEWPORT.height);
    expect(["hidden", "clip"]).toContain(topology.sidebarOverflowY);

    const table = page.locator('.pac-table-wrap[data-scroll-direction="horizontal"]').first();
    await expect(table).toBeVisible();
    const horizontalMetrics = await table.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
      return {
        overflowX: getComputedStyle(element).overflowX,
        overflowY: getComputedStyle(element).overflowY,
        scrollLeft: element.scrollLeft,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    });
    expect(["auto", "scroll"]).toContain(horizontalMetrics.overflowX);
    expect(["hidden", "clip"]).toContain(horizontalMetrics.overflowY);
    expect(horizontalMetrics.scrollWidth).toBeGreaterThan(horizontalMetrics.clientWidth);
    expect(horizontalMetrics.scrollLeft).toBeGreaterThan(0);

    await exerciseScrollInputs(page, main);
  });
});
