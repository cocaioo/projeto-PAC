import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { api } from "../api/client";
import Sidebar from "../components/Sidebar";
import { renderWithRouter } from "../test-utils";
import AppRoutes from "../routes";
import DemandaDetail from "./DemandaDetail";
import Home from "./Home";
import ValidacaoDecisao from "./ValidacaoDecisao";
import ValidacoesList from "./ValidacoesList";

const authState = vi.hoisted(() => ({
  user: {
    id: 90,
    username: "admin_teste",
    nome_completo: "Administrador de Teste",
    perfil: "admin",
  },
  loading: false,
  isAdmin: true,
  isAdminMaster: false,
  logout: vi.fn(),
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("./AdminUsuarios", () => ({
  default: () => <h1>Gestão de Usuários</h1>,
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      listPendentes: vi.fn(),
      decidirValidacao: vi.fn(),
      listUnidades: vi.fn(),
      listGrupos: vi.fn(),
      getDemanda: vi.fn(),
      enviarDemanda: vi.fn(),
      reenviarItem: vi.fn(),
      deleteDemanda: vi.fn(),
      listDemandas: vi.fn(),
      listDfds: vi.fn(),
      dashboardStats: vi.fn(),
      listSolicitacoes: vi.fn(),
      listUsuariosAdmin: vi.fn(),
      aprovarSolicitacao: vi.fn(),
      rejeitarSolicitacao: vi.fn(),
      createUsuarioAdmin: vi.fn(),
      updateUsuarioStatus: vi.fn(),
      deleteUsuarioAdmin: vi.fn(),
    },
  };
});

function itemPendente(overrides = {}) {
  return {
    id: 31,
    demanda: 18,
    demanda_id: 18,
    nome: "Notebook Administrativo",
    descricao: "Notebook para atividades administrativas",
    quantidade: 2,
    unidade_medida: "unidade",
    valor_total: "9000.00",
    justificativa_necessidade: "Renovação do parque tecnológico",
    status: "aguardando_validacao",
    grupo_id: 7,
    grupo_nome: "TIC Homologação",
    demanda_dados: {
      id: 18,
      ano_referencia: 2027,
      status: "aguardando_validacao",
      observacao: "Demanda prioritária",
      enviada_em: "2026-08-15T12:00:00Z",
      unidade: { id: 2, nome: "Centro de Ensino", sigla: "CE" },
      usuario: { id: 10, nome: "Ana Usuária", username: "ana" },
    },
    ...overrides,
  };
}

function renderFila() {
  return renderWithRouter(<ValidacoesList />, {
    route: "/validacoes",
    path: "/validacoes",
  });
}

function renderDecisao() {
  return renderWithRouter(<ValidacaoDecisao />, {
    route: "/validacoes/18",
    path: "/validacoes/:demandaId",
  });
}

function renderApp(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("fluxo administrativo — contratos de regressão pré-correção", () => {
  beforeEach(() => {
    authState.user = {
      id: 90,
      username: "admin_teste",
      nome_completo: "Administrador de Teste",
      perfil: "admin",
    };
    authState.loading = false;
    authState.isAdmin = true;
    authState.isAdminMaster = false;

    api.listPendentes.mockResolvedValue([]);
    api.listUnidades.mockResolvedValue([
      { id: 2, nome: "Centro de Ensino", sigla: "CE", ativo: true },
    ]);
    api.listGrupos.mockResolvedValue([
      { id: 7, nome: "TIC Homologação", ativo: true },
    ]);
    api.decidirValidacao.mockResolvedValue({ id: 101 });
    api.listDemandas.mockResolvedValue({ results: [] });
    api.listDfds.mockResolvedValue({ results: [] });
    api.listSolicitacoes.mockResolvedValue([]);
    api.listUsuariosAdmin.mockResolvedValue([]);
  });

  describe("fila administrativa e estado stale", () => {
    it("oferece botão Atualizar e refaz a consulta sob demanda", async () => {
      const user = userEvent.setup();
      renderFila();

      expect(await screen.findByText("Nenhuma demanda pendente de validação")).toBeInTheDocument();
      const atualizar = screen.getByRole("button", { name: /atualizar/i });
      await user.click(atualizar);

      await waitFor(() => expect(api.listPendentes).toHaveBeenCalledTimes(2));
    });

    it("refaz a consulta quando a janela recupera foco", async () => {
      renderFila();
      expect(await screen.findByText("Nenhuma demanda pendente de validação")).toBeInTheDocument();
      expect(api.listPendentes).toHaveBeenCalledTimes(1);

      window.dispatchEvent(new Event("focus"));

      await waitFor(() => expect(api.listPendentes).toHaveBeenCalledTimes(2));
    });

    it("ignora resposta antiga que termina depois da recarga mais recente", async () => {
      let resolverAntiga;
      api.listPendentes
        .mockImplementationOnce(() => new Promise((resolve) => { resolverAntiga = resolve; }))
        .mockResolvedValueOnce([itemPendente()]);
      renderFila();
      await waitFor(() => expect(api.listPendentes).toHaveBeenCalledTimes(1));

      window.dispatchEvent(new Event("focus"));
      expect(await screen.findByText("Notebook Administrativo")).toBeInTheDocument();

      await act(async () => resolverAntiga([]));
      expect(screen.getByText("Notebook Administrativo")).toBeInTheDocument();
    });

    it("mostra no cartão os itens da demanda que pertencem ao escopo do admin", async () => {
      api.listPendentes.mockResolvedValue([
        itemPendente(),
        itemPendente({ id: 32, nome: "Monitor Administrativo" }),
      ]);
      renderFila();

      const cardTitle = await screen.findByRole("heading", { name: "Demanda #18" });
      const card = cardTitle.closest(".pac-card");
      expect(card).not.toBeNull();
      expect(within(card).getByText("Notebook Administrativo")).toBeInTheDocument();
      expect(within(card).getByText("Monitor Administrativo")).toBeInTheDocument();
    });

    it("inicia sem filtros ocultos e consulta todo o escopo autorizado", async () => {
      renderFila();

      await screen.findByText("Nenhuma demanda pendente de validação");
      expect(screen.getByLabelText("Unidade solicitante")).toHaveValue("");
      expect(screen.getByLabelText("Grupo de contratação")).toHaveValue("");
      expect(api.listPendentes).toHaveBeenCalledWith({
        unidade: undefined,
        grupo: undefined,
      });
    });

    it("após decidir, refaz a consulta, remove o item processado e usa o estado macro do servidor", async () => {
      const notebook = itemPendente();
      const monitor = itemPendente({ id: 32, nome: "Monitor Administrativo" });
      const monitorAposDecisao = itemPendente({
        id: 32,
        nome: "Monitor Administrativo",
        demanda_dados: {
          ...monitor.demanda_dados,
          status: "em_andamento",
        },
      });
      api.listPendentes
        .mockResolvedValueOnce([notebook, monitor])
        .mockResolvedValueOnce([monitorAposDecisao]);
      const user = userEvent.setup();
      renderDecisao();

      await user.click(await screen.findByRole("button", {
        name: "Validar item Notebook Administrativo",
      }));
      const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
      await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

      await waitFor(() => expect(api.listPendentes).toHaveBeenCalledTimes(2));
      expect(screen.queryByText("Notebook Administrativo")).not.toBeInTheDocument();
      expect(screen.getByText("Monitor Administrativo")).toBeInTheDocument();
      expect(screen.getByLabelText("Status: Em andamento")).toBeInTheDocument();
    });
  });

  describe("separação entre requisitante e administração", () => {
    it("separa explicitamente os menus Área do requisitante e Administração", () => {
      render(
        <MemoryRouter>
          <Sidebar user={authState.user} isAdmin />
        </MemoryRouter>
      );

      expect(screen.getByText("Área do requisitante")).toBeInTheDocument();
      expect(screen.getByText("Administração")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /minhas demandas/i })).toHaveAttribute(
        "href",
        "/demandas"
      );
      expect(screen.getByRole("link", { name: /pendências de validação/i })).toHaveAttribute(
        "href",
        "/validacoes"
      );
    });

    it("admin não proprietário não recebe ações de edição do rascunho", async () => {
      api.getDemanda.mockResolvedValue({
        id: 44,
        usuario_id: 10,
        usuario: { id: 10, username: "ana" },
        usuario_nome: "Ana Usuária",
        unidade_sigla: "CE",
        ano_referencia: 2027,
        status: "rascunho",
        valor_total: 4500,
        itens: [{
          id: 55,
          nome: "Notebook de terceiro",
          quantidade: 1,
          valor_estimado: 4500,
          valor_total: 4500,
          status: "rascunho",
        }],
      });
      renderWithRouter(<DemandaDetail />, {
        route: "/demandas/44",
        path: "/demandas/:id",
      });

      expect(await screen.findByRole("heading", { name: "Demanda #44" })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /editar demanda/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /excluir rascunho/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /adicionar item/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /editar item notebook de terceiro/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /enviar para validação/i })).not.toBeInTheDocument();
    });

    it("usuário comum não recebe card de DFD na página inicial", () => {
      authState.user = {
        id: 10,
        username: "ana",
        nome_completo: "Ana Usuária",
        perfil: "usuario",
      };
      authState.isAdmin = false;
      renderWithRouter(<Home />);

      expect(screen.queryByText("Consultar documentos DFD")).not.toBeInTheDocument();
    });

    it("usuário comum não acessa diretamente a rota de DFD", () => {
      authState.user = { id: 10, username: "ana", perfil: "usuario" };
      authState.isAdmin = false;
      renderApp("/dfds");

      expect(screen.getByText(/plano anual de contratações da ufpi/i)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: /^DFDs$/i })).not.toBeInTheDocument();
    });

    it("expõe gestão de usuários fora do prefixo reservado /admin", async () => {
      authState.user = {
        id: 1,
        username: "master",
        nome_completo: "Admin Master",
        perfil: "admin_master",
      };
      authState.isAdmin = true;
      authState.isAdminMaster = true;
      renderApp("/gestao/usuarios");

      expect(await screen.findByRole("heading", { name: /gestão de usuários/i })).toBeInTheDocument();
    });

    it("não registra a SPA de gestão sob /admin/usuarios", () => {
      authState.user = {
        id: 1,
        username: "master",
        nome_completo: "Admin Master",
        perfil: "admin_master",
      };
      authState.isAdmin = true;
      authState.isAdminMaster = true;
      renderApp("/admin/usuarios");

      expect(screen.queryByRole("heading", { name: /gestão de usuários/i })).not.toBeInTheDocument();
    });
  });
});
