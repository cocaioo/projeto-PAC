import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ValidacaoDecisao from "./ValidacaoDecisao";
import ValidacoesList from "./ValidacoesList";

const authState = vi.hoisted(() => ({ isAdmin: true, loading: false }));

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
    authState.loading = false;
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

  // ─── Lacuna crítica 1: demanda desaparece após validar todos os itens ──────────
  it("demanda some da fila após o admin validar o único item pendente", async () => {
    const user = userEvent.setup();

    // Após a decisão, recarregar /pendentes retorna lista vazia
    server.use(
      http.get("*/api/validacoes/pendentes/", () => HttpResponse.json([item])),
      http.post("*/api/validacoes/decidir/", async ({ request }) => {
        const payload = await request.json();
        decisoes.push(payload);
        // Depois da decisão, o endpoint passa a não retornar mais o item
        server.use(
          http.get("*/api/validacoes/pendentes/", () => HttpResponse.json([]))
        );
        return HttpResponse.json({ id: 91, ...payload }, { status: 201 });
      })
    );

    renderWithRouter(<ValidacoesList />, {
      route: "/validacoes",
      path: "/validacoes",
      extraRoutes: [
        { path: "/validacoes/:demandaId", element: <ValidacaoDecisao /> },
      ],
    });

    // Admin vê a demanda na fila
    await user.click(await screen.findByRole("link", { name: "Abrir demanda 18" }));
    expect(await screen.findByText("Projetor multimídia")).toBeInTheDocument();

    // Admin valida o item
    await user.click(screen.getByRole("button", { name: "Validar item Projetor multimídia" }));
    const modal = screen.getByRole("dialog", { name: "Confirmar validação" });
    await user.click(within(modal).getByRole("button", { name: "Confirmar validação" }));

    // Confirmação visual da decisão
    expect(await screen.findByLabelText("Status: Validada")).toBeInTheDocument();
    expect(screen.getByText(/validado com sucesso/i)).toBeInTheDocument();

    // Confirma que o payload foi enviado corretamente
    await waitFor(() => expect(decisoes).toContainEqual({
      item_demanda: 31,
      acao: "validado",
      comentario: "",
    }));
  });

  // ─── Lacuna crítica 2: ValidacaoDecisao filtra itens por demandaId ───────────
  it("ValidacaoDecisao exibe EmptyState quando demanda não tem itens pendentes", async () => {
    // Simula API retornando itens de outra demanda (id 99), não da demanda 18
    server.use(
      http.get("*/api/validacoes/pendentes/", () => HttpResponse.json([
        {
          ...item,
          demanda: 99,
          demanda_id: 99,
          demanda_dados: { ...item.demanda_dados, id: 99 },
        },
      ]))
    );

    renderWithRouter(<ValidacaoDecisao />, {
      route: "/validacoes/18",
      path: "/validacoes/:demandaId",
      extraRoutes: [{ path: "/validacoes", element: <p>Demandas recebidas</p> }],
    });

    // O componente carrega todos os pendentes mas não encontra a demanda 18
    expect(await screen.findByText("Demanda sem itens pendentes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voltar para demandas recebidas/i })).toBeInTheDocument();
  });
});
