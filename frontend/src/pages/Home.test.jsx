import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import Home from "./Home";
import * as AuthModule from "../auth/AuthContext";

describe("Home", () => {
  it("mostra botão de entrar quando anônimo", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({ user: null });
    renderWithRouter(<Home />);
    expect(screen.getByText("Entrar")).toBeInTheDocument();
    expect(screen.queryByText("Demandas")).not.toBeInTheDocument();
  });

  it("saúda o usuário e mostra atalhos quando autenticado", () => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: { username: "ana", nome_completo: "Ana Silva" },
    });
    renderWithRouter(<Home />);
    expect(screen.getByText(/bem-vindo\(a\), ana silva/i)).toBeInTheDocument();
    expect(screen.getByText("Demandas")).toBeInTheDocument();
  });
});
