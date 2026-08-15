import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import * as AuthModule from "../auth/AuthContext";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<p>pagina inicial</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("Layout", () => {
  it("mostra 'Entrar' quando não autenticado e esconde menus", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: null,
      isStaff: false,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.getByText("Entrar")).toBeInTheDocument();
    expect(screen.queryByText("Demandas")).not.toBeInTheDocument();
  });

  it("mostra menus do usuário autenticado, mas não os de staff", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", nome_completo: "Ana Silva", is_staff: false },
      isStaff: false,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.getByText("Demandas")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.queryByText("Validações")).not.toBeInTheDocument();
  });

  it("não mostra menus administrativos apenas por is_staff", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "operador", perfil: "usuario", is_staff: true },
      isAdmin: false,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.queryByText("Validações")).not.toBeInTheDocument();
    expect(screen.queryByText("DFDs")).not.toBeInTheDocument();
  });

  it("mostra menus administrativos conforme o perfil PAC mesmo sem is_staff", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "gestor", perfil: "admin", is_staff: false },
      isAdmin: true,
      isStaff: true,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.getByText("Validações")).toBeInTheDocument();
    expect(screen.getByText("DFDs")).toBeInTheDocument();
  });
});
