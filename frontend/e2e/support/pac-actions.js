import { expect } from "@playwright/test";
import { CATALOG_GROUP, CATALOG_ITEM, E2E_PASSWORD } from "../fixtures/pac.js";

const ACCENT = ".";

export async function loginAs(page, username) {
  await page.goto("/login");
  await page.getByLabel(new RegExp(`Usu${ACCENT}rio`, "i")).fill(username);
  await page.getByLabel(/Senha/i).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: /Sair/i })).toBeVisible();
}

export async function browserApi(page, path, { method = "GET", body } = {}) {
  return page.evaluate(async ({ requestPath, requestMethod, requestBody }) => {
    const csrfCookie = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith("csrftoken="));
    const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.split("=").slice(1).join("=")) : "";
    const headers = { Accept: "application/json" };
    if (requestBody !== undefined) headers["Content-Type"] = "application/json";
    if (!new Set(["GET", "HEAD"]).has(requestMethod) && csrfToken) {
      headers["X-CSRFToken"] = csrfToken;
    }

    const response = await fetch(`/api${requestPath}`, {
      method: requestMethod,
      credentials: "include",
      headers,
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, ok: response.ok, data };
  }, { requestPath: path, requestMethod: method, requestBody: body });
}

export async function clickCriticalAction(page, trigger, confirmationName) {
  let nativeDialogHandled = false;
  const acceptNativeDialog = async (dialog) => {
    nativeDialogHandled = true;
    await dialog.accept();
  };
  page.on("dialog", acceptNativeDialog);

  try {
    await trigger.click();
    if (nativeDialogHandled) return;

    const dialog = page.getByRole("dialog").last();
    const modalVisible = await dialog.isVisible({ timeout: 800 }).catch(() => false);
    if (modalVisible) {
      await dialog.getByRole("button", { name: confirmationName }).click();
    }
  } finally {
    page.off("dialog", acceptNativeDialog);
  }
}

export async function createDraftWithCatalog(page, marker, { quantity = 2 } = {}) {
  const referenceYear = new Date().getFullYear() + 1;
  await page.goto("/demandas/nova");
  await expect(page.getByRole("heading", { name: /Nova Demanda/i })).toBeVisible();
  await page.getByLabel(/Ano de refer.ncia/i).fill(String(referenceYear));
  await page.getByLabel(/Observa..o/i).fill(marker);
  await page.getByRole("button", { name: "Salvar", exact: true }).click();
  await expect(page).toHaveURL(/\/demandas\/\d+$/u);

  const match = new URL(page.url()).pathname.match(/\/demandas\/(\d+)$/u);
  if (!match) throw new Error(`Nao foi possivel obter o ID da demanda em ${page.url()}.`);
  const demandId = Number(match[1]);

  await page.getByRole("link", { name: /Adicionar item/i }).click();
  await page.getByLabel(/Selecionar do cat.logo/i).check();
  const catalogSearch = page.getByRole("combobox", { name: /Pesquisar item no cat.logo/i });
  await catalogSearch.fill(CATALOG_ITEM);
  await page.getByRole("option", { name: new RegExp(CATALOG_ITEM, "i") }).click();

  await page.getByLabel(/Quantidade/i).fill(String(quantity));
  await page.getByLabel(/Data prevista/i).fill(`${referenceYear}-06-15`);
  await page.getByLabel(/Indica..o or.ament.ria/i).fill("Recursos institucionais E2E");
  await page.getByLabel(/Justificativa da necessidade/i).fill(`Necessidade automatizada ${marker}`);
  await page.getByLabel(/Observa..es do solicitante/i).fill(marker);
  await page.getByRole("button", { name: "Adicionar item", exact: true }).click();

  await expect(page).toHaveURL(new RegExp(`/demandas/${demandId}$`, "u"));
  const itemRow = page.getByRole("row").filter({ hasText: CATALOG_ITEM });
  await expect(itemRow).toBeVisible();
  await expect(itemRow).toContainText(/Rascunho/i);

  const detailResponse = await browserApi(page, `/demandas/${demandId}/`);
  expect(detailResponse.status).toBe(200);
  const item = detailResponse.data.itens.find((entry) => entry.nome === CATALOG_ITEM);
  if (!item) throw new Error("O item catalogado nao apareceu no detalhe da demanda.");

  return {
    demandId,
    itemId: item.id,
    itemName: item.nome,
    catalogItemId: item.item_catalogo,
    referenceYear,
  };
}

export async function sendDemand(page, demandId) {
  await page.goto(`/demandas/${demandId}`);
  await clickCriticalAction(
    page,
    page.getByRole("button", { name: /Enviar para valida..o/i }),
    /Confirmar envio|Enviar para valida..o|Confirmar/i
  );
  await expect(page.getByText(/Demanda enviada para valida..o/i)).toBeVisible();
  await expect(page.getByText(/Aguardando valida..o/i).first()).toBeVisible();
}

