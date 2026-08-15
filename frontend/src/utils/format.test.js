import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format";

describe("format", () => {
  it("formata moeda em BRL", () => {
    const out = formatCurrency(1500);
    expect(out).toContain("1.500,00");
    expect(out).toContain("R$");
  });

  it("trata valores nulos como zero", () => {
    expect(formatCurrency(null)).toContain("0,00");
  });
});
