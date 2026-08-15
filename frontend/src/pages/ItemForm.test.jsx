import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithRouter } from "../test-utils";
import ItemForm, { validateItemForm } from "./ItemForm";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: {
    addItem: vi.fn(),
    getItem: vi.fn(),
    updateItem: vi.fn(),
    reenviarItem: vi.fn(),
    listCatalogo: vi.fn(),
    getDemanda: vi.fn(),
  },
}));

async function preencherObrigatorios() {
  await userEvent.type(screen.getByLabelText(/^nome$/i), "Notebook");
  await userEvent.type(screen.getByLabelText(/descrição/i), "Notebook i5");
  await userEvent.type(screen.getByLabelText(/unidade de medida/i), "unidade");
  await userEvent.clear(screen.getByLabelText(/quantidade/i));
  await userEvent.type(screen.getByLabelText(/quantidade/i), "2");
  await userEvent.type(screen.getByLabelText(/valor estimado/i), "1500");
  await userEvent.type(screen.getByLabelText(/data prevista/i), "2027-01-01");
  await userEvent.type(screen.getByLabelText(/indicação orçamentária/i), "Orc 1");
  await userEvent.type(screen.getByLabelText(/justificativa da prioridade/i), "Alta");
  await userEvent.type(screen.getByLabelText(/justificativa da necessidade/i), "Uso");
}