export async function openDemandForValidation(page, demandId) {
  await page.goto("/validacoes");
  const heading = page.getByRole("heading", { name: `Demanda #${demandId}`, exact: true });
  await expect(heading).toBeVisible();
  const demandCard = heading.locator("xpath=ancestor::section");
  await demandCard.getByRole("link", { name: new RegExp(`Abrir demanda ${demandId}`, "i") }).click();
  await expect(page).toHaveURL(new RegExp(`/validacoes/${demandId}$`, "u"));
}

export async function validateItem(page, itemName = CATALOG_ITEM) {
  const row = page.getByRole("row").filter({ hasText: itemName });
  await clickCriticalAction(
    page,
    row.getByRole("button", { name: new RegExp(`Validar item ${itemName}`, "i") }),
    /Confirmar valida..o|Confirmar/i
  );
  await expect(page.getByText(new RegExp(`${itemName} foi validado com sucesso`, "i"))).toBeVisible();
}

export async function consolidateValidatedItem(page, {
  dfdNumber,
  itemName = CATALOG_ITEM,
  referenceYear,
} = {}) {
  await page.goto("/dfds/consolidar");
  await expect(page.getByRole("heading", { name: /Consolida..o e v.nculo de DFD/i })).toBeVisible();

  const cycleSelect = page.getByLabel(/Ciclo PAC|Ciclo de refer.ncia|Ciclo/i);
  if (await cycleSelect.count()) {
    const cycleOption = cycleSelect.locator("option").filter({ hasText: String(referenceYear) }).first();
    await expect(cycleOption).toHaveCount(1);
    const cycleValue = await cycleOption.getAttribute("value");
    if (await cycleSelect.inputValue() !== cycleValue) {
      await cycleSelect.selectOption(cycleValue);
    }
  }

  const groupSelect = page.getByLabel(/Grupo de contrata..o/i);
  if (await groupSelect.count()) {
    const groupOption = groupSelect.locator("option").filter({ hasText: CATALOG_GROUP }).first();
    await expect(groupOption).toHaveCount(1);
    await groupSelect.selectOption(await groupOption.getAttribute("value"));
  }

  const itemCheckbox = page.getByRole("checkbox", {
    name: new RegExp(`Selecionar.*${itemName}`, "i"),
  });
  await expect(itemCheckbox).toBeVisible();
  await itemCheckbox.check();
  await page.getByLabel(/N.mero do DFD/i).fill(dfdNumber);
  await clickCriticalAction(
    page,
    page.getByRole("button", { name: /Consolidar|Vincular DFD/i }).last(),
    /Confirmar consolida..o|Confirmar v.nculo|Consolidar|Vincular|Confirmar/i
  );
  await expect(page.getByText(dfdNumber, { exact: false }).first()).toBeVisible();
}

export async function returnItem(page, reason, itemName = CATALOG_ITEM) {
  const row = page.getByRole("row").filter({ hasText: itemName });
  await row.getByRole("button", { name: new RegExp(`Devolver item ${itemName}`, "i") }).click();
  const dialog = page.getByRole("dialog", { name: /Devolver item ao solicitante/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Justificativa da devolu..o/i).fill(reason);
  await dialog.getByRole("button", { name: /Confirmar devolu..o/i }).click();
  await expect(page.getByText(new RegExp(`${itemName} foi devolvido ao solicitante`, "i"))).toBeVisible();
}

export async function correctAndResubmitItem(page, { demandId, itemId, marker, reason }) {
  await page.goto(`/demandas/${demandId}`);
  const note = page.getByRole("note", { name: new RegExp(`Motivo da devolu..o do item ${CATALOG_ITEM}`, "i") });
  await expect(note).toContainText(reason);

  const row = page.getByRole("row").filter({ hasText: CATALOG_ITEM });
  await row.getByRole("link", { name: new RegExp(`Editar item ${CATALOG_ITEM}`, "i") }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${demandId}/itens/${itemId}/editar$`, "u"));
  await page.getByLabel(/Quantidade/i).fill("3");
  await page.getByLabel(/Observa..es do solicitante/i).fill(`Corrigido: ${marker}`);

  const updateResponse = page.waitForResponse((response) =>
    response.url().endsWith(`/api/itens/${itemId}/`)
      && response.request().method() === "PATCH"
  );
  await page.getByRole("button", { name: /Salvar altera..es/i }).click();
  expect((await updateResponse).ok()).toBeTruthy();

  const resendButton = page.getByRole("button", { name: /^Reenviar$/i });
  await expect(resendButton).toBeEnabled();
  await clickCriticalAction(page, resendButton, /Confirmar reenvio|Reenviar|Confirmar/i);
  await expect(page.getByText(/Item reenviado para valida..o com sucesso/i)).toBeVisible();
}
