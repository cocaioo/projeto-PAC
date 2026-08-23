import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Profile from "./Profile";

vi.mock("../auth/AuthContext", () => ({
  useAuth: vi.fn(),
}));

describe("Profile", () => {
  it("exibe os grupos administrados efetivos do usuario", async () => {
    const { useAuth } = await import("../auth/AuthContext");
    useAuth.mockReturnValue({
      loading: false,
      user: {
        username: "admin.sti",
        nome_completo: "Admin STI",
        email: "admin.sti@ufpi.edu.br",
        perfil: "admin",
        perfil_display: "Admin",
        siape: "123456",
        is_active: true,
        status_conta: "ativa",
        date_joined: "2026-08-20T10:00:00Z",
        last_login: "2026-08-22T12:00:00Z",
        unidade_detalhe: {
          id: 1,
          nome: "Superintendencia de TI",
          sigla: "STI",
          codigo: "STI-01",
          ativo: true,
        },
        escopo_administrativo_global: false,
        grupos_administrados: [
          { id: 10, nome: "TIC", unidade_admin_sigla: "STI", ativo: true },
          { id: 11, nome: "Software e Licencas", unidade_admin_sigla: "STI", ativo: true },
        ],
      },
    });

    render(<Profile />);

    expect(screen.getByRole("heading", { name: "Admin STI" })).toBeInTheDocument();
    expect(screen.getAllByText("Superintendencia de TI").length).toBeGreaterThan(0);
    expect(screen.getByText("TIC")).toBeInTheDocument();
    expect(screen.getByText("Software e Licencas")).toBeInTheDocument();
    expect(screen.getByText(/escopo administrativo desta conta/i)).toBeInTheDocument();
  });

  it("destaca escopo global para admin master", async () => {
    const { useAuth } = await import("../auth/AuthContext");
    useAuth.mockReturnValue({
      loading: false,
      user: {
        username: "master",
        nome_completo: "Admin Master",
        perfil: "admin_master",
        perfil_display: "Admin Master",
        is_active: true,
        status_conta: "ativa",
        escopo_administrativo_global: true,
        grupos_administrados: [],
      },
    });

    render(<Profile />);

    expect(screen.getByText(/escopo administrativo global/i)).toBeInTheDocument();
    expect(screen.getByText(/supervisionar todos os grupos de contratacao/i)).toBeInTheDocument();
  });
});
