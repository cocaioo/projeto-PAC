import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ValidacaoDecisao from "./ValidacaoDecisao";
import ValidacoesList from "./ValidacoesList";

const authState = vi.hoisted(() => ({ isAdmin: true }));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => authState,
}));

const item = {
  id: 31,
  demanda: 18,
  demanda_id: 18,
  nome: "Projetor multimídia",
  descricao: "Projetor para sala de aula",
  quantidade: 1,
  unidade_medida: "unidade",
  valor_total: "4500.00",
  justificativa_necessidade: "Atualização dos laboratórios",
  status: "aguardando_validacao",
  grupo_id: 7,
  grupo_nome: "Equipamentos",
  demanda_dados: {
    id: 18,
    ano_referencia: 2027,
    status: "aguardando_validacao",
    observacao: "Demanda prioritária",
    enviada_em: "2026-08-15T12:00:00Z",
    unidade: { id: 2, nome: "Centro de Ensino", sigla: "CE" },
    usuario: { id: 10, nome: "Ana Usuária", username: "ana" },
  },
};

let decisoes = [];
let negarDecisao = false;

const server = setupServer(
  http.get("*/api/unidades/", () => HttpResponse.json([
    { id: 2, nome: "Centro de Ensino", sigla: "CE", ativo: true },
  ])),
  http.get("*/api/grupos/", () => HttpResponse.json([
    { id: 7, nome: "Equipamentos", ativo: true },
  ])),
  http.get("*/api/validacoes/pendentes/", () => HttpResponse.json([item])),
  http.post("*/api/validacoes/decidir/", async ({ request }) => {
    const payload = await request.json();
    decisoes.push(payload);
    if (negarDecisao) {
      return HttpResponse.json(
        { detail: "Você não tem permissão para validar itens deste grupo de contratação." },
        { status: 403 }
      );
    }
    return HttpResponse.json({ id: 90, ...payload }, { status: 201 });
  })
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fluxo administrativo de validações", () => {
  beforeEach(() => {
    authState.isAdmin = true;
    decisoes = [];
    negarDecisao = false;
  });

  it("abre uma demanda recebida e valida um item pela API", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ValidacoesList />, {
      route: "/validacoes",
      path: "/validacoes",
      extraRoutes: [
        { path: "/validacoes/:demandaId", element: <ValidacaoDecisao /> },
      ],
    });

    await user.click(await screen.findByRole("link", { name: "Abrir demanda 18" }));
    expect(await screen.findByText("Projetor multimídia")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Validar item Projetor multimídia" }));
    const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
    await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

    await waitFor(() => expect(decisoes).toEqual([{
      item_demanda: 31,
      acao: "validado",
      comentario: "",
    }]));
    expect(await screen.findByLabelText("Status: Validada")).toBeInTheDocument();
    expect(screen.getByText(/validado com sucesso/i)).toBeInTheDocument();
  });

  it("preserva o item pendente quando o backend nega ação fora do grupo", async () => {
    negarDecisao = true;
    const user = userEvent.setup();
    renderWithRouter(<ValidacaoDecisao />, {
      route: "/validacoes/18",
      path: "/validacoes/:demandaId",
    });

    await user.click(await screen.findByRole("button", { name: "Validar item Projetor multimídia" }));
    const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
    await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

    expect(
      await within(modal).findByText(/não tem permissão para realizar esta ação/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validar item Projetor multimídia" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Status: Validada")).not.toBeInTheDocument();
  });
});
