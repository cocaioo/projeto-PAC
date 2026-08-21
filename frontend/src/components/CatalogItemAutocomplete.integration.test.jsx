import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import CatalogItemAutocomplete from "./CatalogItemAutocomplete";

const server = setupServer(
  http.get("*/api/catalogo/", ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("q") !== "note") return HttpResponse.json({ results: [] });
    return HttpResponse.json({ results: [{
      id: 5,
      nome: "Notebook institucional",
      tipo: "material",
      descricao: "Configuração homologada",
      unidade_medida: "unidade",
      valor_estimado: "4200.50",
      grupo_nome: "TIC",
      codigo_catmat_catser: "CATMAT-5",
    }] });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("CatalogItemAutocomplete integrado à API", () => {
  it("pesquisa e entrega o item escolhido", async () => {
    const onSelect = vi.fn();
    render(<CatalogItemAutocomplete onSelect={onSelect} />);
    await userEvent.type(screen.getByRole("combobox"), "note");
    await userEvent.click(await screen.findByRole("option", { name: /notebook institucional/i }, { timeout: 1500 }));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 5, grupo_nome: "TIC" }));
  });
});
