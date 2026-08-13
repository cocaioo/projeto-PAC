import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import ValidacoesList from "./ValidacoesList";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { listPendentes: vi.fn() },
}));

describe("ValidacoesList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista itens pendentes com link para analisar", async () => {
    api.listPendentes.mockResolvedValue([
      { id: 3, nome: "Notebook", quantidade: 2, valor_total: 3000 },
    ]);
    renderWithRouter(<ValidacoesList />);
    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /analisar/i })).toHaveAttribute(
      "href",
      "/validacoes/3"
    );
  });

  it("mostra aviso quando não há pendências", async () => {
    api.listPendentes.mockResolvedValue([]);
    renderWithRouter(<ValidacoesList />);
    expect(
      await screen.findByText(/nenhum item pendente/i)
    ).toBeInTheDocument();
  });
});
