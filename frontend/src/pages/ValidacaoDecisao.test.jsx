import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ValidacaoDecisao from "./ValidacaoDecisao";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { getItem: vi.fn(), decidirValidacao: vi.fn() },
}));

const item = {
  id: 3,
  nome: "Notebook",
  descricao: "i5",
  quantidade: 2,
  valor_total: 3000,
  justificativa_necessidade: "Uso diário",
};

function renderDecisao() {
  return renderWithRouter(<ValidacaoDecisao />, {
    route: "/validacoes/3",
    path: "/validacoes/:itemId",
    extraRoutes: [{ path: "/validacoes", element: <p>lista validações</p> }],
  });
}

describe("ValidacaoDecisao", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getItem.mockResolvedValue(item);
  });

  it("exibe o item a analisar", async () => {
    renderDecisao();
    expect(await screen.findByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Uso diário")).toBeInTheDocument();
  });

  it("valida o item e volta para a lista", async () => {
    api.decidirValidacao.mockResolvedValue({ id: 1 });
    renderDecisao();
    await screen.findByText("Notebook");
    await userEvent.click(screen.getByRole("button", { name: /validar/i }));
    await waitFor(() =>
      expect(api.decidirValidacao).toHaveBeenCalledWith({
        item_demanda: 3,
        acao: "validado",
        comentario: "",
      })
    );
    expect(await screen.findByText("lista validações")).toBeInTheDocument();
  });

  it("exige comentário ao devolver", async () => {
    renderDecisao();
    await screen.findByText("Notebook");
    await userEvent.click(screen.getByRole("button", { name: /devolver/i }));
    expect(
      await screen.findByText(/comentário é obrigatório/i)
    ).toBeInTheDocument();
    expect(api.decidirValidacao).not.toHaveBeenCalled();
  });

  it("devolve com comentário", async () => {
    api.decidirValidacao.mockResolvedValue({ id: 2 });
    renderDecisao();
    await screen.findByText("Notebook");
    await userEvent.type(
      screen.getByLabelText(/comentário/i),
      "Ajustar valor"
    );
    await userEvent.click(screen.getByRole("button", { name: /devolver/i }));
    await waitFor(() =>
      expect(api.decidirValidacao).toHaveBeenCalledWith({
        item_demanda: 3,
        acao: "devolvido",
        comentario: "Ajustar valor",
      })
    );
  });
});
