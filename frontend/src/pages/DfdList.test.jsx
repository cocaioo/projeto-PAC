import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import DfdList from "./DfdList";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { listDfds: vi.fn() },
}));

describe("DfdList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista os DFDs", async () => {
    api.listDfds.mockResolvedValue({
      results: [{ id: 1, numero: "DFD-001", grupo_nome: "TIC", total: 3000 }],
    });
    renderWithRouter(<DfdList />);
    expect(await screen.findByText("DFD-001")).toBeInTheDocument();
    expect(screen.getByText("TIC")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /consolidar/i })
    ).toBeInTheDocument();
  });

  it("mostra aviso quando não há DFDs", async () => {
    api.listDfds.mockResolvedValue({ results: [] });
    renderWithRouter(<DfdList />);
    expect(await screen.findByText(/nenhum dfd cadastrado/i)).toBeInTheDocument();
  });
});
