import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import * as AuthModule from "../auth/AuthContext";

function renderRoute({ adminOnly = false, adminMasterOnly = false } = {}) {
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route
          path="/privado"
          element={
            <ProtectedRoute adminOnly={adminOnly} adminMasterOnly={adminMasterOnly}>
              <p>conteudo protegido</p>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<p>tela de login</p>} />
        <Route path="/" element={<p>inicio</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("mostra spinner enquanto carrega", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({ user: null, loading: true });
    renderRoute();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("redireciona para login quando não autenticado", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({ user: null, loading: false });
    renderRoute();
    expect(screen.getByText("tela de login")).toBeInTheDocument();
  });

  it("renderiza o conteúdo quando autenticado", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana" },
      loading: false,
    });
    renderRoute();
    expect(screen.getByText("conteudo protegido")).toBeInTheDocument();
  });

  it("bloqueia usuário comum em rota adminOnly", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", perfil: "usuario", is_staff: false },
      loading: false,
      isAdmin: false,
    });
    renderRoute({ adminOnly: true });
    expect(screen.getByText("inicio")).toBeInTheDocument();
  });

  it("autoriza perfil ADMIN em rota adminOnly quando AuthContext confirma isAdmin=true", () => {
    // Bug #2: ProtectedRoute agora delega ao AuthContext o cálculo de isAdmin.
    // O mock deve refletir o que o AuthContext real retornaria para perfil='admin'.
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "gestor", perfil: "admin", is_staff: false },
      loading: false,
      isAdmin: true,
    });
    renderRoute({ adminOnly: true });
    expect(screen.getByText("conteudo protegido")).toBeInTheDocument();
  });

  it("não trata is_staff isolado como perfil administrativo do PAC", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "operador", perfil: "usuario", is_staff: true },
      loading: false,
      isAdmin: false,
    });
    renderRoute({ adminOnly: true });
    expect(screen.getByText("inicio")).toBeInTheDocument();
  });

  it("bloqueia usuǭrio comum em rota adminMasterOnly", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", perfil: "usuario", is_staff: false },
      loading: false,
      isAdmin: false,
      isAdminMaster: false,
    });
    renderRoute({ adminMasterOnly: true });
    expect(screen.getByText("inicio")).toBeInTheDocument();
  });

  it("bloqueia admin comum em rota adminMasterOnly", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", perfil: "admin", is_staff: false },
      loading: false,
      isAdmin: true,
      isAdminMaster: false,
    });
    renderRoute({ adminMasterOnly: true });
    expect(screen.getByText("inicio")).toBeInTheDocument();
  });

  it("autoriza admin_master em rota adminMasterOnly", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "gestor_master", perfil: "admin_master", is_staff: false },
      loading: false,
      isAdmin: true,
      isAdminMaster: true,
    });
    renderRoute({ adminMasterOnly: true });
    expect(screen.getByText("conteudo protegido")).toBeInTheDocument();
  });
});
