import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ValidacaoDecisao from "./ValidacaoDecisao";
import { api, ApiError } from "../api/client";

// Bug #5: o mock agora expõe 'loading' para simular o ciclo de vida do AuthContext.
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
      decidirValidacao: vi.fn(),
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
    unidade_medida: "unidade",
    valor_total: "3000.00",
    justificativa_necessidade: "Atendimento das equipes",
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

function renderDecisao() {
  return renderWithRouter(<ValidacaoDecisao />, {
    route: "/validacoes/12",
    path: "/validacoes/:demandaId",
    extraRoutes: [{ path: "/validacoes", element: <p>Demandas recebidas</p> }],
  });
}

describe("ValidacaoDecisao", () => {
  beforeEach(() => {
    authState.isAdmin = true;
    authState.loading = false;
    api.listPendentes.mockResolvedValue([
      itemPendente(),
      itemPendente({ id: 4, nome: "Monitor", valor_total: "1200.00" }),
    ]);
    api.decidirValidacao.mockResolvedValue({ id: 20 });
  });

  // Bug #1: garante que o filtro por demandaId é passado na chamada à API.
  it("passa o demandaId como filtro na chamada à API (Bug #1)", async () => {
    renderDecisao();

    await screen.findByText("Notebook");

    expect(api.listPendentes).toHaveBeenCalledWith({ demanda: "12" });
    expect(api.listPendentes).toHaveBeenCalledTimes(1);
  });

  // Bug #5: garante que o fetch não dispara enquanto o AuthContext ainda carrega.
  it("não dispara fetch enquanto o AuthContext ainda carrega (Bug #5 - race condition)", async () => {
    authState.loading = true;
    authState.isAdmin = false; // isAdmin=false enquanto loading
    renderDecisao();

    // Nenhuma requisição deve ter sido feita durante o carregamento
    expect(api.listPendentes).not.toHaveBeenCalled();
    expect(screen.queryByText("Notebook")).not.toBeInTheDocument();
  });

  // Bug #5: após o AuthContext terminar, o fetch deve ocorrer se isAdmin=true.
  it("busca dados após o AuthContext terminar de carregar com isAdmin=true (Bug #5)", async () => {
    authState.loading = false;
    authState.isAdmin = true;
    renderDecisao();

    await screen.findByText("Notebook");
    expect(api.listPendentes).toHaveBeenCalledWith({ demanda: "12" });
  });

  it("abre a demanda e exibe seus itens para decisão individual", async () => {
    renderDecisao();

    expect(await screen.findByRole("heading", { name: "Demanda #12" })).toBeInTheDocument();
    expect(screen.getByText("Maria Solicitante")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Status: Aguardando validação")).toHaveLength(3);
  });

  it("só valida o item depois da confirmação e atualiza a linha", async () => {
    const user = userEvent.setup();
    renderDecisao();
    await screen.findByText("Notebook");

    await user.click(screen.getByRole("button", { name: "Validar item Notebook" }));
    expect(api.decidirValidacao).not.toHaveBeenCalled();

    const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
    expect(within(modal).getByText(/notebook/i)).toBeInTheDocument();
    await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

    await waitFor(() => expect(api.decidirValidacao).toHaveBeenCalledWith({
      item_demanda: 3,
      acao: "validado",
      comentario: "",
    }));
    expect(await screen.findByText("O item Notebook foi validado com sucesso.")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: Validada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Validar item Notebook" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validar item Monitor" })).toBeInTheDocument();
  });

  it("exige justificativa válida no modal de devolução", async () => {
    const user = userEvent.setup();
    renderDecisao();
    await screen.findByText("Notebook");

    await user.click(screen.getByRole("button", { name: "Devolver item Notebook" }));
    const modal = screen.getByRole("dialog", { name: "Devolver item ao solicitante" });
    const confirmButton = within(modal).getByRole("button", { name: "Confirmar devolução" });

    expect(confirmButton).toBeDisabled();
    await user.type(within(modal).getByLabelText(/justificativa da devolução/i), "Corrigir descrição.");
    expect(confirmButton).not.toBeDisabled();
    expect(api.decidirValidacao).not.toHaveBeenCalled();
  });

  it("devolve somente o item escolhido, mostra status e feedback", async () => {
    const user = userEvent.setup();
    renderDecisao();
    await screen.findByText("Notebook");

    await user.click(screen.getByRole("button", { name: "Devolver item Notebook" }));
    const modal = screen.getByRole("dialog", { name: "Devolver item ao solicitante" });
    await user.type(
      within(modal).getByLabelText(/justificativa da devolução/i),
      "Ajustar a especificação técnica"
    );
    await user.click(within(modal).getByRole("button", { name: "Confirmar devolução" }));

    await waitFor(() => expect(api.decidirValidacao).toHaveBeenCalledWith({
      item_demanda: 3,
      acao: "devolvido",
      comentario: "Ajustar a especificação técnica",
    }));
    expect(await screen.findByText("O item Notebook foi devolvido ao solicitante.")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: Devolvida")).toBeInTheDocument();
    expect(screen.getByText("Ajustar a especificação técnica")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Devolver item Monitor" })).toBeInTheDocument();
  });

  it("mantém o item pendente e informa permissão negada pelo backend", async () => {
    api.decidirValidacao.mockRejectedValue(new ApiError(
      "Você não tem permissão para realizar esta ação.",
      403
    ));
    const user = userEvent.setup();
    renderDecisao();
    await screen.findByText("Notebook");

    await user.click(screen.getByRole("button", { name: "Validar item Notebook" }));
    const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
    await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

    expect(await within(modal).findByText("Você não tem permissão para realizar esta ação.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validar item Notebook" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Status: Validada")).not.toBeInTheDocument();
  });

  it("não consulta nem mostra ações para usuário sem perfil ADMIN", () => {
    authState.isAdmin = false;
    renderDecisao();

    expect(screen.getByText("Acesso restrito")).toBeInTheDocument();
    expect(api.listPendentes).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /validar item/i })).not.toBeInTheDocument();
  });
});
