import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import SolicitarAcesso from "./SolicitarAcesso";
import { api } from "../api/client";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual("../api/client");
  return {
    ...actual,
    api: {
      ...actual.api,
      listUnidades: vi.fn(),
      solicitarAcesso: vi.fn(),
    },
  };
});

describe("SolicitarAcesso", () => {
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
    vi.clearAllMocks();
    api.listUnidades.mockResolvedValue([
      { id: 1, nome: "Unidade A" },
      { id: 2, nome: "Unidade B" },
    ]);
  });

  it("renderiza o formulário e carrega unidades", async () => {
    renderWithRouter(<SolicitarAcesso />);
    expect(screen.getByLabelText(/nome completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled();
    });
    
    expect(screen.getByRole("option", { name: "Unidade A" })).toBeInTheDocument();
  });

  it("valida erro de senhas que não coincidem", async () => {
    renderWithRouter(<SolicitarAcesso />);
    
    await waitFor(() => expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled());

    await testUser.type(screen.getByLabelText(/nome completo/i), "João");
    await testUser.type(screen.getByLabelText(/e-mail/i), "joao@ufpi.br");
    await testUser.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await testUser.type(screen.getByLabelText(/^senha/i), "senha123");
    await testUser.type(screen.getByLabelText(/confirmação/i), "senha321");
    
    await testUser.click(screen.getByRole("button", { name: /solicitar/i }));

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(api.solicitarAcesso).not.toHaveBeenCalled();
  });

  it("envia formulário com sucesso e exibe mensagem de sucesso sem redirecionar automaticamente", async () => {
    api.solicitarAcesso.mockResolvedValue({});
    renderWithRouter(<SolicitarAcesso />);
    
    await waitFor(() => expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled());

    await testUser.type(screen.getByLabelText(/nome completo/i), "João");
    await testUser.type(screen.getByLabelText(/e-mail/i), "joao@ufpi.br");
    await testUser.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await testUser.type(screen.getByLabelText(/^senha/i), "senha123");
    await testUser.type(screen.getByLabelText(/confirmação/i), "senha123");
    
    await testUser.click(screen.getByRole("button", { name: /solicitar/i }));

    await waitFor(() => {
      expect(api.solicitarAcesso).toHaveBeenCalledWith({
        nome_completo: "João",
        email: "joao@ufpi.br",
        unidade: "1",
        senha: "senha123",
        confirmacao_senha: "senha123"
      });
    });

    expect(screen.getByText(/sua solicitação de acesso foi enviada/i)).toBeInTheDocument();
    
    // Testa botão voltar para login
    const voltarBtn = screen.getByRole("button", { name: /voltar para o login/i });
    expect(voltarBtn).toBeInTheDocument();
    await testUser.click(voltarBtn);
  });

  it("exibe mensagem de erro geral retornada pela API", async () => {
    const error = new Error("Já existe um usuário com este e-mail.");
    error.fieldErrors = {};
    api.solicitarAcesso.mockRejectedValue(error);

    renderWithRouter(<SolicitarAcesso />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled());

    await testUser.type(screen.getByLabelText(/nome completo/i), "João");
    await testUser.type(screen.getByLabelText(/e-mail/i), "joao@ufpi.edu.br");
    await testUser.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await testUser.type(screen.getByLabelText(/^senha/i), "senha123");
    await testUser.type(screen.getByLabelText(/confirmação/i), "senha123");
    await testUser.click(screen.getByRole("button", { name: /solicitar/i }));

    expect(await screen.findByText(/já existe um usuário com este e-mail/i)).toBeInTheDocument();
  });

  it("exibe erro específico de campo quando backend retorna fieldErrors", async () => {
    const error = new Error("Revise os dados informados.");
    error.fieldErrors = { email: ["O e-mail deve pertencer ao domínio @ufpi.edu.br"] };
    api.solicitarAcesso.mockRejectedValue(error);

    renderWithRouter(<SolicitarAcesso />);
    await waitFor(() => expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled());

    await testUser.type(screen.getByLabelText(/nome completo/i), "João");
    await testUser.type(screen.getByLabelText(/e-mail/i), "joao@gmail.com");
    await testUser.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await testUser.type(screen.getByLabelText(/^senha/i), "senha123");
    await testUser.type(screen.getByLabelText(/confirmação/i), "senha123");
    await testUser.click(screen.getByRole("button", { name: /solicitar/i }));

    expect(await screen.findByText(/o e-mail deve pertencer ao domínio @ufpi\.edu\.br/i)).toBeInTheDocument();
  });

  it("exibe aviso quando falha ao carregar unidades", async () => {
    api.listUnidades.mockRejectedValue(new Error("Falha na rede"));
    renderWithRouter(<SolicitarAcesso />);

    expect(await screen.findByText(/não foi possível carregar as unidades/i)).toBeInTheDocument();
  });
});
