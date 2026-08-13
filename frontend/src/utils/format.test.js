import { describe, it, expect } from "vitest";
import { formatCurrency, statusLabel, statusBadge } from "./format";

describe("format", () => {
  it("formata moeda em BRL", () => {
    const out = formatCurrency(1500);
    expect(out).toContain("1.500,00");
    expect(out).toContain("R$");
  });

  it("trata valores nulos como zero", () => {
    expect(formatCurrency(null)).toContain("0,00");
  });

  it("retorna rótulo legível do status", () => {
    expect(statusLabel("aguardando_validacao")).toBe("Aguardando Validação");
    expect(statusLabel("desconhecido")).toBe("desconhecido");
  });

  it("retorna classe de badge por status", () => {
    expect(statusBadge("validada")).toContain("bg-success");
    expect(statusBadge("qualquer")).toBe("bg-secondary");
  });
});
