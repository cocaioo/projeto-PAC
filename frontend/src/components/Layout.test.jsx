import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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
  it("mantém sidebar, cabeçalho e Outlet na árvore do único scroll principal", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", nome_completo: "Ana Silva", perfil: "usuario" },
      isAdmin: false,
      logout: vi.fn(),
    });

    const { container } = renderLayout();
    const shell = container.querySelector(".app-shell");
    const sidebar = within(shell).getByRole("complementary", {
      name: /Navegação principal/i,
    });
    const appMain = shell.querySelector(":scope > .app-main");
    const header = within(appMain).getByRole("banner");
    const main = within(appMain).getByRole("main");
    const inner = main.querySelector(":scope > .app-content__inner");

    expect(shell).toContainElement(sidebar);
    expect(sidebar.parentElement).toBe(shell);
    expect(appMain).toBeInTheDocument();
    expect(appMain.parentElement).toBe(shell);
    expect(appMain.children[0]).toBe(header);
    expect(appMain.children[1]).toBe(main);
    expect(main).toHaveClass("app-content");
    expect(main).toHaveAttribute("data-scroll-container", "main");
    expect(inner).toBeInTheDocument();
    expect(inner).toContainElement(screen.getByText("pagina inicial"));
  });

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
    expect(screen.getByText("Minhas demandas")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.queryByText("Pendências de validação")).not.toBeInTheDocument();
  });

  it("não mostra menus administrativos apenas por is_staff", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "operador", perfil: "usuario", is_staff: true },
      isAdmin: false,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.queryByText("Pendências de validação")).not.toBeInTheDocument();
    expect(screen.queryByText("Documentos DFD")).not.toBeInTheDocument();
  });

  it("mostra menus administrativos conforme o perfil PAC mesmo sem is_staff", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "gestor", perfil: "admin", is_staff: false },
      isAdmin: true,
      isStaff: true,
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.getByText("Pendências de validação")).toBeInTheDocument();
    expect(screen.getByText("Documentos DFD")).toBeInTheDocument();
  });
});
