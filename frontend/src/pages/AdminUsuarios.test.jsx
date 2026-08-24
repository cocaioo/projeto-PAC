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
      deleteUsuarioAdmin: vi.fn(),
      listUnidades: vi.fn(),
      listGrupos: vi.fn(),
    },
  };
});

describe("AdminUsuarios", () => {
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
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
    await waitFor(() => {
      expect(screen.getByText("Gestão de Usuários")).toBeInTheDocument();
      expect(screen.getByLabelText(/Filtrar por Status:/i)).toBeInTheDocument();
    });
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
    await testUser.click(screen.getByText("Aprovar"));
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

    await testUser.click(screen.getByText("Rejeitar"));
    
    // Modal opens
    const motivoInput = screen.getByLabelText(/Motivo/i);
    await testUser.type(motivoInput, "Não autorizado");
    
    api.rejeitarSolicitacao.mockResolvedValue({});
    await testUser.click(screen.getByText("Confirmar Rejeição"));
    
    expect(api.rejeitarSolicitacao).toHaveBeenCalledWith(1, { motivo_rejeicao: "Não autorizado" });
  });

  it("navega para aba de criar usuário, preenche form e salva", async () => {
    renderWithRouter(<AdminUsuarios />);
    
    await testUser.click(screen.getByText("Criar Usuário", { selector: 'button' }));
    
    await waitFor(() => {
      expect(screen.getByLabelText(/Nome Completo/i)).toBeInTheDocument();
    });

    await testUser.type(screen.getByLabelText(/Nome Completo/i), "Novo Admin");
    await testUser.type(screen.getByLabelText(/E-mail/i), "admin@ufpi.br");
    
    const perfilSelect = screen.getByLabelText(/Perfil/i);
    await testUser.selectOptions(perfilSelect, "admin");
    await testUser.selectOptions(screen.getByLabelText(/Unidade/i), "1");
    
    await testUser.type(screen.getByLabelText(/Senha/i), "senha123");
    
    api.createUsuarioAdmin.mockResolvedValue({});
    await testUser.click(screen.getByRole("button", { name: "Salvar Usuário" }));
    
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
    
    await testUser.click(screen.getByText("Usuários Cadastrados", { selector: 'button' }));
    
    await waitFor(() => {
      expect(screen.getByText("Maria")).toBeInTheDocument();
    });

    api.updateUsuarioStatus.mockResolvedValue({});
    await testUser.click(screen.getByText("Desativar"));
    
    expect(window.confirm).toHaveBeenCalled();
    expect(api.updateUsuarioStatus).toHaveBeenCalledWith(2, { is_active: false });
  });

  it("filtra solicitações de acesso por status", async () => {
    renderWithRouter(<AdminUsuarios />);
    const selectFiltro = await screen.findByLabelText(/Filtrar por Status:/i);
    await testUser.selectOptions(selectFiltro, "aprovado");

    expect(api.listSolicitacoes).toHaveBeenCalledWith({ status: "aprovado" });
  });

  it("exibe erros de validação ao falhar na criação de usuário", async () => {
    const error = new Error("Revise os dados informados.");
    error.fieldErrors = { email: ["E-mail inválido ou já existente."] };
    api.createUsuarioAdmin.mockRejectedValue(error);

    renderWithRouter(<AdminUsuarios />);
    await testUser.click(screen.getByText("Criar Usuário", { selector: 'button' }));

    await testUser.type(screen.getByLabelText(/Nome Completo/i), "Teste");
    await testUser.type(screen.getByLabelText(/E-mail/i), "invalido@teste.com");
    await testUser.selectOptions(screen.getByLabelText(/Unidade/i), "1");
    await testUser.type(screen.getByLabelText(/Senha/i), "123456");

    await testUser.click(screen.getByRole("button", { name: "Salvar Usuário" }));

    expect(await screen.findByText(/e-mail inválido ou já existente/i)).toBeInTheDocument();
  });

  it("permite excluir permanentemente a conta de um usuário", async () => {
    api.listUsuariosAdmin.mockResolvedValue([
      { id: 3, nome_completo: "Carlos", email: "carlos@ufpi.br", perfil: "usuario", unidade_nome: "CCAA", is_active: true }
    ]);

    renderWithRouter(<AdminUsuarios />);
    
    await testUser.click(screen.getByText("Usuários Cadastrados", { selector: 'button' }));
    
    await waitFor(() => {
      expect(screen.getByText("Carlos")).toBeInTheDocument();
    });

    api.deleteUsuarioAdmin.mockResolvedValue({ message: "Usuário excluído com sucesso." });
    await testUser.click(screen.getByRole("button", { name: /Excluir/i }));
    
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("excluir permanentemente o registro da conta"));
    expect(api.deleteUsuarioAdmin).toHaveBeenCalledWith(3);
  });
});
