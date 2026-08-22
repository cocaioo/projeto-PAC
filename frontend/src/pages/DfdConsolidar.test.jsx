import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DfdConsolidar, { sumVisualQuantities } from "./DfdConsolidar";
import { api } from "../api/client";

const authState = vi.hoisted(() => ({ isAdmin: true, loading: false }));

vi.mock("../auth/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("../api/client", () => ({
  api: {
    listConsolidationCycles: vi.fn(),
    listEligibleConsolidationItems: vi.fn(),
    consolidarDfd: vi.fn(),
  },
}));

const notebook = {
  ciclo_pac: { id: 9, ano: 2027, ativo: true },
  grupo_contratacao: { id: 2, nome: "Tecnologia da Informação" },
  item_catalogo: {
    id: 15,
    nome: "Notebook",
    codigo_catmat_catser: "CATMAT-15",
    unidade_medida: "unidade",
  },
  quantidade_total: 7,
  valor_total_estimado: "14000.00",
  total_solicitacoes: 2,
  item_ids: [51, 52],
  detalhamento_por_unidade: [
    {
      unidade: { id: 3, nome: "Superintendência de TI", sigla: "STI" },
      quantidade_total: 7,
      total_solicitacoes: 2,
      solicitacoes: [
        {
          item_id: 51,
          demanda_id: 31,
          solicitante: { id: 8, nome: "Ana Silva" },
          quantidade: 3,
          valor_total: "6000.00",
        },
        {
          item_id: 52,
          demanda_id: 32,
          solicitante: { id: 9, nome: "Bruno Lima" },
          quantidade: 4,
          valor_total: "8000.00",
        },
      ],
    },
  ],
};

const veiculo = {
  ...notebook,
  grupo_contratacao: { id: 4, nome: "Transportes" },
  item_catalogo: {
    id: 18,
    nome: "Veículo utilitário",
    codigo_catmat_catser: "CATMAT-18",
    unidade_medida: "unidade",
  },
  quantidade_total: 1,
  valor_total_estimado: "120000.00",
  total_solicitacoes: 1,
  item_ids: [60],
  detalhamento_por_unidade: [],
};

describe("DfdConsolidar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isAdmin = true;
    authState.loading = false;
    api.listConsolidationCycles.mockResolvedValue([
      { id: 9, ano: 2027, ativo: true, total_itens_elegiveis: 3 },
    ]);
    api.listEligibleConsolidationItems.mockResolvedValue([notebook, veiculo]);
    api.consolidarDfd.mockResolvedValue({
      dfd: {
        id: 80,
        numero: "123/2027",
        ciclo_pac: { id: 9, ano: 2027 },
        grupo_contratacao: { id: 2, nome: "Tecnologia da Informação" },
      },
      itens_vinculados: 2,
      item_ids: [51, 52],
      demandas_afetadas: [31, 32],
    });
  });

  it("soma visualmente as quantidades agrupadas", () => {
    expect(sumVisualQuantities([notebook, veiculo])).toBe(8);
  });

  it("organiza itens por grupo e detalha unidade, solicitante e quantidade", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);

    expect(await screen.findByRole("checkbox", { name: /selecionar notebook/i })).toBeInTheDocument();
    expect(screen.getAllByText("Tecnologia da Informação").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Transportes").length).toBeGreaterThan(0);
    expect(screen.getAllByText("7").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Status: Validada")).toHaveLength(2);

    await user.click(screen.getByText("Detalhar por unidade e solicitante"));
    expect(screen.getByText(/STI — Superintendência de TI/)).toBeInTheDocument();
    expect(screen.getByText(/Ana Silva/)).toBeInTheDocument();
    expect(screen.getByText(/Demanda #31/)).toBeInTheDocument();
  });

  it("valida número e seleção antes de abrir a confirmação", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    await user.click(screen.getByRole("button", { name: /revisar e vincular dfd/i }));
    expect(await screen.findByText("Informe o número do DFD.")).toBeInTheDocument();

    await user.type(screen.getByLabelText(/número do dfd/i), "123/2027");
    await user.click(screen.getByRole("button", { name: /revisar e vincular dfd/i }));
    expect(await screen.findByText("Selecione ao menos um item elegível.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("confirma, envia o contrato novo e mostra o DFD sem recarregar a página", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />, {
      route: "/dfds/consolidar",
      path: "/dfds/consolidar",
      extraRoutes: [{ path: "/dfds/:id", element: <p>Detalhe do DFD</p> }],
    });
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    await user.type(screen.getByLabelText(/número do dfd/i), "123/2027");
    await user.click(screen.getByRole("checkbox", { name: /selecionar notebook/i }));
    expect(screen.getByText((_, element) => (
      element.classList.contains("consolidacao-actions")
      && element.textContent.includes("2 solicitação(ões) selecionada(s)")
    ))).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /revisar e vincular dfd/i }));

    const dialog = screen.getByRole("dialog", { name: "Confirmar vínculo do DFD" });
    expect(api.consolidarDfd).not.toHaveBeenCalled();
    expect(within(dialog).getByText("123/2027")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Confirmar vínculo" }));

    await waitFor(() => expect(api.consolidarDfd).toHaveBeenCalledWith({
      numero_dfd: "123/2027",
      ciclo_pac_id: 9,
      item_ids: [51, 52],
    }));
    expect(await screen.findByText("Consolidação concluída")).toBeInTheDocument();
    expect(screen.getByText("123/2027")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir DFD" })).toHaveAttribute("href", "/dfds/80");
  });

  it("impede combinar itens de grupos diferentes no mesmo DFD", async () => {
    const user = userEvent.setup();
    renderWithRouter(<DfdConsolidar />);
    await screen.findByRole("checkbox", { name: /selecionar notebook/i });

    await user.click(screen.getByRole("checkbox", { name: /selecionar notebook/i }));
    expect(screen.getByRole("checkbox", { name: /selecionar veículo utilitário/i })).toBeDisabled();
    expect(screen.getByText(/limpe a seleção do outro grupo/i)).toBeInTheDocument();
  });

  it("bloqueia o conteúdo para quem não é ADMIN", () => {
    authState.isAdmin = false;
    renderWithRouter(<DfdConsolidar />);

    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(api.listConsolidationCycles).not.toHaveBeenCalled();
  });
});
