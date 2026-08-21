import { describe, expect, it } from "vitest";
import { getStatusConfig, STATUS_CONFIG, UNKNOWN_STATUS } from "./statusConfig";

describe("statusConfig", () => {
  it.each([
    ["rascunho", "Rascunho"],
    ["aguardando_validacao", "Aguardando validação"],
    ["devolvida", "Devolvida"],
    ["validada", "Validada"],
    ["consolidada", "Consolidada"],
    ["vinculada_dfd", "Vinculada ao DFD"],
    ["cancelada", "Cancelada"],
  ])("mapeia %s para um rótulo legível", (status, label) => {
    expect(getStatusConfig(status).label).toBe(label);
    expect(getStatusConfig(status).icon).toMatch(/^bi-/);
  });

  it("mantém os estados macro adicionais centralizados", () => {
    expect(STATUS_CONFIG.em_andamento.label).toBe("Em andamento");
    expect(STATUS_CONFIG.concluida.label).toBe("Concluída");
  });

  it("usa fallback seguro para status desconhecido", () => {
    expect(getStatusConfig("<script>alert(1)</script>")).toBe(UNKNOWN_STATUS);
  });
});
