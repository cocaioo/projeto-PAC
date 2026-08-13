import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import Login from "./Login";
import * as AuthModule from "../auth/AuthContext";

describe("Login", () => {
  const login = vi.fn();

  beforeEach(() => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({ login, user: null });
  });

  it("renderiza o formulário de login", () => {
    renderWithRouter(<Login />);
    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("chama login e navega ao autenticar com sucesso", async () => {
    login.mockResolvedValue({ username: "ana" });
    renderWithRouter(<Login />, {
      route: "/login",
      path: "/login",
      extraRoutes: [{ path: "/", element: <p>inicio</p> }],
    });
    await userEvent.type(screen.getByLabelText(/usuário/i), "ana");
    await userEvent.type(screen.getByLabelText(/senha/i), "senha123");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(login).toHaveBeenCalledWith("ana", "senha123");
    await waitFor(() => expect(screen.getByText("inicio")).toBeInTheDocument());
  });

  it("mostra mensagem de erro quando o login falha", async () => {
    login.mockRejectedValue(new Error("Credenciais inválidas."));
    renderWithRouter(<Login />, { route: "/login", path: "/login" });
    await userEvent.type(screen.getByLabelText(/usuário/i), "ana");
    await userEvent.type(screen.getByLabelText(/senha/i), "errada");
    await userEvent.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      await screen.findByText(/credenciais inválidas/i)
    ).toBeInTheDocument();
  });
});
