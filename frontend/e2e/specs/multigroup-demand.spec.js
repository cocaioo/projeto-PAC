import {
  CATALOG_GROUP,
  CATALOG_GROUP_B,
  CATALOG_ITEM,
  CATALOG_ITEM_GROUP_B,
  expect,
  test,
  USERS,
} from "../fixtures/pac.js";
import {
  browserApi,
  consolidateValidatedItem,
  correctAndResubmitItem,
  createDraftWithCatalogItems,
  loginAs,
  openDemandForValidation,
  returnItem,
  sendDemand,
  validateItem,
} from "../support/pac-actions.js";

function itemNamed(demand, name) {
  const item = demand.items.find((entry) => entry.name === name);
  if (!item) throw new Error(`Item E2E nao encontrado na demanda: ${name}.`);
  return item;
}

async function demandDetail(page, demandId) {
  const response = await browserApi(page, `/demandas/${demandId}/`);
  expect(response.status).toBe(200);
  return response.data;
}

function expectItemStatus(demand, itemName, status) {
  expect(demand.itens.find((item) => item.nome === itemName)?.status).toBe(status);
}

test.describe("demanda com dois grupos de contratacao", () => {
  test.describe.configure({ mode: "serial" });

  test("isola os admins por item e conclui apos devolucao, reenvio e dois DFDs", async ({ page, marker }) => {
    test.setTimeout(120_000);
    const returnReason = `Corrigir detalhamento do grupo B - ${marker}`;

    await loginAs(page, USERS.usuario);
    const demand = await createDraftWithCatalogItems(page, marker, [
      { name: CATALOG_ITEM, quantity: 2 },
      { name: CATALOG_ITEM_GROUP_B, quantity: 4 },
    ]);
    const itemA = itemNamed(demand, CATALOG_ITEM);
    const itemB = itemNamed(demand, CATALOG_ITEM_GROUP_B);
    await sendDemand(page, demand.demandId);

    let current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("aguardando_validacao");
    expectItemStatus(current, CATALOG_ITEM, "aguardando_validacao");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "aguardando_validacao");

    await loginAs(page, USERS.admin);
    await openDemandForValidation(page, demand.demandId);
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM_GROUP_B })).toHaveCount(0);
    await validateItem(page, CATALOG_ITEM);

    await loginAs(page, USERS.usuario);
    current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("em_andamento");
    expectItemStatus(current, CATALOG_ITEM, "validada");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "aguardando_validacao");

    await loginAs(page, USERS.adminSemAcesso);
    const noPendingAccess = await browserApi(page, `/validacoes/pendentes/?demanda=${demand.demandId}`);
    expect(noPendingAccess.status).toBe(200);
    expect(noPendingAccess.data).toEqual([]);
    const forbiddenDecision = await browserApi(page, "/validacoes/decidir/", {
      method: "POST",
      body: { item_demanda: itemB.id, acao: "validado", comentario: "" },
    });
    expect(forbiddenDecision.status).toBe(403);
    await page.goto("/validacoes");
    await expect(page.getByRole("heading", { name: `Demanda #${demand.demandId}`, exact: true })).toHaveCount(0);

    await loginAs(page, USERS.adminOutroGrupo);
    await openDemandForValidation(page, demand.demandId);
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM_GROUP_B })).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM })).toHaveCount(0);
    await returnItem(page, returnReason, CATALOG_ITEM_GROUP_B);

    await loginAs(page, USERS.usuario);
    current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("em_andamento");
    expectItemStatus(current, CATALOG_ITEM, "validada");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "devolvida");
    await correctAndResubmitItem(page, {
      demandId: demand.demandId,
      itemId: itemB.id,
      itemName: CATALOG_ITEM_GROUP_B,
      marker,
      reason: returnReason,
    });

    await loginAs(page, USERS.adminOutroGrupo);
    await openDemandForValidation(page, demand.demandId);
    await validateItem(page, CATALOG_ITEM_GROUP_B);

    await loginAs(page, USERS.usuario);
    current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("em_andamento");
    expectItemStatus(current, CATALOG_ITEM, "validada");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "validada");

    await loginAs(page, USERS.admin);
    const dfdA = `DFD-A-${marker}`.slice(0, 90);
    await consolidateValidatedItem(page, {
      dfdNumber: dfdA,
      itemName: CATALOG_ITEM,
      groupName: CATALOG_GROUP,
      referenceYear: demand.referenceYear,
    });

    await loginAs(page, USERS.usuario);
    current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("em_andamento");
    expectItemStatus(current, CATALOG_ITEM, "vinculada_dfd");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "validada");

    await loginAs(page, USERS.adminOutroGrupo);
    const dfdB = `DFD-B-${marker}`.slice(0, 90);
    await consolidateValidatedItem(page, {
      dfdNumber: dfdB,
      itemName: CATALOG_ITEM_GROUP_B,
      groupName: CATALOG_GROUP_B,
      referenceYear: demand.referenceYear,
    });

    await loginAs(page, USERS.usuario);
    current = await demandDetail(page, demand.demandId);
    expect(current.status).toBe("concluida");
    expectItemStatus(current, CATALOG_ITEM, "vinculada_dfd");
    expectItemStatus(current, CATALOG_ITEM_GROUP_B, "vinculada_dfd");
    await page.goto(`/demandas/${demand.demandId}`);
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM })).toContainText(dfdA);
    await expect(page.getByRole("row").filter({ hasText: CATALOG_ITEM_GROUP_B })).toContainText(dfdB);
  });

  test("fila ja aberta exibe nova pendencia pelo controle Atualizar fila", async ({ browser, page, marker }) => {
    test.setTimeout(90_000);
    await loginAs(page, USERS.admin);
    await page.goto("/validacoes");
    await expect(page.getByRole("heading", { name: /Demandas recebidas/i })).toBeVisible();

    const requesterContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
    const requesterPage = await requesterContext.newPage();
    try {
      await loginAs(requesterPage, USERS.usuario);
      const demand = await createDraftWithCatalogItems(requesterPage, marker, [
        { name: CATALOG_ITEM, quantity: 1 },
      ]);
      await sendDemand(requesterPage, demand.demandId);

      await page.getByRole("button", { name: /Atualizar fila/i }).click();
      await expect(page.getByRole("heading", { name: `Demanda #${demand.demandId}`, exact: true })).toBeVisible();
      await openDemandForValidation(page, demand.demandId);
      await validateItem(page, CATALOG_ITEM);
    } finally {
      await requesterContext.close();
    }
  });
});
