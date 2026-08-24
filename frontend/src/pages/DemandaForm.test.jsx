import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DemandaForm from "./DemandaForm";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { createDemanda: vi.fn(), getDemanda: vi.fn(), updateDemanda: vi.fn() },
}));

describe("DemandaForm", () => {
  let testUser;

  beforeEach(() => {
    testUser = userEvent.setup();
    vi.clearAllMocks();
  });

  it("cria uma demanda e navega para o detalhe", async () => {
    api.createDemanda.mockResolvedValue({ id: 42 });
    renderWithRouter(<DemandaForm />, {
      route: "/demandas/nova",
      path: "/demandas/nova",
      extraRoutes: [{ path: "/demandas/:id", element: <p>detalhe 42</p> }],
    });

    await testUser.clear(screen.getByLabelText(/ano de referência/i));
    await testUser.type(screen.getByLabelText(/ano de referência/i), "2027");
    await testUser.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() =>
      expect(api.createDemanda).toHaveBeenCalledWith(
        expect.objectContaining({ ano_referencia: 2027 })
      )
    );
    expect(await screen.findByText("detalhe 42")).toBeInTheDocument();
  });

  it("mostra erro quando a criação falha", async () => {
    api.createDemanda.mockRejectedValue(new Error("Sem unidade vinculada"));
    renderWithRouter(<DemandaForm />, {
      route: "/demandas/nova",
      path: "/demandas/nova",
    });
    await testUser.click(screen.getByRole("button", { name: /salvar/i }));
    expect(await screen.findByText(/sem unidade vinculada/i)).toBeInTheDocument();
  });

  it("carrega dados existentes ao editar", async () => {
    api.getDemanda.mockResolvedValue({
      id: 5,
      ano_referencia: 2026,
      observacao: "Obs antiga",
    });
    renderWithRouter(<DemandaForm />, {
      route: "/demandas/5/editar",
      path: "/demandas/:id/editar",
    });
    expect(await screen.findByDisplayValue("Obs antiga")).toBeInTheDocument();
  });
});