describe("ItemForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getDemanda.mockResolvedValue({ itens: [] });
  });

  it("exige justificativa somente para prioridade alta", () => {
    const validBase = {
      item_catalogo: null,
      nome: "Item",
      descricao: "Descrição",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: 10,
      data_prevista: "2027-01-01",
      indicacao_orcamentaria: "Fonte",
      justificativa_necessidade: "Necessidade",
      justificativa_prioridade: "",
    };
    expect(validateItemForm({ ...validBase, prioridade: "alta" }))
      .toHaveProperty("justificativa_prioridade");
    expect(validateItemForm({ ...validBase, prioridade: "media" }))
      .not.toHaveProperty("justificativa_prioridade");
    expect(validateItemForm({ ...validBase, prioridade: "baixa" }))
      .not.toHaveProperty("justificativa_prioridade");
  });

  it("não envia formulário inválido e associa erro ao input", async () => {
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
    });
    await userEvent.click(screen.getByRole("button", { name: /adicionar item/i }));
    expect(api.addItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^nome$/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/informe o nome do item/i)).toHaveAttribute("role", "alert");
  });

  it("bloqueia item de catálogo duplicado na demanda", async () => {
    api.getDemanda.mockResolvedValue({ itens: [{ id: 20, item_catalogo: 5 }] });
    api.listCatalogo.mockResolvedValue({ results: [{
      id: 5,
      tipo: "material",
      nome: "Notebook institucional",
      descricao: "Configuração homologada",
      unidade_medida: "unidade",
      valor_estimado: "4200.50",
      grupo_nome: "TIC",
    }] });
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
    });
    await waitFor(() => expect(api.getDemanda).toHaveBeenCalledWith("7"));
    await userEvent.click(screen.getByLabelText(/selecionar do catálogo/i));
    await userEvent.type(screen.getByLabelText(/pesquisar item no catálogo/i), "note");
    await userEvent.click(await screen.findByRole("option", { name: /notebook institucional/i }, { timeout: 1500 }));
    expect(screen.getByText(/já foi adicionado à demanda/i)).toBeInTheDocument();
    expect(api.addItem).not.toHaveBeenCalled();
  });

  it("mostra erro estruturado do backend no campo correto", async () => {
    api.addItem.mockRejectedValue({
      message: "Revise os dados informados.",
      fieldErrors: { quantidade: ["Quantidade indisponível para este ciclo."] },
    });
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
    });
    await preencherObrigatorios();
    await userEvent.click(screen.getByRole("button", { name: /adicionar item/i }));
    expect(await screen.findByText(/quantidade indisponível/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/quantidade/i)).toHaveAttribute("aria-describedby", "quantidade-error");
  });

  it("seleciona item do catálogo, preenche dados e calcula o total visual", async () => {
    api.listCatalogo.mockResolvedValue({
      results: [{
        id: 5,
        tipo: "material",
        nome: "Notebook institucional",
        descricao: "Configuração homologada",
        unidade_medida: "unidade",
        valor_estimado: "4200.50",
        grupo_nome: "TIC",
        codigo_catmat_catser: "CATMAT-5",
      }],
    });
    api.addItem.mockResolvedValue({ id: 20 });
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
      extraRoutes: [{ path: "/demandas/:id", element: <p>detalhe demanda</p> }],
    });

    await userEvent.click(screen.getByLabelText(/selecionar do catálogo/i));
    await userEvent.type(screen.getByLabelText(/pesquisar item no catálogo/i), "note");
    await userEvent.click(await screen.findByRole("option", { name: /notebook institucional/i }, { timeout: 1500 }));

    expect(screen.getByLabelText(/^nome$/i)).toHaveValue("Notebook institucional");
    expect(screen.getByLabelText(/valor estimado unitário/i)).toHaveValue(4200.5);
    expect(screen.getByText(/grupo de contratação:/i)).toHaveTextContent("TIC");

    await userEvent.clear(screen.getByLabelText(/quantidade/i));
    await userEvent.type(screen.getByLabelText(/quantidade/i), "2");
    expect(screen.getByText(/8\.401,00/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/data prevista/i), "2027-01-01");
    await userEvent.type(screen.getByLabelText(/indicação orçamentária/i), "Fonte 1000");
    await userEvent.type(screen.getByLabelText(/justificativa da prioridade/i), "Planejamento");
    await userEvent.type(screen.getByLabelText(/justificativa da necessidade/i), "Renovação");
    await userEvent.click(screen.getByRole("button", { name: /adicionar item/i }));

    await waitFor(() => expect(api.addItem).toHaveBeenCalledTimes(1));
    expect(api.addItem.mock.calls[0][1]).toMatchObject({
      item_catalogo: 5,
      nome: "Notebook institucional",
      valor_estimado: "4200.50",
      quantidade: 2,
    });
  });

  it("adiciona item à demanda e navega de volta ao detalhe", async () => {
    api.addItem.mockResolvedValue({ id: 10 });
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
      extraRoutes: [{ path: "/demandas/:id", element: <p>detalhe demanda</p> }],
    });

    await preencherObrigatorios();
    await userEvent.click(
      screen.getByRole("button", { name: /adicionar item/i })
    );

    await waitFor(() => expect(api.addItem).toHaveBeenCalledTimes(1));
    const [demandaId, payload] = api.addItem.mock.calls[0];
    expect(demandaId).toBe("7");
    expect(payload).toMatchObject({ nome: "Notebook", quantidade: 2 });
    expect(await screen.findByText("detalhe demanda")).toBeInTheDocument();
  });

  it("mostra erro quando a API rejeita adição", async () => {
    api.addItem.mockRejectedValue(new Error("Demanda não está em rascunho"));
    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/novo",
      path: "/demandas/:id/itens/novo",
    });
    await preencherObrigatorios();
    await userEvent.click(
      screen.getByRole("button", { name: /adicionar item/i })
    );
    expect(
      await screen.findByText(/não está em rascunho/i)
    ).toBeInTheDocument();
  });

  it("modo de edição carrega item por URL direta e preenche campos com observacoes", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora Laser",
      descricao: "LaserJet Pro",
      unidade_medida: "un",
      quantidade: 3,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Prioridade alta",
      justificativa_necessidade: "Impressões urgentes",
      observacoes: "Marca especificada",
      status: "devolvida",
    });
    api.updateItem.mockResolvedValue({ id: 10 });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
      extraRoutes: [{ path: "/demandas/:id", element: <p>detalhe demanda</p> }],
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    expect(api.getItem).toHaveBeenCalledWith("10");
    expect(screen.getByLabelText(/^nome$/i)).toHaveValue("Impressora Laser");
    expect(screen.getByLabelText(/observações do solicitante/i)).toHaveValue("Marca especificada");

    await userEvent.clear(screen.getByLabelText(/observações do solicitante/i));
    await userEvent.type(screen.getByLabelText(/observações do solicitante/i), "Observação atualizada");

    await userEvent.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(api.updateItem).toHaveBeenCalledTimes(1));
    const [itemId, payload] = api.updateItem.mock.calls[0];
    expect(itemId).toBe("10");
    expect(payload).toMatchObject({
      nome: "Impressora Laser",
      quantidade: 3,
      observacoes: "Observação atualizada",
    });
    expect(payload).not.toHaveProperty("status");
    expect(screen.getByText("Editar item")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar/i })).not.toBeDisabled();
  });

  it("valida que o item pertence à demanda da rota", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 99, // Demanda diferente de 7
      nome: "Item Outra Demanda",
    });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(
      await screen.findByText(/este item não pertence à demanda informada/i)
    ).toBeInTheDocument();
  });
  it("exibe banner somente para item devolvido usando ultima_devolucao", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      justificativa_devolucao: "Fallback antigo",
      ultima_devolucao: {
        id: 50,
        comentario: "Parecer mais recente do admin.",
        criado_em: "2026-08-05T10:00:00Z",
        responsavel: { id: 3, nome: "Carlos Admin" },
      },
    });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText(/parecer mais recente do admin/i)).toBeInTheDocument();
    expect(screen.getByText(/carlos admin/i)).toBeInTheDocument();
    expect(screen.queryByText(/fallback antigo/i)).not.toBeInTheDocument();
  });

  it("item devolvido sem parecer nao quebra a tela", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      ultima_devolucao: null,
    });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    expect(screen.queryByText(/parecer da devolu/i)).not.toBeInTheDocument();
  });

  it("bloqueia reenvio enquanto formulario esta sujo e libera apos PATCH bem-sucedido", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      ultima_devolucao: {
        id: 50,
        comentario: "Corrigir observacoes.",
        criado_em: "2026-08-05T10:00:00Z",
        responsavel: { id: 3, nome: "Carlos Admin" },
      },
    });
    api.updateItem.mockResolvedValue({ id: 10, status: "devolvida" });
    api.reenviarItem.mockResolvedValue({ detail: "Item reenviado para validacao com sucesso." });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    const reenviar = screen.getByRole("button", { name: /reenviar/i });
    expect(reenviar).not.toBeDisabled();

    await userEvent.type(screen.getByLabelText(/observa/i), "Ajustado");
    expect(screen.getByRole("button", { name: /reenviar/i })).toBeDisabled();
    expect(screen.getByText(/salve as altera/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /salvar altera/i }));
    await waitFor(() => expect(api.updateItem).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("button", { name: /reenviar/i })).not.toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));
    await waitFor(() => expect(api.reenviarItem).toHaveBeenCalledWith("10"));
  });

  it("falha no PATCH mantem isDirty e nao permite reenvio", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      ultima_devolucao: null,
    });
    api.updateItem.mockRejectedValue(new Error("Quantidade deve ser maior que zero."));

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText(/quantidade/i));
    await userEvent.type(screen.getByLabelText(/quantidade/i), "0");
    await userEvent.click(screen.getByRole("button", { name: /salvar altera/i }));

    expect(await screen.findByText(/quantidade deve ser maior que zero/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reenviar/i })).toBeDisabled();
    expect(api.reenviarItem).not.toHaveBeenCalled();
  });

  it("usa justificativa_devolucao como fallback temporario quando ultima_devolucao nao existe", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      justificativa_devolucao: "Fallback temporario.",
      ultima_devolucao: null,
    });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText(/fallback temporario/i)).toBeInTheDocument();
  });

  it("nao mostra banner quando item nao esta devolvido mesmo com parecer carregado", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "validada",
      ultima_devolucao: {
        id: 50,
        comentario: "Parecer antigo.",
        criado_em: "2026-08-05T10:00:00Z",
        responsavel: { id: 3, nome: "Carlos Admin" },
      },
    });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    expect(screen.queryByText(/parecer antigo/i)).not.toBeInTheDocument();
  });

  it("POST de reenvio nao envia dados locais do formulario", async () => {
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      ultima_devolucao: null,
    });
    api.reenviarItem.mockResolvedValue({ detail: "Reenviado." });

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /reenviar/i }));
    await waitFor(() => expect(api.reenviarItem).toHaveBeenCalledTimes(1));
    expect(api.reenviarItem).toHaveBeenCalledWith("10");
    expect(api.reenviarItem.mock.calls[0]).toHaveLength(1);
  });

  it("desabilita botoes durante reenvio e duplo clique nao duplica chamada", async () => {
    let resolveReenvio;
    api.getItem.mockResolvedValue({
      id: 10,
      demanda: 7,
      tipo: "material",
      nome: "Impressora",
      descricao: "Laser",
      unidade_medida: "un",
      quantidade: 1,
      valor_estimado: "1200.00",
      data_prevista: "2027-06-01",
      prioridade: "alta",
      indicacao_orcamentaria: "Orc 2027",
      justificativa_prioridade: "Alta",
      justificativa_necessidade: "Uso",
      observacoes: "",
      status: "devolvida",
      ultima_devolucao: null,
    });
    api.reenviarItem.mockReturnValue(new Promise((resolve) => {
      resolveReenvio = resolve;
    }));

    renderWithRouter(<ItemForm />, {
      route: "/demandas/7/itens/10/editar",
      path: "/demandas/:id/itens/:itemId/editar",
    });

    expect(await screen.findByText("Editar item")).toBeInTheDocument();
    const salvar = screen.getByRole("button", { name: /salvar altera/i });
    const reenviar = screen.getByRole("button", { name: /reenviar/i });
    await userEvent.dblClick(reenviar);
    expect(reenviar).toBeDisabled();
    expect(salvar).toBeDisabled();
    expect(api.reenviarItem).toHaveBeenCalledTimes(1);
    resolveReenvio({ detail: "Reenviado." });
  });
});

