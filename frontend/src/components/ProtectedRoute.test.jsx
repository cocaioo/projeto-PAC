import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import * as AuthModule from "../auth/AuthContext";

function renderRoute(staffOnly = false) {
  return render(
    <MemoryRouter initialEntries={["/privado"]}>
      <Routes>
        <Route
          path="/privado"
          element={
            <ProtectedRoute staffOnly={staffOnly}>
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

  it("bloqueia usuário comum em rota staffOnly", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", is_staff: false },
      loading: false,
    });
    renderRoute(true);
    expect(screen.getByText("inicio")).toBeInTheDocument();
  });
});
