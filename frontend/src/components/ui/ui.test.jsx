import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Badge, Button, Card, Modal } from ".";

describe("componentes administrativos base", () => {
  it("renderiza Button e respeita o estado de loading", () => {
    render(<Button loading>Salvar</Button>);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("renderiza Card com título e conteúdo", () => {
    render(<Card title="Resumo">Conteúdo</Card>);
    expect(screen.getByRole("heading", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo")).toBeInTheDocument();
  });

  it("renderiza Badge com texto além da cor", () => {
    render(<Badge variant="success" icon="bi-check">Validada</Badge>);
    expect(screen.getByText("Validada")).toBeVisible();
  });

  it("fecha Modal com Escape", async () => {
    const onClose = vi.fn();
    render(<Modal open title="Confirmar" onClose={onClose}>Mensagem</Modal>);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
  });
});
