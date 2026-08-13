import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import Dashboard from "./Dashboard";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { dashboardStats: vi.fn() },
}));

describe("Dashboard", () => {
  beforeEach(() => {
    api.dashboardStats.mockResolvedValue({
      total_demandas: 3,
      total_itens: 7,
      aguardando_validacao: 2,
      validados: 4,
      consolidados: 1,
      total_dfds: 1,
      valor_total_estimado: 1500,
      itens_por_status: { rascunho: 1, validada: 4 },
    });
  });

  it("exibe os indicadores retornados pela API", async () => {
    renderWithRouter(<Dashboard />);
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Valor total estimado")).toBeInTheDocument();
    expect(screen.getByText(/1\.500,00/)).toBeInTheDocument();
    // Total de demandas.
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("mostra erro quando a API falha", async () => {
    api.dashboardStats.mockRejectedValue(new Error("Falha ao carregar"));
    renderWithRouter(<Dashboard />);
    expect(await screen.findByText("Falha ao carregar")).toBeInTheDocument();
  });
});
