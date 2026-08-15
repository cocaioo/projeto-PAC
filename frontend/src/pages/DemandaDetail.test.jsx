import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import DemandaDetail from "./DemandaDetail";
import { api, ApiError } from "../api/client";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    api: { getDemanda: vi.fn(), enviarDemanda: vi.fn(), reenviarItem: vi.fn() },
  };
});

const demandaRascunho = {
  id: 7,
  unidade_sigla: "STI",
  ano_referencia: 2027,
  usuario_nome: "Ana Silva",
  status: "rascunho",
  valor_total: 3000,
  itens: [
    {
      id: 1,
      nome: "Notebook",
      quantidade: 2,
      valor_estimado: 1500,
      valor_total: 3000,
      status: "rascunho",
    },
  ],
};

const demandaDevolvida = {
  id: 7,
  unidade_sigla: "STI",
  ano_referencia: 2027,
  usuario_nome: "Ana Silva",
  status: "em_andamento",
  valor_total: 1500,
  itens: [
    {
      id: 10,
      nome: "Impressora Laser",
      quantidade: 1,
      valor_estimado: 1500,
      valor_total: 1500,
      status: "devolvida",
      justificativa_devolucao: "Ajustar especificações técnicas.",
      ultima_devolucao: {
        id: 1,
        comentario: "Ajustar especificações técnicas.",
        responsavel: { id: 5, nome: "Carlos Admin" },
      },
      observacoes: "Especificações revisadas.",
    },
    {
      id: 11,
      nome: "Mouse USB",
      quantidade: 5,
      valor_estimado: 50,
      valor_total: 250,
      status: "validada",
      justificativa_devolucao: null,
    },
  ],
};

function renderDetail() {
  return renderWithRouter(<DemandaDetail />, {
    route: "/demandas/7",
    path: "/demandas/:id",
  });
}

