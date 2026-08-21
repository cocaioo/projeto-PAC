import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DemandaList from "./DemandaList";
import { api, ApiError } from "../api/client";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { listDemandas: vi.fn() },
  };
});

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
    expect(screen.getByRole("link", { name: /acompanhar demanda 1/i })).toHaveAttribute(
      "href",
      "/demandas/1"
    );
  });

  it("mostra aviso quando não há demandas", async () => {
    api.listDemandas.mockResolvedValue({ results: [] });
    renderWithRouter(<DemandaList />);
    expect(
      await screen.findByText(/nenhuma demanda cadastrada/i)
    ).toBeInTheDocument();
  });

  it("mostra erro padronizado e permite tentar carregar novamente", async () => {
    api.listDemandas
      .mockRejectedValueOnce(new ApiError("Falha ao consultar demandas.", 500))
      .mockResolvedValueOnce({ results: [] });

    renderWithRouter(<DemandaList />);

    expect(await screen.findByText(/falha ao consultar demandas/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

    expect(await screen.findByText(/nenhuma demanda cadastrada/i)).toBeInTheDocument();
    expect(api.listDemandas).toHaveBeenCalledTimes(2);
  });
});
