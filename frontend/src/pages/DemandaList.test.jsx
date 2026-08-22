import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DemandaList from "./DemandaList";
import { api, ApiError } from "../api/client";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { listDemandas: vi.fn() },
  };
});

describe("DemandaList", () => {
  beforeEach(() => {
    api.listDemandas.mockReset();
  });

  it("lista as demandas retornadas pela API", async () => {
    api.listDemandas.mockResolvedValue({
      results: [
        {
          id: 1,
          unidade_sigla: "STI",
          ano_referencia: 2027,
          status: "rascunho",
          valor_total: 3000,
        },
      ],
    });
    renderWithRouter(<DemandaList />);
    expect(await screen.findByText("STI")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByText(/3\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nova demanda/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /acompanhar demanda 1/i })).toHaveAttribute(
      "href",
      "/demandas/1"
    );
  });

  it("mostra aviso quando não há demandas", async () => {
    api.listDemandas.mockResolvedValue({ results: [] });
    renderWithRouter(<DemandaList />);
    expect(
      await screen.findByText(/nenhuma demanda cadastrada/i)
    ).toBeInTheDocument();
  });

  it("mostra erro padronizado e permite tentar carregar novamente", async () => {
    api.listDemandas
      .mockRejectedValueOnce(new ApiError("Falha ao consultar demandas.", 500))
      .mockResolvedValueOnce({ results: [] });

    renderWithRouter(<DemandaList />);

    expect(await screen.findByText(/falha ao consultar demandas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByText(/nenhuma demanda cadastrada/i)).toBeInTheDocument();
    expect(api.listDemandas).toHaveBeenCalledTimes(2);
  });

  it("exibe pílulas de filtro de status com contadores dinâmicos e filtra a lista", async () => {
    const mockList = [
      {
        id: 1,
        unidade_sigla: "STI",
        ano_referencia: 2027,
        status: "rascunho",
        valor_total: 1000,
        observacao: "Compra de TI",
        itens: [],
      },
      {
        id: 2,
        unidade_sigla: "PROPLAN",
        ano_referencia: 2027,
        status: "aguardando_validacao",
        valor_total: 2000,
        observacao: "Serviços gerais",
        itens: [],
      },
      {
        id: 3,
        unidade_sigla: "CCE",
        ano_referencia: 2026,
        status: "em_andamento",
        valor_total: 3000,
        observacao: "Manutenção",
        itens: [{ id: 30, status: "devolvida" }],
      },
      {
        id: 4,
        unidade_sigla: "PREG",
        ano_referencia: 2026,
        status: "concluida",
        valor_total: 4000,
        observacao: "Finalizada",
        itens: [],
      },
    ];

    api.listDemandas.mockResolvedValue({ results: mockList });
    renderWithRouter(<DemandaList />);

    expect(await screen.findByText("STI")).toBeInTheDocument();
    expect(screen.getByText("PROPLAN")).toBeInTheDocument();
    expect(screen.getByText("CCE")).toBeInTheDocument();
    expect(screen.getByText("PREG")).toBeInTheDocument();

    // Verify tabs / pills exist
    const tabTodas = screen.getByRole("tab", { name: /todas/i });
    const tabRascunhos = screen.getByRole("tab", { name: /rascunhos/i });
    const tabAguardando = screen.getByRole("tab", { name: /aguardando validação/i });
    const tabAcaoNecessaria = screen.getByRole("tab", { name: /ação necessária \/ devolvidas/i });
    const tabConcluidas = screen.getByRole("tab", { name: /concluídas/i });

    expect(tabTodas).toHaveTextContent("4");
    expect(tabRascunhos).toHaveTextContent("1");
    expect(tabAguardando).toHaveTextContent("1");
    expect(tabAcaoNecessaria).toHaveTextContent("1");
    expect(tabConcluidas).toHaveTextContent("1");

    // Click Rascunhos
    await userEvent.click(tabRascunhos);
    expect(screen.getByText("STI")).toBeInTheDocument();
    expect(screen.queryByText("PROPLAN")).not.toBeInTheDocument();
    expect(screen.queryByText("CCE")).not.toBeInTheDocument();
    expect(screen.queryByText("PREG")).not.toBeInTheDocument();

    // Click Aguardando validação
    await userEvent.click(tabAguardando);
    expect(screen.queryByText("STI")).not.toBeInTheDocument();
    expect(screen.getByText("PROPLAN")).toBeInTheDocument();

    // Click Ação necessária / Devolvidas
    await userEvent.click(tabAcaoNecessaria);
    expect(screen.queryByText("PROPLAN")).not.toBeInTheDocument();
    expect(screen.getByText("CCE")).toBeInTheDocument();

    // Click Concluídas
    await userEvent.click(tabConcluidas);
    expect(screen.queryByText("CCE")).not.toBeInTheDocument();
    expect(screen.getByText("PREG")).toBeInTheDocument();

    // Click Todas
    await userEvent.click(tabTodas);
    expect(screen.getByText("STI")).toBeInTheDocument();
    expect(screen.getByText("PROPLAN")).toBeInTheDocument();
    expect(screen.getByText("CCE")).toBeInTheDocument();
    expect(screen.getByText("PREG")).toBeInTheDocument();
  });

  it("filtra demandas por busca textual em tempo real por ID, ano ou observação", async () => {
    const mockList = [
      {
        id: 101,
        unidade_sigla: "STI",
        ano_referencia: 2027,
        status: "rascunho",
        valor_total: 1000,
        observacao: "Aquisição de computadores",
      },
      {
        id: 202,
        unidade_sigla: "CCS",
        ano_referencia: 2026,
        status: "aguardando_validacao",
        valor_total: 2000,
        observacao: "Equipamentos hospitalares",
      },
    ];

    api.listDemandas.mockResolvedValue({ results: mockList });
    renderWithRouter(<DemandaList />);

    expect(await screen.findByText("STI")).toBeInTheDocument();
    expect(screen.getByText("CCS")).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/buscar demandas/i);

    // Search by ID
    await userEvent.type(searchInput, "101");
    expect(screen.getByText("STI")).toBeInTheDocument();
    expect(screen.queryByText("CCS")).not.toBeInTheDocument();

    // Clear search
    await userEvent.clear(searchInput);
    expect(screen.getByText("STI")).toBeInTheDocument();
    expect(screen.getByText("CCS")).toBeInTheDocument();

    // Search by year
    await userEvent.type(searchInput, "2026");
    expect(screen.queryByText("STI")).not.toBeInTheDocument();
    expect(screen.getByText("CCS")).toBeInTheDocument();

    // Search by observation
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, "computadores");
    expect(screen.getByText("STI")).toBeInTheDocument();
    expect(screen.queryByText("CCS")).not.toBeInTheDocument();
  });

  it("exibe estado vazio quando busca não retorna resultados e permite limpar filtros", async () => {
    const mockList = [
      {
        id: 1,
        unidade_sigla: "STI",
        ano_referencia: 2027,
        status: "rascunho",
        valor_total: 1000,
        observacao: "Compra de TI",
      },
    ];

    api.listDemandas.mockResolvedValue({ results: mockList });
    renderWithRouter(<DemandaList />);

    expect(await screen.findByText("STI")).toBeInTheDocument();

    const searchInput = screen.getByLabelText(/buscar demandas/i);
    await userEvent.type(searchInput, "termo_inexistente");

    expect(await screen.findByText(/nenhuma demanda encontrada/i)).toBeInTheDocument();
    expect(screen.queryByText("STI")).not.toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: /limpar filtros/i });
    await userEvent.click(clearButton);

    expect(await screen.findByText("STI")).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
  });
});
