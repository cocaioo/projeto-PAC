import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import Catalogo from "./Catalogo";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { listCatalogo: vi.fn() },
}));

describe("Catalogo", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lista os itens do catálogo", async () => {
    api.listCatalogo.mockResolvedValue({
      results: [
        {
          id: 1,
          nome: "Mouse",
          tipo: "material",
          grupo_nome: "TIC",
          unidade_medida: "un",
          valor_estimado: 50,
        },
      ],
    });
    renderWithRouter(<Catalogo />);
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("TIC")).toBeInTheDocument();
    expect(screen.getByText(/50,00/)).toBeInTheDocument();
  });

  it("mostra aviso de catálogo vazio", async () => {
    api.listCatalogo.mockResolvedValue({ results: [] });
    renderWithRouter(<Catalogo />);
    expect(
      await screen.findByText(/nenhum item no catálogo/i)
    ).toBeInTheDocument();
  });
});
