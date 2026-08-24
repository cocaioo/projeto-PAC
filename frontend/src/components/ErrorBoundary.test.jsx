import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

function BrokenComponent() {
  throw new Error("render failure");
}

describe("ErrorBoundary", () => {
  it("mostra uma recuperacao quando um filho falha ao renderizar", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BrokenComponent />
      </ErrorBoundary>
    );

    expect(screen.getByRole("heading", { name: /nao foi possivel carregar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /recarregar aplicacao/i })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
