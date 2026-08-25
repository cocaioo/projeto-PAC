import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import CatalogItemAutocomplete from "../components/CatalogItemAutocomplete";
import { Table } from "../components/ui";
import Dashboard from "../pages/Dashboard";
import DfdConsolidar from "../pages/DfdConsolidar";
import ValidacoesList from "../pages/ValidacoesList";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    dashboardStats: vi.fn(),
    listConsolidationCycles: vi.fn(),
    listCatalogo: vi.fn(),
    listEligibleConsolidationItems: vi.fn(),
    listGrupos: vi.fn(),
    listPendentes: vi.fn(),
    listUnidades: vi.fn(),
    consolidarDfd: vi.fn(),
  },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ isAdmin: true }),
}));

afterEach(() => vi.clearAllMocks());

describe("orçamento de renderização do frontend", () => {
  it("mantém uma tabela de mil itens utilizável durante o scroll da página", () => {
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      nome: `Item ${index + 1}`,
      quantidade: (index % 20) + 1,
    }));
    const Linha = vi.fn(function Linha({ row }) {
      return <tr><td>{row.nome}</td><td>{row.quantidade}</td></tr>;
    });
    const inicio = performance.now();

    const { container } = render(
      <main className="app-content">
        <Table caption="Massa de desempenho">
          <thead><tr><th>Item</th><th>Quantidade</th></tr></thead>
          <tbody>
            {rows.map((row) => <Linha key={row.id} row={row} />)}
          </tbody>
        </Table>
      </main>
    );

    const main = container.querySelector("main.app-content");
    const tabela = screen.getByRole("table", { name: "Massa de desempenho" });
    expect(main).toContainElement(tabela);
    expect(screen.getAllByRole("row")).toHaveLength(1_001);
    expect(Linha).toHaveBeenCalledTimes(1_000);

    const observadorScroll = vi.fn();
    main.addEventListener("scroll", observadorScroll);
    main.dispatchEvent(new window.Event("scroll"));
    main.removeEventListener("scroll", observadorScroll);

    expect(observadorScroll).toHaveBeenCalledTimes(1);
    expect(Linha).toHaveBeenCalledTimes(1_000);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });

  it("processa uma resposta grande do autocomplete com uma única chamada", async () => {
    const catalogo = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      nome: `Notebook ${String(index + 1).padStart(3, "0")}`,
      codigo_catmat_catser: `CAT-${index + 1}`,
      grupo_nome: "TIC",
      valor_estimado: "4500.00",
    }));
    api.listCatalogo.mockResolvedValue({ results: catalogo });
    const inicio = performance.now();

    const { rerender } = render(<CatalogItemAutocomplete onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "notebook" } });

    await waitFor(() => expect(api.listCatalogo).toHaveBeenCalledTimes(1), { timeout: 2_000 });
    expect(await screen.findAllByRole("option", {}, { timeout: 3_000 })).toHaveLength(500);
    rerender(<CatalogItemAutocomplete onSelect={vi.fn()} />);
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(api.listCatalogo).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });

  it("agrupa uma fila grande de validação com uma única chamada de pendências", async () => {
    const itensPendentes = Array.from({ length: 250 }, (_, index) => {
      const demandaId = Math.floor(index / 5) + 1;
      const unidadeId = ((demandaId - 1) % 10) + 1;
      return {
        id: index + 1,
        demanda: demandaId,
        demanda_id: demandaId,
        nome: `Item pendente ${index + 1}`,
        quantidade: (index % 8) + 1,
        valor_total: "1500.00",
        status: "aguardando_validacao",
        grupo_id: 1,
        grupo_nome: "TIC",
        demanda_dados: {
          id: demandaId,
          ano_referencia: 2027,
          status: "aguardando_validacao",
          observacao: `Demanda de desempenho ${demandaId}`,
          enviada_em: "2026-08-15T12:00:00Z",
          unidade: {
            id: unidadeId,
            nome: `Unidade ${unidadeId}`,
            sigla: `UNI-${unidadeId}`,
          },
          usuario: {
            id: demandaId,
            nome: `Solicitante ${demandaId}`,
            username: `solicitante_${demandaId}`,
          },
        },
      };
    });
    api.listPendentes.mockResolvedValue(itensPendentes);
    api.listUnidades.mockResolvedValue([]);
    api.listGrupos.mockResolvedValue([]);
    const inicio = performance.now();

    render(
      <MemoryRouter>
        <ValidacoesList />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Demanda #1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Demanda #50" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Analisar itens da demanda \d+/i })).toHaveLength(50);
    expect(screen.getAllByText("5 itens pendentes")).toHaveLength(50);
    expect(api.listPendentes).toHaveBeenCalledTimes(1);
    expect(api.listPendentes).toHaveBeenCalledWith({
      unidade: undefined,
      grupo: undefined,
    });
    expect(api.listUnidades).toHaveBeenCalledTimes(1);
    expect(api.listGrupos).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });

  it("renderiza indicadores realistas do dashboard com uma única chamada", async () => {
    api.dashboardStats.mockResolvedValue({
      total_demandas: 5_000,
      total_itens: 25_000,
      aguardando_validacao: 6_000,
      validados: 10_000,
      consolidados: 7_500,
      total_dfds: 1_500,
      valor_total_estimado: "987654321.50",
      itens_por_status: {
        rascunho: 500,
        aguardando_validacao: 6_000,
        devolvida: 750,
        validada: 10_000,
        vinculada_dfd: 7_500,
        cancelada: 250,
      },
    });
    const inicio = performance.now();

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("25000")).toBeInTheDocument();
    expect(screen.getAllByText("10000")).toHaveLength(2);
    expect(api.dashboardStats).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });

  it("renderiza consolidação volumosa por grupos com chamadas únicas", async () => {
    const linhas = Array.from({ length: 75 }, (_, index) => {
      const grupoNumero = (index % 5) + 1;
      const itemNumero = index + 1;
      const itemIds = Array.from(
        { length: 4 },
        (_, solicitacaoIndex) => index * 4 + solicitacaoIndex + 1
      );
      return {
        ciclo_pac: { id: 99, ano: 2099, ativo: true },
        grupo_contratacao: { id: grupoNumero, nome: `Grupo ${grupoNumero}` },
        item_catalogo: {
          id: itemNumero,
          nome: `Item catalogado ${itemNumero}`,
          codigo_catmat_catser: `PERF-${String(itemNumero).padStart(3, "0")}`,
          unidade_medida: "unidade",
        },
        quantidade_total: 10,
        valor_total_estimado: "10000.00",
        total_solicitacoes: 4,
        item_ids: itemIds,
        detalhamento_por_unidade: Array.from({ length: 2 }, (_, unidadeIndex) => ({
          unidade: {
            id: unidadeIndex + 1,
            nome: `Unidade ${unidadeIndex + 1}`,
            sigla: `UNI-${unidadeIndex + 1}`,
          },
          quantidade_total: 5,
          total_solicitacoes: 2,
          solicitacoes: itemIds
            .slice(unidadeIndex * 2, unidadeIndex * 2 + 2)
            .map((itemId, solicitacaoIndex) => ({
              item_id: itemId,
              demanda_id: itemId,
              solicitante: {
                id: itemId,
                nome: `Solicitante ${itemId}`,
              },
              quantidade: solicitacaoIndex + 2,
              valor_total: "2500.00",
            })),
        })),
      };
    });
    api.listConsolidationCycles.mockResolvedValue([
      { id: 99, ano: 2099, ativo: true, total_itens_elegiveis: 300 },
    ]);
    api.listEligibleConsolidationItems.mockResolvedValue(linhas);
    const inicio = performance.now();

    render(
      <MemoryRouter>
        <DfdConsolidar />
      </MemoryRouter>
    );

    expect(await screen.findByRole("checkbox", {
      name: "Selecionar Item catalogado 75 para consolidar",
    })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(75);
    expect(screen.getAllByRole("table")).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "Grupo 5" })).toBeInTheDocument();
    expect(api.listConsolidationCycles).toHaveBeenCalledTimes(1);
    expect(api.listEligibleConsolidationItems).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });
});
