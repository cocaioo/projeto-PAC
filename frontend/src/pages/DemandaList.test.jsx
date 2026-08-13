import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import DemandaList from "./DemandaList";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { listDemandas: vi.fn() },
}));

describe("DemandaList", () => {
  beforeEach(() => {
    api.listDemandas.mockReset();
  });

  it("lista as demandas retornadas pela API", async () => {
    api.listDemandas.mockResolvedValue({
      results: [
        {
          id: 1,
          unidade_sigla: "STI",
          ano_referencia: 2027,
          status: "rascunho",
          valor_total: 3000,
        },
      ],
    });
    renderWithRouter(<DemandaList />);
    expect(await screen.findByText("STI")).toBeInTheDocument();
    expect(screen.getByText("Rascunho")).toBeInTheDocument();
    expect(screen.getByText(/3\.000,00/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /nova demanda/i })).toBeInTheDocument();
  });

  it("mostra aviso quando não há demandas", async () => {
    api.listDemandas.mockResolvedValue({ results: [] });
    renderWithRouter(<DemandaList />);
    expect(
      await screen.findByText(/nenhuma demanda cadastrada/i)
    ).toBeInTheDocument();
  });
});
