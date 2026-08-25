import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ChangePassword from "./ChangePassword";
import * as AuthModule from "../auth/AuthContext";

describe("ChangePassword", () => {
  const changePassword = vi.fn();
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
    changePassword.mockReset();
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({ changePassword });
  });

  it("renderiza os tres campos de senha", () => {
    renderWithRouter(<ChangePassword />, { route: "/trocar-senha", path: "/trocar-senha" });

    expect(screen.getByLabelText(/senha atual/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nova senha \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirme a nova senha/i)).toBeInTheDocument();
  });

  it("permite mostrar e ocultar cada campo de senha", async () => {
    renderWithRouter(<ChangePassword />, { route: "/trocar-senha", path: "/trocar-senha" });

    const passwordFields = [
      screen.getByLabelText(/senha atual/i),
      screen.getByLabelText(/^nova senha \*/i),
      screen.getByLabelText(/confirme a nova senha/i),
    ];
    const toggles = screen.getAllByRole("button", { name: "Mostrar senha" });

    expect(toggles).toHaveLength(3);
    for (const [index, toggle] of toggles.entries()) {
      await testUser.click(toggle);
      expect(passwordFields[index]).toHaveAttribute("type", "text");
      expect(toggle).toHaveAccessibleName("Ocultar senha");
      expect(toggle).toHaveAttribute("aria-pressed", "true");
    }
  });

  it("valida confirmacao sem enviar senhas inconsistentes", async () => {
    renderWithRouter(<ChangePassword />, { route: "/trocar-senha", path: "/trocar-senha" });

    await testUser.type(screen.getByLabelText(/senha atual/i), "atual");
    await testUser.type(screen.getByLabelText(/^nova senha \*/i), "nova");
    await testUser.type(screen.getByLabelText(/confirme a nova senha/i), "diferente");
    await testUser.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByText(/senhas não conferem/i)).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("exibe erros por campo retornados pela API", async () => {
    const error = new Error("Revise os dados informados.");
    error.fieldErrors = {
      current_password: ["Senha atual incorreta."],
      new_password: ["A senha é muito curta."],
    };
    changePassword.mockRejectedValue(error);
    renderWithRouter(<ChangePassword />, { route: "/trocar-senha", path: "/trocar-senha" });

    await testUser.type(screen.getByLabelText(/senha atual/i), "atual");
    await testUser.type(screen.getByLabelText(/^nova senha \*/i), "nova");
    await testUser.type(screen.getByLabelText(/confirme a nova senha/i), "nova");
    await testUser.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
    expect(screen.getByText("A senha é muito curta.")).toBeInTheDocument();
    expect(screen.getByText("Revise os dados informados.")).toBeInTheDocument();
  });

  it("envia as senhas sem armazená-las e mostra sucesso antes de ir para a home", async () => {
    changePassword.mockResolvedValue({ detail: "Senha alterada." });
    renderWithRouter(<ChangePassword />, {
      route: "/trocar-senha",
      path: "/trocar-senha",
      extraRoutes: [{ path: "/", element: <p>início</p> }],
    });

    await testUser.type(screen.getByLabelText(/senha atual/i), "senha-atual");
    await testUser.type(screen.getByLabelText(/^nova senha \*/i), "senha-nova");
    await testUser.type(screen.getByLabelText(/confirme a nova senha/i), "senha-nova");
    await testUser.click(screen.getByRole("button", { name: /alterar senha/i }));

    await waitFor(() => {
      expect(changePassword).toHaveBeenCalledWith({
        senha_atual: "senha-atual",
        nova_senha: "senha-nova",
        confirmacao_senha: "senha-nova",
      });
      expect(screen.getByText(/senha alterada com sucesso/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/senha atual/i)).toHaveValue("");
    expect(screen.getByLabelText(/^nova senha \*/i)).toHaveValue("");
    expect(screen.getByLabelText(/confirme a nova senha/i)).toHaveValue("");

    expect(await screen.findByText("início", {}, { timeout: 2000 })).toBeInTheDocument();
  });
});
