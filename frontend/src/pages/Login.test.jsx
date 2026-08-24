import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import Login from "./Login";
import * as AuthModule from "../auth/AuthContext";

describe("Login", () => {
  const login = vi.fn();
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
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
    await testUser.type(screen.getByLabelText(/usuário/i), "ana");
    await testUser.type(screen.getByLabelText(/senha/i), "senha123");
    await testUser.click(screen.getByRole("button", { name: /entrar/i }));

    expect(login).toHaveBeenCalledWith("ana", "senha123");
    await waitFor(() => expect(screen.getByText("inicio")).toBeInTheDocument());
  });

  it("mostra mensagem de erro quando o login falha", async () => {
    login.mockRejectedValue(new Error("Credenciais inválidas."));
    renderWithRouter(<Login />, { route: "/login", path: "/login" });
    await testUser.type(screen.getByLabelText(/usuário/i), "ana");
    await testUser.type(screen.getByLabelText(/senha/i), "errada");
    await testUser.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      await screen.findByText(/credenciais inválidas/i)
    ).toBeInTheDocument();
  });

  it("possui link para solicitar acesso", () => {
    renderWithRouter(<Login />, { route: "/login", path: "/login" });
    const link = screen.getByRole("link", { name: /solicitar acesso/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/solicitar-acesso");
  });

  it("aceita e-mail institucional e remove espaços em branco", async () => {
    login.mockResolvedValue({ username: "ana.maria" });
    renderWithRouter(<Login />, {
      route: "/login",
      path: "/login",
      extraRoutes: [{ path: "/", element: <p>inicio</p> }],
    });
    await testUser.type(screen.getByLabelText(/usuário/i), "  ana.maria@ufpi.edu.br  ");
    await testUser.type(screen.getByLabelText(/senha/i), "senha123");
    await testUser.click(screen.getByRole("button", { name: /entrar/i }));

    expect(login).toHaveBeenCalledWith("ana.maria@ufpi.edu.br", "senha123");
    await waitFor(() => expect(screen.getByText("inicio")).toBeInTheDocument());
  });

  it("trata erro 401 sem detalhe com mensagem clara sem exibir sessão expirada", async () => {
    const error401 = new Error("Sua sessão expirou. Entre novamente.");
    error401.status = 401;
    login.mockRejectedValue(error401);

    renderWithRouter(<Login />, { route: "/login", path: "/login" });
    await testUser.type(screen.getByLabelText(/usuário/i), "usuario@ufpi.edu.br");
    await testUser.type(screen.getByLabelText(/senha/i), "senha");
    await testUser.click(screen.getByRole("button", { name: /entrar/i }));

    expect(
      await screen.findByText(/credenciais inválidas/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/sua sessão expirou/i)).not.toBeInTheDocument();
  });
});
