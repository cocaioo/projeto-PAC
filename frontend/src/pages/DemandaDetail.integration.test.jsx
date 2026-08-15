import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test-utils";
import DemandaDetail from "./DemandaDetail";

const initialDemand = {
  id: 7,
  unidade_sigla: "STI",
  ano_referencia: 2027,
  usuario_nome: "Ana Silva",
  status: "em_andamento",
  valor_total: "1750.00",
  criado_em: "2026-08-01T12:00:00Z",
  enviada_em: "2026-08-02T12:00:00Z",
  atualizado_em: "2026-08-15T12:00:00Z",
  itens: [
    {
      id: 10,
      nome: "Impressora Laser",
      quantidade: 1,
      valor_estimado: "1500.00",
      valor_total: "1500.00",
      status: "devolvida",
      ultima_devolucao: {
        id: 80,
        comentario: "Detalhar a velocidade mínima de impressão.",
        criado_em: "2026-08-14T15:20:00Z",
        responsavel: { id: 5, nome: "Carlos Admin" },
      },
      dfd: null,
    },
    {
      id: 11,
      nome: "Mouse USB",
      quantidade: 5,
      valor_estimado: "50.00",
      valor_total: "250.00",
      status: "vinculada_dfd",
      ultima_devolucao: null,
      dfd: { id: 31, numero: "DFD-2027-0042" },
    },
  ],
};

let demandRequests = 0;
const server = setupServer(
  http.get("*/api/demandas/7/", () => {
    demandRequests += 1;
    if (demandRequests === 1) return HttpResponse.json(initialDemand);
    return HttpResponse.json({
      ...initialDemand,
      status: "aguardando_validacao",
      itens: initialDemand.itens.map((item) => (
        item.id === 10
          ? { ...item, status: "aguardando_validacao" }
          : item
      )),
    });
  }),
  http.post("*/api/itens/10/reenviar/", () => HttpResponse.json({
    detail: "Item reenviado para validação com sucesso.",
  }))
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  demandRequests = 0;
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("Acompanhamento integrado da demanda", () => {
  it("mostra devolução e DFD e permite reenviar somente o item devolvido", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithRouter(<DemandaDetail />, {
      route: "/demandas/7",
      path: "/demandas/:id",
    });

    expect(await screen.findByText("Detalhar a velocidade mínima de impressão.")).toBeInTheDocument();
    expect(screen.getByText("DFD-2027-0042")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar item impressora laser/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reenviar item mouse usb/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reenviar item impressora laser/i }));

    expect(await screen.findByText(/item reenviado para validação com sucesso/i)).toBeInTheDocument();
    await waitFor(() => expect(demandRequests).toBe(2));
    expect(screen.queryByRole("button", { name: /reenviar item impressora laser/i })).not.toBeInTheDocument();
  });
});
