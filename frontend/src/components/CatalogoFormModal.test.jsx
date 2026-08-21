import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import CatalogoFormModal, { validateCatalogoItem } from "./CatalogoFormModal";

describe("CatalogoFormModal", () => {
  it("valida os campos obrigatórios e valor positivo", () => {
    expect(validateCatalogoItem({
      nome: "",
      descricao: "",
      grupo: "",
      unidade_medida: "",
      valor_estimado: "0",
    })).toEqual(expect.objectContaining({
      nome: expect.any(String),
      descricao: expect.any(String),
      grupo: expect.any(String),
      unidade_medida: expect.any(String),
      valor_estimado: expect.any(String),
    }));
  });

  it("não envia formulário inválido e associa erros aos campos", async () => {
    const onSubmit = vi.fn();
    render(<CatalogoFormModal open grupos={[]} onClose={vi.fn()} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: /cadastrar item/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^Nome/)).toHaveAttribute("aria-invalid", "true");
  });
});