describe("DemandaDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockImplementation(() => true);
  });

  it("exibe os dados e itens da demanda", async () => {
    api.getDemanda.mockResolvedValue(demandaRascunho);
    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /editar demanda/i })).toHaveAttribute(
      "href",
      "/demandas/7/editar"
    );
    expect(screen.getByRole("link", { name: /editar item notebook/i })).toHaveAttribute(
      "href",
      "/demandas/7/itens/1/editar"
    );
    expect(screen.getByRole("button", { name: /enviar para validação/i })).toBeInTheDocument();
  });

  it("envia a demanda para validação", async () => {
    api.getDemanda.mockResolvedValue(demandaRascunho);
    api.enviarDemanda.mockResolvedValue({
      ...demandaRascunho,
      status: "aguardando_validacao",
    });
    renderDetail();
    await screen.findByText("Demanda #7");
    await userEvent.click(
      screen.getByRole("button", { name: /enviar para validação/i })
    );
    await waitFor(() =>
      expect(api.enviarDemanda).toHaveBeenCalledWith("7")
    );
    expect(
      await screen.findByText(/enviada para validação/i)
    ).toBeInTheDocument();
  });

  it("não mostra botão de enviar quando não está em rascunho", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaRascunho,
      status: "validada",
      itens: demandaRascunho.itens.map((item) => ({ ...item, status: "validada" })),
    });
    renderDetail();
    await screen.findByText("Demanda #7");
    expect(
      screen.queryByRole("button", { name: /enviar para validação/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar demanda/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar item notebook/i })).not.toBeInTheDocument();
  });

  it("exibe justificativa da última devolução", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.getByText(/Motivo da devolução/i)).toBeInTheDocument();
    expect(screen.getByText(/Ajustar especificações técnicas\./i)).toBeInTheDocument();
    expect(screen.getByText(/Registrado por Carlos Admin/i)).toBeInTheDocument();
  });

  it("não exibe justificativa para item não devolvido", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.getByText("Mouse USB")).toBeInTheDocument();
    const cellMouse = screen.getByText("Mouse USB").closest("td");
    expect(cellMouse.textContent).not.toContain("Motivo da devolução");
  });

  it("exibe ações de edição e reenvio para item devolvido", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /editar item impressora laser/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar item impressora laser/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar item mouse usb/i })).not.toBeInTheDocument();
  });

  it("não exibe edição ou reenvio quando a demanda está encerrada", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaDevolvida,
      status: "concluida",
    });

    renderDetail();

    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar demanda/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /editar item/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reenviar item/i })).not.toBeInTheDocument();
  });

  it("exibe o número do DFD vinculado ao item consolidado", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaDevolvida,
      status: "concluida",
      itens: [{
        ...demandaDevolvida.itens[1],
        status: "vinculada_dfd",
        dfd: { id: 31, numero: "DFD-2027-0042" },
      }],
    });

    renderDetail();

    expect(await screen.findByText("DFD-2027-0042")).toBeInTheDocument();
    expect(screen.getByLabelText("DFD DFD-2027-0042")).toBeInTheDocument();
    expect(screen.getByText("Vinculada ao DFD")).toBeInTheDocument();
  });

  it("exibe histórico explícito fornecido pela API", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaDevolvida,
      historico: [{
        id: 50,
        acao_display: "Correção recebida",
        comentario: "Item ajustado pelo solicitante.",
        criado_em: "2026-08-15T14:30:00Z",
        usuario_nome: "Ana Silva",
      }],
    });

    renderDetail();

    expect(await screen.findByText("Correção recebida")).toBeInTheDocument();
    expect(screen.getByText("Item ajustado pelo solicitante.")).toBeInTheDocument();
    expect(screen.getByText(/Responsável: Ana Silva/i)).toBeInTheDocument();
  });

  it("chama reenviarItem e recarrega a demanda após sucesso", async () => {
    api.getDemanda
      .mockResolvedValueOnce(demandaDevolvida)
      .mockResolvedValueOnce({
        ...demandaDevolvida,
        itens: [
          { ...demandaDevolvida.itens[0], status: "aguardando_validacao" },
          demandaDevolvida.itens[1],
        ],
      });
    api.reenviarItem.mockResolvedValue({
      detail: "Item reenviado para validação com sucesso.",
    });

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();

    const btnReenviar = screen.getByRole("button", { name: /reenviar/i });
    await userEvent.click(btnReenviar);

    expect(api.reenviarItem).toHaveBeenCalledWith(10);
    expect(
      await screen.findByText(/item reenviado para validação com sucesso/i)
    ).toBeInTheDocument();
    expect(api.getDemanda).toHaveBeenCalledTimes(2);
  });

  it("exibe mensagem de erro 400 ao falhar reenvio de item", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockRejectedValue(new ApiError("O valor estimado unitário deve ser maior que zero.", 400));

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));
    expect(
      await screen.findByText(/o valor estimado unitário deve ser maior que zero/i)
    ).toBeInTheDocument();
  });

  it("exibe mensagem de erro 403 para usuário sem permissão ao reenviar", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockRejectedValue(new ApiError("Você não tem permissão para reenviar este item.", 403));

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));
    expect(
      await screen.findByText(/você não tem permissão para reenviar este item/i)
    ).toBeInTheDocument();
  });

  it("exibe mensagem de erro 409 quando a solicitação está encerrada", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockRejectedValue(new ApiError("Não é permitido alterar solicitações encerradas ou canceladas.", 409));

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));
    expect(
      await screen.findByText(/não é permitido alterar solicitações encerradas ou canceladas/i)
    ).toBeInTheDocument();
  });

  it("desabilita botão de reenvio durante a requisição pendente", async () => {
    let resolveReenviar;
    const reenviarPromise = new Promise((resolve) => {
      resolveReenviar = resolve;
    });
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockReturnValue(reenviarPromise);

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();

    const btnReenviar = screen.getByRole("button", { name: /reenviar/i });
    await userEvent.click(btnReenviar);

    expect(btnReenviar).toBeDisabled();
    expect(btnReenviar).toHaveTextContent("Reenviando...");
    expect(api.reenviarItem).toHaveBeenCalledTimes(1);

    await userEvent.click(btnReenviar);
    expect(api.reenviarItem).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      resolveReenviar({ detail: "Sucesso" });
    });
  });
  it("usa ultima_devolucao como fonte principal do parecer", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaDevolvida,
      itens: [
        {
          ...demandaDevolvida.itens[0],
          justificativa_devolucao: "Texto antigo de compatibilidade.",
          ultima_devolucao: {
            id: 99,
            comentario: "Parecer novo selecionado por data e id.",
            responsavel: { id: 5, nome: "Carlos Admin" },
          },
        },
      ],
    });

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.getByText(/parecer novo selecionado por data e id/i)).toBeInTheDocument();
    expect(screen.queryByText(/texto antigo de compatibilidade/i)).not.toBeInTheDocument();
  });

  it("item devolvido sem parecer nao exibe banner nem erro", async () => {
    api.getDemanda.mockResolvedValue({
      ...demandaDevolvida,
      itens: [
        {
          ...demandaDevolvida.itens[0],
          justificativa_devolucao: "",
          ultima_devolucao: null,
        },
      ],
    });

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    expect(screen.queryByText(/motivo da devolu/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("exibe erro geral 404 no reenvio sem mostrar sucesso", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockRejectedValue(new ApiError("Item nao encontrado.", 404));

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));

    expect(await screen.findByText(/item nao encontrado/i)).toBeInTheDocument();
    expect(screen.queryByText(/reenviado para valida/i)).not.toBeInTheDocument();
  });

  it("falha de rede no reenvio nao mostra sucesso", async () => {
    api.getDemanda.mockResolvedValue(demandaDevolvida);
    api.reenviarItem.mockRejectedValue(new ApiError("Falha de rede", 0));

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));

    expect(await screen.findByText(/falha de rede/i)).toBeInTheDocument();
    expect(screen.queryByText(/item reenviado para valida/i)).not.toBeInTheDocument();
  });

  it("sucesso no reenvio atualiza item e status macro da demanda apos recarregar", async () => {
    api.getDemanda
      .mockResolvedValueOnce(demandaDevolvida)
      .mockResolvedValueOnce({
        ...demandaDevolvida,
        status: "aguardando_validacao",
        itens: [
          { ...demandaDevolvida.itens[0], status: "aguardando_validacao" },
          demandaDevolvida.itens[1],
        ],
      });
    api.reenviarItem.mockResolvedValue({
      detail: "Item reenviado para validação com sucesso.",
      item: { id: 10, status: "aguardando_validacao" },
      demanda: { id: 7, status: "aguardando_validacao" },
    });

    renderDetail();
    expect(await screen.findByText("Demanda #7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));

    expect(await screen.findByText(/item reenviado para valida/i)).toBeInTheDocument();
    await waitFor(() => expect(api.getDemanda).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText(/aguardando valida/i).length).toBeGreaterThanOrEqual(2);
  });
});

