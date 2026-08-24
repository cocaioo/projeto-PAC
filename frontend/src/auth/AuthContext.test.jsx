import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { me: vi.fn(), csrf: vi.fn(), login: vi.fn(), logout: vi.fn() },
}));

function Consumer() {
  const { user, loading, login, logout, isAdmin, isAdminMaster } = useAuth();
  if (loading) return <p>carregando</p>;
  return (
    <div>
      <span>usuario: {user ? user.username : "anonimo"}</span>
      <span>admin: {isAdmin ? "sim" : "não"}</span>
      <span>master: {isAdminMaster ? "sim" : "não"}</span>
      <button onClick={() => login("ana", "senha")}>entrar</button>
      <button onClick={logout}>sair</button>
    </div>
  );
}

describe("AuthContext", () => {
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
    api.csrf.mockResolvedValue({});
  });

  it("carrega o usuário autenticado ao montar", async () => {
    api.me.mockResolvedValue({ username: "ana" });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    expect(screen.getByText("carregando")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("usuario: ana")).toBeInTheDocument()
    );
  });

  it("mostra anônimo quando não autenticado", async () => {
    api.me.mockRejectedValue(new Error("401"));
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() =>
      expect(screen.getByText("usuario: anonimo")).toBeInTheDocument()
    );
  });

  it("login atualiza o usuário", async () => {
    api.me.mockRejectedValue(new Error("401"));
    api.login.mockResolvedValue({ username: "ana" });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );
    await waitFor(() => screen.getByText("usuario: anonimo"));
    await testUser.click(screen.getByText("entrar"));
    await waitFor(() =>
      expect(screen.getByText("usuario: ana")).toBeInTheDocument()
    );
    expect(api.csrf).toHaveBeenCalled();
  });

  it("deriva acesso administrativo do perfil PAC, não de is_staff", async () => {
    api.me.mockResolvedValue({
      username: "operador",
      perfil: "usuario",
      is_staff: true,
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("admin: não")).toBeInTheDocument());
    expect(screen.getByText("master: não")).toBeInTheDocument();
  });

  it("consome as capacidades efetivas expostas pela API", async () => {
    api.me.mockResolvedValue({
      username: "supervisor",
      perfil: "usuario",
      is_staff: false,
      is_admin_user: true,
      is_admin_master_user: true,
    });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    await waitFor(() => expect(screen.getByText("admin: sim")).toBeInTheDocument());
    expect(screen.getByText("master: sim")).toBeInTheDocument();
  });
});
