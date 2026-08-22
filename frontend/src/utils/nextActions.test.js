import { describe, expect, it } from "vitest";
import { getDemandNextAction, getItemNextAction, hasReturnedItems } from "./nextActions";

describe("nextActions", () => {
  it("prioriza correção quando a demanda tem item devolvido", () => {
    const demand = {
      id: 23,
      status: "em_andamento",
      itens: [{ id: 1, status: "devolvida" }],
    };

    expect(hasReturnedItems(demand)).toBe(true);
    expect(getDemandNextAction(demand)).toMatchObject({
      label: "Corrigir itens devolvidos",
      route: "/demandas/23",
      actionType: "required",
    });
  });

  it("mapeia estados de demanda para ações compreensíveis", () => {
    expect(getDemandNextAction({ id: 7, status: "rascunho" })).toMatchObject({
      label: "Editar rascunho",
      route: "/demandas/7",
    });
    expect(getDemandNextAction({ id: 7, status: "aguardando_validacao" })).toMatchObject({
      label: "Aguardar validação",
      disabled: true,
    });
    expect(getDemandNextAction({ id: 7, status: "vinculada_dfd" })).toMatchObject({
      label: "Ver DFD",
    });
  });

  it("mapeia estados de item para ações no contexto da demanda", () => {
    expect(getItemNextAction({ id: 9, status: "devolvida" }, { id: 7 })).toMatchObject({
      label: "Corrigir item",
      route: "/demandas/7/itens/9/editar",
      actionType: "required",
    });
    expect(getItemNextAction({ id: 9, status: "validada" }, { id: 7 })).toMatchObject({
      label: "Acompanhar DFD",
      route: "/demandas/7",
    });
  });
});
