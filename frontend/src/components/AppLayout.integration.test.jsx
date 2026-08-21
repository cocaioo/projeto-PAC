import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { api } from "../api/client";
import * as AuthModule from "../auth/AuthContext";
import DemandaList from "../pages/DemandaList";
import Layout from "./Layout";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      listDemandas: vi.fn(),
    },
  };
});

function renderDemandasInsideLayout() {
  return render(
    <MemoryRouter initialEntries={["/demandas"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/demandas" element={<DemandaList />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AppLayout integrado a uma página tabular", () => {
  beforeEach(() => {
    vi.spyOn(AuthModule, "useAuth").mockReturnValue({
      user: {
        username: "ana",
        nome_completo: "Ana Silva",
        perfil: "usuario",
      },
      isAdmin: false,
      logout: vi.fn(),
    });
    api.listDemandas.mockResolvedValue({
      results: Array.from({ length: 12 }, (_, index) => ({
        id: index + 1,
        unidade_sigla: `UNI-${index + 1}`,
        ano_referencia: 2027,
        status: "rascunho",
        valor_total: (index + 1) * 100,
      })),
    });
  });

  it("mantém a página no scroll principal e reserva à tabela apenas o eixo horizontal", async () => {
    const { container } = renderDemandasInsideLayout();
    const table = await screen.findByRole("table", {
      name: /Demandas cadastradas pelo usu.rio/i,
    });
    const main = screen.getByRole("main");
    const inner = main.querySelector(":scope > .app-content__inner");
    const tableWrap = table.closest(".pac-table-wrap");
    const declaredScrollContainers = container.querySelectorAll(
      "[data-scroll-container]"
    );

    expect(main).toHaveClass("app-content");
    expect(main).toHaveAttribute("data-scroll-container", "main");
    expect(inner).toContainElement(table);
    expect(tableWrap).toBeInTheDocument();
    expect(tableWrap).toHaveAttribute("data-scroll-direction", "horizontal");
    expect(tableWrap).not.toHaveAttribute("data-scroll-container");
    expect(declaredScrollContainers).toHaveLength(1);
    expect(declaredScrollContainers[0]).toBe(main);
  });
});
