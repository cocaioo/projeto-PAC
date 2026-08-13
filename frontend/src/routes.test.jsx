import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppRoutes from "./routes";
import * as AuthModule from "./auth/AuthContext";
import { api } from "./api/client";

vi.mock("./api/client", () => ({
  api: {
    listDemandas: vi.fn().mockResolvedValue({ results: [] }),
    dashboardStats: vi.fn(),
  },
}));

function renderAt(path, authValue) {
  vi.spyOn(AuthModule, "useAuth").mockReturnValue(authValue);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

describe("AppRoutes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("mostra a Home na rota raiz", () => {
    renderAt("/", { user: null, loading: false, isStaff: false });
    expect(
      screen.getByText(/plano anual de contratações da ufpi/i)
    ).toBeInTheDocument();
  });

  it("redireciona rota protegida para login quando anônimo", () => {
    renderAt("/demandas", { user: null, loading: false, isStaff: false });
    expect(screen.getByLabelText(/usuário/i)).toBeInTheDocument();
  });

  it("renderiza a lista de demandas para usuário autenticado", async () => {
    renderAt("/demandas", {
      user: { username: "ana", is_staff: false },
      loading: false,
      isStaff: false,
    });
    expect(
      await screen.findByRole("link", { name: /nova demanda/i })
    ).toBeInTheDocument();
    expect(api.listDemandas).toHaveBeenCalled();
  });

  it("bloqueia rota de staff para usuário comum", () => {
    renderAt("/validacoes", {
      user: { username: "ana", is_staff: false },
      loading: false,
      isStaff: false,
    });
    // Redireciona para a Home.
    expect(
      screen.getByText(/plano anual de contratações da ufpi/i)
    ).toBeInTheDocument();
  });
});
