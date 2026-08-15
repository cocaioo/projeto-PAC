import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CatalogItemAutocomplete from "../components/CatalogItemAutocomplete";
import { Table } from "../components/ui";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { listCatalogo: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

describe("orçamento de renderização do frontend", () => {
  it("mantém uma tabela de mil itens utilizável", () => {
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: index + 1,
      nome: `Item ${index + 1}`,
      quantidade: (index % 20) + 1,
    }));
    const inicio = performance.now();

    render(
      <Table caption="Massa de desempenho">
        <thead><tr><th>Item</th><th>Quantidade</th></tr></thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}><td>{row.nome}</td><td>{row.quantidade}</td></tr>
          ))}
        </tbody>
      </Table>
    );

    expect(screen.getAllByRole("row")).toHaveLength(1_001);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });

  it("processa uma resposta grande do autocomplete com uma única chamada", async () => {
    const catalogo = Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      nome: `Notebook ${String(index + 1).padStart(3, "0")}`,
      codigo_catmat_catser: `CAT-${index + 1}`,
      grupo_nome: "TIC",
      valor_estimado: "4500.00",
    }));
    api.listCatalogo.mockResolvedValue({ results: catalogo });
    const inicio = performance.now();

    const { rerender } = render(<CatalogItemAutocomplete onSelect={vi.fn()} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "notebook" } });

    await waitFor(() => expect(api.listCatalogo).toHaveBeenCalledTimes(1), { timeout: 2_000 });
    expect(await screen.findAllByRole("option", {}, { timeout: 3_000 })).toHaveLength(500);
    rerender(<CatalogItemAutocomplete onSelect={vi.fn()} />);
    await new Promise((resolve) => window.setTimeout(resolve, 350));

    expect(api.listCatalogo).toHaveBeenCalledTimes(1);
    expect(performance.now() - inicio).toBeLessThan(10_000);
  });
});
