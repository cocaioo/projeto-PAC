import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import Catalogo from "./Catalogo";

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ isAdmin: false }),
}));

const requests = [];
const server = setupServer(
  http.get("*/api/grupos/", () => HttpResponse.json({ results: [] })),
  http.get("*/api/catalogo/", ({ request }) => {
    requests.push(new URL(request.url));
    return HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [{
        id: 1,
        nome: "Mouse sem fio",
        tipo: "material",
        grupo_nome: "TIC",
        unidade_medida: "unidade",
        valor_estimado: "100.00",
        ativo: true,
      }],
    });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
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
});
