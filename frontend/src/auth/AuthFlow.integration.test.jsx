import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Login from "../pages/Login";
import SolicitarAcesso from "../pages/SolicitarAcesso";
import AdminUsuarios from "../pages/AdminUsuarios";
import { api } from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      me: vi.fn(),
      csrf: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      solicitarAcesso: vi.fn(),
      listSolicitacoes: vi.fn(),
      aprovarSolicitacao: vi.fn(),
      rejeitarSolicitacao: vi.fn(),
      listUsuariosAdmin: vi.fn(),
      createUsuarioAdmin: vi.fn(),
      updateUsuarioStatus: vi.fn(),
      listUnidades: vi.fn(),
    },
  };
});

function AppTest({ initialRoute = "/login" }) {
  return (
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/solicitar-acesso" element={<SolicitarAcesso />} />
          <Route path="/admin/usuarios" element={<AdminUsuarios />} />
          <Route path="/" element={<div data-testid="dashboard-home">Página Principal do PAC</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("AuthFlow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.csrf.mockResolvedValue({ detail: "csrf-token-abc" });
    api.listUnidades.mockResolvedValue([
      { id: 1, nome: "Centro de Ciências Agrárias (CCAA)" },
      { id: 2, nome: "Centro de Tecnologia (CT)" },
    ]);
  });

  it("fluxo de solicitação de acesso por novo usuário", async () => {
    api.me.mockRejectedValue(new Error("401"));
    api.solicitarAcesso.mockResolvedValue({ message: "Solicitação enviada com sucesso." });

    render(<AppTest initialRoute="/solicitar-acesso" />);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled();
    });

    await userEvent.type(screen.getByLabelText(/nome completo/i), "Carlos Eduardo");
    await userEvent.type(screen.getByLabelText(/e-mail institucional/i), "carlos.eduardo@ufpi.edu.br");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await userEvent.type(screen.getByLabelText(/^senha/i), "segredo123");
    await userEvent.type(screen.getByLabelText(/confirmação de senha/i), "segredo123");

    await userEvent.click(screen.getByRole("button", { name: /solicitar/i }));

    await waitFor(() => {
      expect(api.solicitarAcesso).toHaveBeenCalledWith({
        nome_completo: "Carlos Eduardo",
        email: "carlos.eduardo@ufpi.edu.br",
        unidade: "1",
        senha: "segredo123",
        confirmacao_senha: "segredo123",
      });
    });

    expect(screen.getByText(/sua solicitação de acesso foi enviada com sucesso/i)).toBeInTheDocument();
  });

  it("fluxo de aprovação de solicitação pelo Admin Master", async () => {
    vi.spyOn(window, "confirm").mockImplementation(() => true);
    api.me.mockResolvedValue({
      id: 99,
      username: "admin_master",
      perfil: "admin_master",
      is_admin_master_user: true,
    });
    api.listSolicitacoes.mockResolvedValue([
      {
        id: 10,
        nome_completo: "Carlos Eduardo",
        email: "carlos.eduardo@ufpi.edu.br",
        unidade_nome: "Centro de Ciências Agrárias (CCAA)",
        status: "pendente",
        data_solicitacao: "2026-08-23T10:00:00Z",
      },
    ]);
    api.aprovarSolicitacao.mockResolvedValue({ message: "Solicitação aprovada." });

    render(<AppTest initialRoute="/admin/usuarios" />);

    await waitFor(() => {
      expect(screen.getByText("Carlos Eduardo")).toBeInTheDocument();
      expect(screen.getByText("carlos.eduardo@ufpi.edu.br")).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(window.confirm).toHaveBeenCalledWith("Confirmar aprovação?");
    expect(api.aprovarSolicitacao).toHaveBeenCalledWith(10);
  });

  it("fluxo completo de login com e-mail institucional após aprovação", async () => {
    api.me.mockRejectedValue(new Error("401"));
    api.login.mockResolvedValue({
      id: 10,
      username: "carlos.eduardo",
      email: "carlos.eduardo@ufpi.edu.br",
      perfil: "usuario",
      first_name: "Carlos Eduardo",
    });

    render(<AppTest initialRoute="/login" />);

    await userEvent.type(screen.getByLabelText(/e-mail ou usuário/i), "carlos.eduardo@ufpi.edu.br");
    await userEvent.type(screen.getByLabelText(/senha/i), "segredo123");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(api.csrf).toHaveBeenCalled();
    expect(api.login).toHaveBeenCalledWith("carlos.eduardo@ufpi.edu.br", "segredo123");

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-home")).toBeInTheDocument();
    });
  });

  it("fluxo de erro no login com credenciais incorretas exibe mensagem da API sem expor sessão expirada", async () => {
    api.me.mockRejectedValue(new Error("401"));
    const apiError = new Error("Credenciais inválidas.");
    apiError.status = 401;
    apiError.data = { detail: "Credenciais inválidas." };
    api.login.mockRejectedValue(apiError);

    render(<AppTest initialRoute="/login" />);

    await userEvent.type(screen.getByLabelText(/e-mail ou usuário/i), "carlos.eduardo@ufpi.edu.br");
    await userEvent.type(screen.getByLabelText(/senha/i), "senha_errada");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
    expect(screen.queryByText(/sua sessão expirou/i)).not.toBeInTheDocument();
  });
});
