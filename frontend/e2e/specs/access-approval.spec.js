import { CATALOG_GROUP, E2E_PASSWORD, expect, test, USERS } from "../fixtures/pac.js";
import { browserApi, loginAs } from "../support/pac-actions.js";


function e2eEmail(marker) {
  const suffix = marker.toLowerCase().replace(/[^a-z0-9]+/gu, "").slice(-42);
  return `solicitacao.aprovacao.${suffix}@ufpi.edu.br`;
}


test("Admin Master define perfil e grupo ao aprovar uma solicitação", async ({ page, marker }) => {
  await loginAs(page, USERS.adminMaster);

  const unidadesResponse = await browserApi(page, "/unidades/");
  expect(unidadesResponse.status).toBe(200);
  const unidades = unidadesResponse.data.results || unidadesResponse.data;
  const unidadeSolicitante = unidades.find((unidade) => unidade.sigla === "E2E-CCN");
  expect(unidadeSolicitante).toBeTruthy();

  const email = e2eEmail(marker);
  const solicitacaoResponse = await browserApi(page, "/auth/solicitar-acesso/", {
    method: "POST",
    body: {
      nome_completo: "Solicitante de Aprovação E2E",
      email,
      unidade_id: unidadeSolicitante.id,
      senha: E2E_PASSWORD,
    },
  });
  expect(solicitacaoResponse.status).toBe(201);

  const pendingResponse = await browserApi(page, "/admin/solicitacoes/?status=pendente");
  expect(pendingResponse.status).toBe(200);
  const pending = (pendingResponse.data.results || pendingResponse.data)
    .find((item) => item.email === email);
  expect(pending).toBeTruthy();
  expect(pending).not.toHaveProperty("senha_hash");

  await page.goto("/admin/usuarios");
  const row = page.getByRole("row").filter({ hasText: email });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "Aprovar" }).click();

  const dialog = page.getByRole("dialog", { name: /Definir acesso do usu.rio/i });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel(/Permiss.o \/ perfil/i).selectOption("admin");

  const groupSelect = dialog.getByLabel(/Grupo de contrata..o/i);
  const groupOption = groupSelect.locator("option").filter({ hasText: CATALOG_GROUP }).first();
  await expect(groupOption).toHaveCount(1);
  const groupId = await groupOption.getAttribute("value");
  await groupSelect.selectOption(groupId);

  const approvalRequest = page.waitForRequest((request) =>
    request.url().endsWith(`/api/admin/solicitacoes/${pending.id}/aprovar/`)
      && request.method() === "POST"
  );
  await dialog.getByRole("button", { name: /Confirmar aprova..o/i }).click();
  expect((await approvalRequest).postDataJSON()).toEqual({
    perfil: "admin",
    grupos_administrados: [Number(groupId)],
  });

  const usersResponse = await browserApi(page, "/admin/usuarios/?perfil=admin");
  expect(usersResponse.status).toBe(200);
  const users = usersResponse.data.results || usersResponse.data;
  const approved = users.find((user) => user.email === email);
  expect(approved).toBeTruthy();
  expect(approved.perfil).toBe("admin");
  expect(approved.grupos_nomes).toContain(CATALOG_GROUP);
});
