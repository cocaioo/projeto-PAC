import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import { renderWithRouter } from "../test-utils";
import DfdDetail from "./DfdDetail";
import { api } from "../api/client";

vi.mock("../api/client", () => ({
  api: { getDfd: vi.fn() },
}));

describe("DfdDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockDfd = {
    id: 1,
    numero: "DFD-001",
    grupo_nome: "TIC",
    criado_por_nome: "Admin",
    numero_processo: "23111.000123/2026-01",
    total: 4000,
    itens: [
      { id: 5, nome: "Notebook", quantidade: 2, valor_estimado: 1500, valor_total: 3000 },
      { id: 6, nome: "Monitor", quantidade: 1, valor_estimado: 1000, valor_total: 1000 },
    ],
  };

  it("exibe os dados e itens do DFD e os botões de ação", async () => {
    api.getDfd.mockResolvedValue(mockDfd);
    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });
    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();
    expect(screen.getByText("Notebook")).toBeInTheDocument();
    expect(screen.getByText("Monitor")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar número/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /exportar csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /imprimir \/ salvar pdf/i })).toBeInTheDocument();
  });

  it("copia o número do DFD com feedback visual temporário de 2 segundos", async () => {
    api.getDfd.mockResolvedValue(mockDfd);

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });

    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();

    vi.useFakeTimers();
    const copyBtn = screen.getByRole("button", { name: /copiar número/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith("DFD-001");
    expect(screen.getByRole("button", { name: /copiado!/i })).toBeInTheDocument();

    // Avança 2 segundos
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(screen.getByRole("button", { name: /copiar número/i })).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("exporta CSV com colunas e linhas corretas e dispara download", async () => {
    api.getDfd.mockResolvedValue(mockDfd);

    let createdBlob = null;
    const createObjectURLMock = vi.fn((blob) => {
      createdBlob = blob;
      return "blob:http://localhost/mock-csv";
    });
    const revokeObjectURLMock = vi.fn();
    global.URL.createObjectURL = createObjectURLMock;
    global.URL.revokeObjectURL = revokeObjectURLMock;

    const blobSpy = vi.spyOn(global, "Blob");

    let clickedLink = null;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () {
      clickedLink = this;
    });

    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });

    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();

    const exportBtn = screen.getByRole("button", { name: /exportar csv/i });
    fireEvent.click(exportBtn);

    expect(blobSpy).toHaveBeenCalled();
    const [blobParts, blobOptions] = blobSpy.mock.calls[blobSpy.mock.calls.length - 1];
    const csvString = blobParts.join("");

    expect(csvString).toContain("Item,Quantidade,Valor Unitário Estimado,Valor Total");
    expect(csvString).toContain("Notebook,2,1500,3000");
    expect(csvString).toContain("Monitor,1,1000,1000");
    expect(blobOptions).toEqual({ type: "text/csv;charset=utf-8;" });

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(clickedLink).not.toBeNull();
    expect(clickedLink.getAttribute("download")).toBe("dfd-DFD-001.csv");
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:http://localhost/mock-csv");

    clickSpy.mockRestore();
    blobSpy.mockRestore();
  });

  it("chama window.print ao clicar em Imprimir / Salvar PDF", async () => {
    api.getDfd.mockResolvedValue(mockDfd);
    window.print = vi.fn();

    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });

    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();

    const printBtn = screen.getByRole("button", { name: /imprimir \/ salvar pdf/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it("escapa campos de CSV com vírgulas e aspas e lida com itens sem valor unitário explícito", async () => {
    api.getDfd.mockResolvedValue({
      id: 2,
      numero: "DFD-002",
      grupo_nome: "TIC",
      criado_por_nome: "Admin",
      total: 5000,
      itens: [
        { id: 10, nome: 'Cadeira "Ergonômica", Especial', quantidade: 2, valor_total: 5000 },
      ],
    });

    global.URL.createObjectURL = vi.fn(() => "blob:http://localhost/mock-csv-2");
    global.URL.revokeObjectURL = vi.fn();
    const blobSpy = vi.spyOn(global, "Blob");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    renderWithRouter(<DfdDetail />, {
      route: "/dfds/2",
      path: "/dfds/:id",
    });

    expect(await screen.findByText("DFD DFD-002")).toBeInTheDocument();

    const exportBtn = screen.getByRole("button", { name: /exportar csv/i });
    fireEvent.click(exportBtn);

    expect(blobSpy).toHaveBeenCalled();
    const [blobParts] = blobSpy.mock.calls[blobSpy.mock.calls.length - 1];
    const csvString = blobParts.join("");

    expect(csvString).toContain('"Cadeira ""Ergonômica"", Especial",2,2500,5000');

    clickSpy.mockRestore();
    blobSpy.mockRestore();
  });

  it("lida graciosamente com falha ao copiar para o clipboard", async () => {
    api.getDfd.mockResolvedValue(mockDfd);

    const writeTextMock = vi.fn().mockRejectedValue(new Error("Clipboard permission denied"));
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderWithRouter(<DfdDetail />, {
      route: "/dfds/1",
      path: "/dfds/:id",
    });

    expect(await screen.findByText("DFD DFD-001")).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copiar número/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith("DFD-001");
    // Não quebra nem altera para "Copiado!" em caso de rejeição
    expect(screen.getByRole("button", { name: /copiar número/i })).toBeInTheDocument();
  });
});
