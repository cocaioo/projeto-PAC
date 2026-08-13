// Setup global dos testes (Vitest + Testing Library).
import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Limpa o DOM e os mocks após cada teste, garantindo isolamento.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
