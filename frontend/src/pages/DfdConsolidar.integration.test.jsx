import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DfdConsolidar from "./DfdConsolidar";

const authState = vi.hoisted(() => ({ isAdmin: true, loading: false }));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => authState }));

const eligibleItem = {
  ciclo_pac: { id: 9, ano: 2027, ativo: true },
  grupo_contratacao: { id: 2, nome: "Tecnologia da Informação" },
  item_catalogo: {
    id: 15,
    nome: "Notebook",
    codigo_catmat_catser: "CATMAT-15",
    unidade_medida: "unidade",
  },
  quantidade_total: 5,
  valor_total_estimado: "10000.00",
  total_solicitacoes: 2,
  item_ids: [51, 52],
  detalhamento_por_unidade: [],
};

const itemRequests = [];
const postedPayloads = [];
let rejectConsolidation = false;

const server = setupServer(
  http.get("*/api/consolidacoes/ciclos/", () => HttpResponse.json([
    { id: 9, ano: 2027, ativo: true, total_itens_elegiveis: 2 },
  ])),
  http.get("*/api/consolidacoes/itens-elegiveis/", ({ request }) => {
    itemRequests.push(new URL(request.url));
    return HttpResponse.json([eligibleItem]);
  }),
  http.post("*/api/dfds/consolidar/", async ({ request }) => {
    const payload = await request.json();
    postedPayloads.push(payload);
    if (rejectConsolidation) {
      return HttpResponse.json(
        { detail: "Um ou mais itens não estão elegíveis para consolidação." },
        { status: 409 }
      );
    }
    return HttpResponse.json({
      dfd: {
        id: 80,
        numero: payload.numero_dfd,
        ciclo_pac: { id: 9, ano: 2027 },
        grupo_contratacao: { id: 2, nome: "Tecnologia da Informação" },
      },
      itens_vinculados: 2,
      item_ids: payload.item_ids,
      demandas_afetadas: [31, 32],
    }, { status: 201 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("consolidação integrada ao cliente HTTP", () => {
  beforeEach(() => {
    authState.isAdmin = true;
    authState.loading = false;
    itemRequests.length = 0;
    postedPayloads.length = 0;
    rejectConsolidation = false;
  });

  it("consulta os itens elegíveis usando filtros do contrato novo", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    expect(itemRequests.at(-1).searchParams.get("ciclo_pac_id")).toBe("9");
    await user.selectOptions(screen.getByLabelText("Grupo de contratação"), "2");
    await waitFor(() => {
      expect(itemRequests.at(-1).searchParams.get("grupo_contratacao_id")).toBe("2");
    });
    await user.selectOptions(screen.getByLabelText("Item de catálogo"), "15");
    await waitFor(() => {
      const lastRequest = itemRequests.at(-1);
      expect(lastRequest.searchParams.get("ciclo_pac_id")).toBe("9");
      expect(lastRequest.searchParams.get("grupo_contratacao_id")).toBe("2");
      expect(lastRequest.searchParams.get("item_catalogo_id")).toBe("15");
    });
  });

  it("envia IDs elegíveis e exibe o resultado devolvido pela API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    await user.type(screen.getByLabelText(/Número do DFD/i), "DFD-2027-01");
    await user.click(screen.getByRole("checkbox", { name: /selecionar notebook/i }));
    await user.click(screen.getByRole("button", { name: /revisar e vincular/i }));
    const dialog = screen.getByRole("dialog", { name: /confirmar vínculo do dfd/i });
    await user.click(within(dialog).getByRole("button", { name: "Confirmar vínculo" }));

    await waitFor(() => expect(postedPayloads).toEqual([{
      numero_dfd: "DFD-2027-01",
      ciclo_pac_id: 9,
      item_ids: [51, 52],
    }]));
    expect(await screen.findByText("Consolidação concluída")).toBeInTheDocument();
    expect(screen.getByText("DFD-2027-01")).toBeInTheDocument();
  });

  it("mantém a tela e apresenta conflito quando os itens deixam de ser elegíveis", async () => {
    rejectConsolidation = true;
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    await user.type(screen.getByLabelText(/Número do DFD/i), "DFD-CONFLITO");
    await user.click(screen.getByRole("checkbox", { name: /selecionar notebook/i }));
    await user.click(screen.getByRole("button", { name: /revisar e vincular/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar vínculo" }));

    const openDialog = screen.getByRole("dialog", { name: /confirmar vínculo do dfd/i });
    expect(await within(openDialog).findByText(/não estão elegíveis para consolidação/i)).toBeInTheDocument();
  });
});
