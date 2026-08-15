import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import Catalogo from "./Catalogo";

const authState = vi.hoisted(() => ({ isAdmin: false }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => authState }));

const baseItem = {
  id: 1,
  nome: "Mouse sem fio",
  descricao: "Mouse óptico",
  codigo_catmat_catser: "CATMAT-1",
  tipo: "material",
  grupo: 2,
  grupo_nome: "TIC",
  unidade_medida: "unidade",
  valor_estimado: "100.00",
  ativo: true,
};
let catalogItems = [baseItem];
const requests = [];

const server = setupServer(
  http.get("*/api/grupos/", () => HttpResponse.json({
    results: [{ id: 2, nome: "TIC", ativo: true }],
  })),
  http.get("*/api/catalogo/", ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({ count: catalogItems.length, next: null, previous: null, results: catalogItems });
  }),
  http.post("*/api/catalogo/", async ({ request }) => {
    const payload = await request.json();
    const created = { ...payload, id: 9, grupo_nome: "TIC", ativo: true };
    catalogItems = [created, ...catalogItems];
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch("*/api/catalogo/:id/", async ({ params, request }) => {
    const payload = await request.json();
    const current = catalogItems.find((item) => item.id === Number(params.id));
    const updated = { ...current, ...payload, grupo_nome: "TIC" };
    catalogItems = catalogItems.map((item) => item.id === updated.id ? updated : item);
    return HttpResponse.json(updated);
  }),
  http.post("*/api/catalogo/:id/desativar/", ({ params }) => {
    const id = Number(params.id);
    const updated = { ...catalogItems.find((item) => item.id === id), ativo: false };
    catalogItems = catalogItems.map((item) => item.id === id ? updated : item);
    return HttpResponse.json(updated);
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  authState.isAdmin = false;
  catalogItems = [baseItem];
  requests.length = 0;
  server.resetHandlers();
});
afterAll(() => server.close());

describe("Catálogo integrado ao cliente HTTP", () => {
  it("envia apenas uma pesquisa após o debounce", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);
    await screen.findByText("Mouse sem fio");
    requests.length = 0;
    await user.type(screen.getByLabelText(/pesquisar por nome ou código/i), "mouse");
    await waitFor(() => {
      expect(requests.some((url) => url.searchParams.get("q") === "mouse")).toBe(true);
    }, { timeout: 1500 });
    expect(requests.filter((url) => url.searchParams.has("q"))).toHaveLength(1);
  });

  it("ADMIN cria, edita e desativa um item pela API", async () => {
    authState.isAdmin = true;
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);
    await screen.findByText("Mouse sem fio");

    await user.click(screen.getByRole("button", { name: /cadastrar item/i }));
    let dialog = screen.getByRole("dialog", { name: /cadastrar item/i });
    await user.type(within(dialog).getByLabelText(/^Nome/), "Teclado");
    await user.type(within(dialog).getByLabelText(/^Descrição/), "Teclado USB");
    await user.selectOptions(within(dialog).getByLabelText(/grupo de contratação/i), "2");
    await user.type(within(dialog).getByLabelText(/unidade de medida/i), "unidade");
    await user.type(within(dialog).getByLabelText(/valor estimado/i), "120");
    await user.click(within(dialog).getByRole("button", { name: /cadastrar item/i }));
    const createdRow = (await screen.findByText("Teclado")).closest("tr");

    await user.click(within(createdRow).getByRole("button", { name: /editar/i }));
    dialog = screen.getByRole("dialog", { name: /editar item/i });
    const nameInput = within(dialog).getByLabelText(/^Nome/);
    await user.clear(nameInput);
    await user.type(nameInput, "Teclado ergonômico");
    await user.click(within(dialog).getByRole("button", { name: /salvar alterações/i }));
    const updatedRow = (await screen.findByText("Teclado ergonômico")).closest("tr");

    await user.click(within(updatedRow).getByRole("button", { name: /desativar/i }));
    await user.click(screen.getByRole("button", { name: /confirmar desativação/i }));
    await waitFor(() => expect(within(updatedRow).getByText("Inativo")).toBeInTheDocument());
  });
});
