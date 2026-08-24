import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ValidacoesList, { agruparItensPorDemanda } from "./ValidacoesList";
import { api, ApiError } from "../api/client";

// Bug #4: o mock agora expõe 'loading' para simular o ciclo de vida do AuthContext.
const authState = vi.hoisted(() => ({ isAdmin: true, loading: false }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      listPendentes: vi.fn(),
      listUnidades: vi.fn(),
      listGrupos: vi.fn(),
    },
  };
});

function itemPendente(overrides = {}) {
  return {
    id: 3,
    demanda: 12,
    demanda_id: 12,
    nome: "Notebook",
    descricao: "Notebook corporativo",
    quantidade: 2,
    valor_total: "3000.00",
    status: "aguardando_validacao",
    grupo_id: 9,
    grupo_nome: "Tecnologia da Informação",
    demanda_dados: {
      id: 12,
      ano_referencia: 2027,
      status: "aguardando_validacao",
      observacao: "Renovação do parque",
      enviada_em: "2026-08-15T12:00:00Z",
      unidade: { id: 4, nome: "Pró-Reitoria", sigla: "PROAD" },
      usuario: { id: 5, nome: "Maria Solicitante", username: "maria" },
    },
    ...overrides,
  };
}

describe("agruparItensPorDemanda", () => {
  it("usa a demanda como agrupador sem misturar decisões por item", () => {
    const demandas = agruparItensPorDemanda([
      itemPendente(),
      itemPendente({ id: 4, nome: "Monitor" }),
      itemPendente({
        id: 5,
        demanda: 13,
        demanda_id: 13,
        demanda_dados: { ...itemPendente().demanda_dados, id: 13 },
      }),
    ]);

    expect(demandas).toHaveLength(2);
    expect(demandas[0].itens.map((item) => item.id)).toEqual([3, 4]);
    expect(demandas[1].itens.map((item) => item.id)).toEqual([5]);
  });
});

describe("ValidacoesList", () => {
  beforeEach(() => {
    authState.isAdmin = true;
    authState.loading = false;
    api.listPendentes.mockResolvedValue([
      itemPendente(),
      itemPendente({ id: 4, nome: "Monitor" }),
    ]);
    api.listUnidades.mockResolvedValue([
      { id: 4, nome: "Pró-Reitoria", sigla: "PROAD", ativo: true },
    ]);
    api.listGrupos.mockResolvedValue([
      { id: 9, nome: "Tecnologia da Informação", ativo: true },
    ]);
  });

  it("lista demandas recebidas e abre a análise agrupada", async () => {
    renderWithRouter(<ValidacoesList />);

    expect(screen.getByText(/carregando demandas/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Demanda #12" })).toBeInTheDocument();
    expect(screen.getByText("Maria Solicitante")).toBeInTheDocument();
    expect(screen.getByText("2 itens pendentes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir demanda 12" })).toHaveAttribute(
      "href",
      "/validacoes/12"
    );
    expect(screen.queryByText("Notebook")).not.toBeInTheDocument();
  });

  it("mantém filtros por unidade e grupo no endpoint de pendências", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ValidacoesList />);

    await screen.findByRole("option", { name: "PROAD — Pró-Reitoria" });
    await user.selectOptions(screen.getByLabelText("Unidade solicitante"), "4");
    await user.selectOptions(screen.getByLabelText("Grupo de contratação"), "9");

    await waitFor(() => expect(api.listPendentes).toHaveBeenLastCalledWith({
      unidade: "4",
      grupo: "9",
    }));
  });

  it("mostra estado vazio quando não há demandas pendentes", async () => {
    api.listPendentes.mockResolvedValue([]);
    renderWithRouter(<ValidacoesList />);

    expect(
      await screen.findByText("Nenhuma demanda pendente de validação")
    ).toBeInTheDocument();
  });

  it("mostra erro padronizado e permite tentar novamente", async () => {
    api.listPendentes
      .mockRejectedValueOnce(new ApiError("Falha de rede", 0))
      .mockResolvedValueOnce([]);
    const user = userEvent.setup();
    renderWithRouter(<ValidacoesList />);

    expect(await screen.findByText("Falha de rede")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByText("Nenhuma demanda pendente de validação")).toBeInTheDocument();
    expect(api.listPendentes).toHaveBeenCalledTimes(2);
  });

  it("não consulta nem exibe a fila para usuário sem perfil ADMIN", async () => {
    authState.isAdmin = false;
    renderWithRouter(<ValidacoesList />);

    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(api.listPendentes).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: /abrir demanda/i })).not.toBeInTheDocument();
  });

  // Bug #4: race condition — AuthContext ainda carregando não deve disparar fetch.
  it("não chama a API enquanto o AuthContext ainda está carregando (Bug #4 - race condition)", () => {
    authState.loading = true;
    authState.isAdmin = false; // isAdmin=false enquanto loading
    renderWithRouter(<ValidacoesList />);

    expect(api.listPendentes).not.toHaveBeenCalled();
    expect(api.listUnidades).not.toHaveBeenCalled();
    expect(api.listGrupos).not.toHaveBeenCalled();
    expect(screen.getByText("Verificando permissoes...")).toBeInTheDocument();
  });

  // Bug #4: após AuthContext terminar com isAdmin=true, o fetch deve ocorrer.
  it("chama a API após o AuthContext terminar de carregar com isAdmin=true (Bug #4)", async () => {
    authState.loading = false;
    authState.isAdmin = true;
    renderWithRouter(<ValidacoesList />);

    await screen.findByRole("heading", { name: "Demanda #12" });
    expect(api.listPendentes).toHaveBeenCalledTimes(1);
  });
});
