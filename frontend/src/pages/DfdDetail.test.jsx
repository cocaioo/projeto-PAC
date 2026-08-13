import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import DfdDetail from "./DfdDetail";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { getDfd: vi.fn() },
}));

describe("DfdDetail", () => {
  beforeEach(() => vi.clearAllMocks());

  it("exibe os dados e itens do DFD", async () => {
    api.getDfd.mockResolvedValue({
      id: 1,
      numero: "DFD-001",
      grupo_nome: "TIC",
      criado_por_nome: "Admin",
      total: 3000,
      itens: [{ id: 5, nome: "Notebook", quantidade: 2, valor_total: 3000 }],
    });
    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });
    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
