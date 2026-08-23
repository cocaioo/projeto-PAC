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
  beforeEach(() => {
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

    await userEvent.type(screen.getByLabelText(/nome completo/i), "João");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "joao@ufpi.br");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await userEvent.type(screen.getByLabelText(/^senha/i), "senha123");
    await userEvent.type(screen.getByLabelText(/confirmação/i), "senha321");
    
    await userEvent.click(screen.getByRole("button", { name: /solicitar/i }));

    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
    expect(api.solicitarAcesso).not.toHaveBeenCalled();
  });

  it("envia formulário com sucesso e exibe mensagem de sucesso sem redirecionar automaticamente", async () => {
    api.solicitarAcesso.mockResolvedValue({});
    renderWithRouter(<SolicitarAcesso />);
    
    await waitFor(() => expect(screen.getByRole("combobox", { name: /unidade/i })).not.toBeDisabled());

    await userEvent.type(screen.getByLabelText(/nome completo/i), "João");
    await userEvent.type(screen.getByLabelText(/e-mail/i), "joao@ufpi.br");
    await userEvent.selectOptions(screen.getByRole("combobox", { name: /unidade/i }), "1");
    await userEvent.type(screen.getByLabelText(/^senha/i), "senha123");
    await userEvent.type(screen.getByLabelText(/confirmação/i), "senha123");
    
    await userEvent.click(screen.getByRole("button", { name: /solicitar/i }));

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
  });
});
