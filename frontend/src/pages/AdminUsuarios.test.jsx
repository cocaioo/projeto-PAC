import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import AdminUsuarios from "./AdminUsuarios";
import { api } from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      listSolicitacoes: vi.fn(),
      aprovarSolicitacao: vi.fn(),
      rejeitarSolicitacao: vi.fn(),
      listUsuariosAdmin: vi.fn(),
      createUsuarioAdmin: vi.fn(),
      updateUsuarioStatus: vi.fn(),
      listUnidades: vi.fn(),
      listGrupos: vi.fn(),
    },
  };
});

describe("AdminUsuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listSolicitacoes.mockResolvedValue([]);
    api.listUsuariosAdmin.mockResolvedValue([]);
    api.listUnidades.mockResolvedValue([{ id: 1, nome: "Unidade A" }]);
    
    // Mock window.confirm
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    vi.spyOn(window, "alert").mockImplementation(() => {});
  });

  it("renderiza a aba de solicitações por padrão", async () => {
    renderWithRouter(<AdminUsuarios />);
    expect(screen.getByText("Gestão de Usuários")).toBeInTheDocument();
    expect(screen.getByText("Solicitações de Acesso", { selector: 'button' })).toHaveClass("active");
  });

  it("lista solicitações de acesso e permite aprovar", async () => {
    api.listSolicitacoes.mockResolvedValue([
      { id: 1, nome_completo: "João", email: "j@ufpi.br", unidade_nome: "CCAA", status: "pendente", data_solicitacao: "2023-01-01T10:00:00Z" }
    ]);
    
    renderWithRouter(<AdminUsuarios />);
    
    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });

    api.aprovarSolicitacao.mockResolvedValue({});
    await userEvent.click(screen.getByText("Aprovar"));
    expect(window.confirm).toHaveBeenCalledWith("Confirmar aprovação?");
    expect(api.aprovarSolicitacao).toHaveBeenCalledWith(1);
  });

  it("permite rejeitar solicitação com justificativa", async () => {
    api.listSolicitacoes.mockResolvedValue([
      { id: 1, nome_completo: "João", email: "j@ufpi.br", unidade_nome: "CCAA", status: "pendente", data_solicitacao: "2023-01-01T10:00:00Z" }
    ]);
    
    renderWithRouter(<AdminUsuarios />);
    
    await waitFor(() => {
      expect(screen.getByText("João")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText("Rejeitar"));
    
    // Modal opens
    const motivoInput = screen.getByLabelText(/Motivo/i);
    await userEvent.type(motivoInput, "Não autorizado");
    
    api.rejeitarSolicitacao.mockResolvedValue({});
    await userEvent.click(screen.getByText("Confirmar Rejeição"));
    
    expect(api.rejeitarSolicitacao).toHaveBeenCalledWith(1, { motivo_rejeicao: "Não autorizado" });
  });

  it("navega para aba de criar usuário, preenche form e salva", async () => {
    renderWithRouter(<AdminUsuarios />);
    
    await userEvent.click(screen.getByText("Criar Usuário", { selector: 'button' }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByLabelText(/Nome Completo/i), "Novo Admin");
    await userEvent.type(screen.getByLabelText(/E-mail/i), "admin@ufpi.br");
    
    const perfilSelect = screen.getByLabelText(/Perfil/i);
    await userEvent.selectOptions(perfilSelect, "admin");
    await userEvent.selectOptions(screen.getByLabelText(/Unidade/i), "1");
    
    await userEvent.type(screen.getByLabelText(/Senha/i), "senha123");
    
    api.createUsuarioAdmin.mockResolvedValue({});
    await userEvent.click(screen.getByRole("button", { name: "Salvar Usuário" }));
    
    expect(api.createUsuarioAdmin).toHaveBeenCalledWith(expect.objectContaining({
      nome_completo: "Novo Admin",
      email: "admin@ufpi.br",
      perfil: "admin",
      unidade: "1",
      senha: "senha123"
    }));
  });

  it("navega para aba de usuários e altera status", async () => {
    api.listUsuariosAdmin.mockResolvedValue([
      { id: 2, nome_completo: "Maria", email: "m@ufpi.br", perfil: "usuario", unidade_nome: "CCAA", is_active: true }
    ]);

    renderWithRouter(<AdminUsuarios />);
    
    await userEvent.click(screen.getByText("Usuários Cadastrados", { selector: 'button' }));
    
    await waitFor(() => {
      expect(screen.getByText("Maria")).toBeInTheDocument();
    });

    api.updateUsuarioStatus.mockResolvedValue({});
    await userEvent.click(screen.getByText("Desativar"));
    
    expect(window.confirm).toHaveBeenCalled();
    expect(api.updateUsuarioStatus).toHaveBeenCalledWith(2, { is_active: false });
  });
});
