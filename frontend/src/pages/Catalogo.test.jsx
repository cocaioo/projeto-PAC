import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import Catalogo from "./Catalogo";
import { api, ApiError } from "../api/client";

const authState = vi.hoisted(() => ({ isAdmin: false }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: {
      ...actual.api,
      listCatalogo: vi.fn(),
      listGrupos: vi.fn(),
    },
  };
});

const mouse = {
  id: 1,
  nome: "Mouse",
  codigo_catmat_catser: "CATMAT-1",
  tipo: "material",
  grupo_nome: "TIC",
  unidade_medida: "un",
  valor_estimado: 50,
  ativo: true,
};

describe("Catalogo", () => {
  beforeEach(() => {
    authState.isAdmin = false;
    api.listGrupos.mockResolvedValue({
      results: [{ id: 2, nome: "TIC", ativo: true }],
    });
    api.listCatalogo.mockResolvedValue({ results: [mouse] });
  });

  it("lista os itens e os grupos do catálogo", async () => {
    renderWithRouter(<Catalogo />);

    expect(screen.getByText(/carregando itens/i)).toBeInTheDocument();
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.getByText("CATMAT-1")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "TIC" })).toBeInTheDocument();
    expect(screen.getByText(/50,00/)).toBeInTheDocument();
  });

  it("mostra o estado vazio", async () => {
    api.listCatalogo.mockResolvedValue({ results: [] });
    renderWithRouter(<Catalogo />);
    expect(await screen.findByText(/nenhum item encontrado/i)).toBeInTheDocument();
  });

  it("oferece filtro de situação somente ao ADMIN", async () => {
    const user = userEvent.setup();
    authState.isAdmin = true;
    renderWithRouter(<Catalogo />);
    await screen.findByText("Mouse");

    await user.selectOptions(screen.getByLabelText("Situação"), "false");

    await waitFor(() => expect(api.listCatalogo).toHaveBeenLastCalledWith(
      expect.objectContaining({ ativo: "false" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    ));
  });

  it("não mostra o filtro nem itens inativos ao usuário comum", async () => {
    api.listCatalogo.mockResolvedValue({
      results: [mouse, { ...mouse, id: 2, nome: "Item inativo", ativo: false }],
    });
    renderWithRouter(<Catalogo />);

    expect(await screen.findByText("Mouse")).toBeInTheDocument();
    expect(screen.queryByLabelText("Situação")).not.toBeInTheDocument();
    expect(screen.queryByText("Item inativo")).not.toBeInTheDocument();
  });

  it("envia o grupo selecionado e volta à primeira página", async () => {
    const user = userEvent.setup();
    renderWithRouter(<Catalogo />);
    await screen.findByText("Mouse");
    await screen.findByRole("option", { name: "TIC" });

    await user.selectOptions(screen.getByLabelText("Grupo"), "2");

    await waitFor(() => expect(api.listCatalogo).toHaveBeenLastCalledWith(
      expect.objectContaining({ grupo: "2", page: undefined }),
      expect.any(Object)
    ));
  });

  it("pagina apenas quando a API informa metadados de paginação", async () => {
    const user = userEvent.setup();
    api.listCatalogo.mockResolvedValue({
      count: 21,
      next: "http://localhost/api/catalogo/?page=2",
      previous: null,
      results: [mouse],
    });
    renderWithRouter(<Catalogo />);
    await screen.findByText("21 itens • Página 1");

    await user.click(screen.getByRole("button", { name: /próxima/i }));

    await waitFor(() => expect(api.listCatalogo).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.any(Object)
    ));
  });

  it("mostra erro padronizado e permite tentar novamente", async () => {
    const user = userEvent.setup();
    api.listCatalogo
      .mockRejectedValueOnce(new ApiError("Falha ao consultar.", 400))
      .mockResolvedValueOnce({ results: [mouse] });
    renderWithRouter(<Catalogo />);

    expect(await screen.findByText("Falha ao consultar.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(await screen.findByText("Mouse")).toBeInTheDocument();
  });
});
