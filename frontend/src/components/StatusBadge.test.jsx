import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("sempre apresenta texto e ícone acessível", () => {
    render(<StatusBadge status="validada" />);
    expect(screen.getByLabelText("Status: Validada")).toHaveTextContent("Validada");
    expect(document.querySelector(".bi-check-circle")).toBeInTheDocument();
  });

  it("não exibe conteúdo de um status desconhecido", () => {
    render(<StatusBadge status={'<img src=x onerror="alert(1)">'} />);
    expect(screen.getByText("Status desconhecido")).toBeInTheDocument();
    expect(document.querySelector("img")).not.toBeInTheDocument();
  });
});
