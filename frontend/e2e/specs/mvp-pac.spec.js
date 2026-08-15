import { CATALOG_GROUP, CATALOG_ITEM, expect, test, USERS } from "../fixtures/pac.js";
import {
  browserApi,
  clickCriticalAction,
  correctAndResubmitItem,
  createDraftWithCatalog,
  loginAs,
  openDemandForValidation,
  returnItem,
  sendDemand,
  validateItem,
} from "../support/pac-actions.js";

test.describe("MVP PAC", () => {
  test.describe.configure({ mode: "serial" });

  test("fluxo feliz: rascunho, envio, validacao, consolidacao e DFD", async ({ page, marker }) => {
    await loginAs(page, USERS.usuario);
    const demand = await createDraftWithCatalog(page, marker);
    await sendDemand(page, demand.demandId);

    await loginAs(page, USERS.admin);
    await openDemandForValidation(page, demand.demandId);
    await validateItem(page, demand.itemName);

    const dfdNumber = `DFD-${marker}`.slice(0, 90);
    await page.goto("/dfds/consolidar");
    await expect(page.getByRole("heading", { name: /Consolida..o e v.nculo de DFD/i })).toBeVisible();

    const cycleSelect = page.getByLabel(/Ciclo PAC|Ciclo de refer.ncia|Ciclo/i);
    if (await cycleSelect.count()) {
      const cycleOption = cycleSelect.locator("option").filter({ hasText: String(demand.referenceYear) }).first();
      await expect(cycleOption).toHaveCount(1);
      await cycleSelect.selectOption(await cycleOption.getAttribute("value"));
    }
    const groupSelect = page.getByLabel(/Grupo de contrata..o/i);
    if (await groupSelect.count()) {
      const groupOption = groupSelect.locator("option").filter({ hasText: CATALOG_GROUP }).first();
      await expect(groupOption).toHaveCount(1);
      await groupSelect.selectOption(await groupOption.getAttribute("value"));
    }

    const itemCheckbox = page.getByRole("checkbox", { name: new RegExp(`Selecionar.*${CATALOG_ITEM}`, "i") });
    await expect(itemCheckbox).toBeVisible();
    await itemCheckbox.check();
    await page.getByLabel(/N.mero do DFD/i).fill(dfdNumber);
    await clickCriticalAction(
      page,
      page.getByRole("button", { name: /Consolidar|Vincular DFD/i }).last(),
      /Confirmar consolida..o|Confirmar v.nculo|Consolidar|Vincular|Confirmar/i
    );
    await expect(page.getByText(dfdNumber, { exact: false }).first()).toBeVisible();

    await loginAs(page, USERS.usuario);
    await page.goto(`/demandas/${demand.demandId}`);
    const itemRow = page.getByRole("row").filter({ hasText: CATALOG_ITEM });
    await expect(itemRow).toContainText(dfdNumber);
    await expect(itemRow).toContainText(/Vinculada ao DFD/i);
  });

  test("devolucao: usuario ve o motivo, corrige, reenvia e admin valida", async ({ page, marker }) => {
    const reason = `Ajustar quantitativo e detalhamento - ${marker}`;
    await loginAs(page, USERS.usuario);
    const demand = await createDraftWithCatalog(page, marker);
    await sendDemand(page, demand.demandId);

    await loginAs(page, USERS.admin);
    await openDemandForValidation(page, demand.demandId);
    await returnItem(page, reason, demand.itemName);

    await loginAs(page, USERS.usuario);
    await correctAndResubmitItem(page, { ...demand, marker, reason });

    await loginAs(page, USERS.admin);
    await openDemandForValidation(page, demand.demandId);
    await validateItem(page, demand.itemName);
  });

  test("permissao negada: rota administrativa e grupo alheio ficam bloqueados", async ({ page, marker }) => {
    await loginAs(page, USERS.usuario);
    await page.goto("/validacoes");
    await expect(page).toHaveURL(/\/$/u);
    await expect(page.getByRole("heading", { name: /Demandas recebidas/i })).toHaveCount(0);

    const demand = await createDraftWithCatalog(page, marker);
    await sendDemand(page, demand.demandId);

    await loginAs(page, USERS.adminOutroGrupo);
    const forbidden = await browserApi(page, "/validacoes/decidir/", {
      method: "POST",
      body: { item_demanda: demand.itemId, acao: "validado", comentario: "" },
    });
    expect(forbidden.status).toBe(403);

    await page.goto("/validacoes");
    await expect(page.getByRole("heading", { name: `Demanda #${demand.demandId}`, exact: true })).toHaveCount(0);
    await expect(page.getByText(/Nenhuma demanda pendente/i)).toBeVisible();
  });

  test("duplicidade: o mesmo item do catalogo nao pode entrar duas vezes", async ({ page, marker }) => {
    await loginAs(page, USERS.usuario);
    const demand = await createDraftWithCatalog(page, marker);
    const existingItemsLoaded = page.waitForResponse((response) =>
      response.url().endsWith(`/api/demandas/${demand.demandId}/`)
        && response.request().method() === "GET"
    );
    await page.getByRole("link", { name: /Adicionar item/i }).click();
    expect((await existingItemsLoaded).ok()).toBeTruthy();

    let duplicatePosts = 0;
    const countDuplicatePost = (request) => {
      if (request.method() === "POST" && request.url().endsWith(`/api/demandas/${demand.demandId}/itens/`)) {
        duplicatePosts += 1;
      }
    };
    page.on("request", countDuplicatePost);

    await page.getByLabel(/Selecionar do cat.logo/i).check();
    await page.getByRole("combobox", { name: /Pesquisar item no cat.logo/i }).fill(CATALOG_ITEM);
    await page.getByRole("option", { name: new RegExp(CATALOG_ITEM, "i") }).click();
    await expect(page.getByRole("alert").filter({ hasText: /j. foi adicionado . demanda/i })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar item", exact: true }).click();
    await expect(page.getByRole("alert").filter({
      hasText: /j. foi adicionado . demanda|Selecione um item do cat.logo/i,
    })).toBeVisible();
    expect(duplicatePosts).toBe(0);
    page.off("request", countDuplicatePost);

    const backendDefense = await browserApi(page, `/demandas/${demand.demandId}/itens/`, {
      method: "POST",
      body: {
        item_catalogo: demand.catalogItemId,
        quantidade: 1,
        data_prevista: `${demand.referenceYear}-07-15`,
        prioridade: "media",
        justificativa_prioridade: "",
        justificativa_necessidade: "Tentativa duplicada E2E",
        indicacao_orcamentaria: "Recursos E2E",
      },
    });
    expect(backendDefense.status).toBe(400);
    expect(backendDefense.data.item_catalogo).toBeTruthy();
  });

  test("catalogo administrativo: usuario comum consulta, mas nao altera", async ({ page }) => {
    await loginAs(page, USERS.usuario);
    await page.goto("/catalogo");
    await expect(page.getByRole("heading", { name: /Cat.logo de itens/i })).toBeVisible();
    await expect(page.getByText(CATALOG_ITEM, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Cadastrar item/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Editar$/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Desativar|Ativar/i })).toHaveCount(0);

    const forbidden = await browserApi(page, "/catalogo/", {
      method: "POST",
      body: {
        tipo: "material",
        nome: "Tentativa indevida E2E",
        descricao: "Nao deve ser criada",
        grupo: 1,
        unidade_medida: "unidade",
        valor_estimado: 1,
      },
    });
    expect(forbidden.status).toBe(403);
  });

  test("catalogo administrativo: ADMIN cadastra item e ele permanece na listagem", async ({ page, marker }) => {
    const itemName = `Mouse institucional ${marker}`;
    const itemCode = `E2E-${marker.slice(-20)}`;

    await loginAs(page, USERS.admin);
    await page.goto("/catalogo");
    await page.getByRole("button", { name: /Cadastrar item/i }).click();

    const dialog = page.getByRole("dialog", { name: /Cadastrar item no cat.logo/i });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel(/^Tipo/i).selectOption("material");
    await dialog.getByLabel(/^Nome/i).fill(itemName);
    await dialog.getByLabel(/Descri..o/i).fill("Mouse padronizado criado pelo fluxo E2E administrativo.");
    await dialog.getByLabel(/C.digo CATMAT\/CATSER/i).fill(itemCode);

    const groupSelect = dialog.getByLabel(/Grupo de contrata..o/i);
    const groupOption = groupSelect.locator("option").filter({ hasText: CATALOG_GROUP }).first();
    await expect(groupOption).toHaveCount(1);
    await groupSelect.selectOption(await groupOption.getAttribute("value"));
    await dialog.getByLabel(/Unidade de medida/i).fill("unidade");
    await dialog.getByLabel(/Valor estimado/i).fill("175.90");
    await dialog.getByRole("button", { name: /Cadastrar item/i }).click();

    await expect(dialog).toBeHidden();
    await expect(page.getByText(/Item cadastrado com sucesso/i)).toBeVisible();
    let itemRow = page.getByRole("row").filter({ hasText: itemName });
    await expect(itemRow).toContainText(itemCode);
    await expect(itemRow).toContainText(/Ativo/i);

    await page.reload();
    const search = page.getByLabel(/Pesquisar por nome ou c.digo/i);
    const refreshedRequest = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/catalogo/"
        && url.searchParams.get("q") === itemName
        && response.request().method() === "GET";
    });
    await search.fill(itemName);
    expect((await refreshedRequest).ok()).toBeTruthy();
    itemRow = page.getByRole("row").filter({ hasText: itemName });
    await expect(itemRow).toContainText(itemCode);
  });
});
