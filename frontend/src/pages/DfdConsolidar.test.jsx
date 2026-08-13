import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DfdConsolidar from "./DfdConsolidar";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    itensDisponiveis: vi.fn(),
    listGrupos: vi.fn(),
    consolidarDfd: vi.fn(),
  },
}));

describe("DfdConsolidar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.itensDisponiveis.mockResolvedValue([
      { id: 5, nome: "Notebook", quantidade: 2, valor_total: 3000 },
    ]);
    api.listGrupos.mockResolvedValue({
      results: [{ id: 1, nome: "TIC" }],
    });
  });

  it("valida campos obrigatórios antes de consolidar", async () => {
    renderWithRouter(<DfdConsolidar />);
    await screen.findByText("Notebook");
    await userEvent.click(
      screen.getByRole("button", { name: /consolidar dfd/i })
    );
    expect(
      await screen.findByText(/selecione ao menos um item/i)
    ).toBeInTheDocument();
    expect(api.consolidarDfd).not.toHaveBeenCalled();
  });

  it("consolida DFD com item selecionado e navega ao detalhe", async () => {
    api.consolidarDfd.mockResolvedValue({ id: 9 });
    renderWithRouter(<DfdConsolidar />, {
      route: "/dfds/consolidar",
      path: "/dfds/consolidar",
      extraRoutes: [{ path: "/dfds/:id", element: <p>detalhe dfd</p> }],
    });
    await screen.findByText("Notebook");

    await userEvent.type(screen.getByLabelText(/número do dfd/i), "DFD-001");
    await userEvent.selectOptions(
      screen.getByLabelText(/grupo de contratação/i),
      "1"
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: /selecionar notebook/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /consolidar dfd/i })
    );

    await waitFor(() =>
      expect(api.consolidarDfd).toHaveBeenCalledWith({
        numero: "DFD-001",
        grupo: 1,
        itens: [5],
      })
    );
    expect(await screen.findByText("detalhe dfd")).toBeInTheDocument();
  });
});
