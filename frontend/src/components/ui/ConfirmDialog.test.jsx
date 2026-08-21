import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("só confirma a ação depois do clique explícito", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmDialog open title="Enviar demanda?" onConfirm={onConfirm} onClose={vi.fn()}>
        Revise os itens antes de continuar.
      </ConfirmDialog>
    );

    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("permite cancelar e bloqueia ações durante o processamento", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const { rerender } = render(
      <ConfirmDialog open title="Operação crítica" onConfirm={vi.fn()} onClose={onClose} />
    );
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog open title="Operação crítica" loading onConfirm={vi.fn()} onClose={onClose} />
    );
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });
});
