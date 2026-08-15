import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError, buildQuery, parseApiError } from "./client";

function mockFetch(status, data, ok = status < 400) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
  });
}

describe("api client", () => {
  beforeEach(() => {
    document.cookie = "csrftoken=tok123";
  });

  it("faz GET e retorna JSON", async () => {
    global.fetch = mockFetch(200, { id: 1 });
    const data = await api.get("/demandas/");
    expect(data).toEqual({ id: 1 });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe("GET");
    expect(options.credentials).toBe("include");
  });

  it("envia o cabeçalho CSRF em requisições POST", async () => {
    global.fetch = mockFetch(201, { id: 2 });
    await api.post("/demandas/", { ano_referencia: 2027 });
    const [, options] = global.fetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.headers["X-CSRFToken"]).toBe("tok123");
    expect(JSON.parse(options.body)).toEqual({ ano_referencia: 2027 });
  });

  it("usa detail seguro em erro 400 sem campos", async () => {
    global.fetch = mockFetch(400, { detail: "Falha X" }, false);
    await expect(api.get("/x/")).rejects.toMatchObject({
      message: "Falha X",
      status: 400,
    });
  });

  it("retorna null em respostas 204", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    expect(await api.logout()).toBeNull();
  });

  it("login envia usuário e senha", async () => {
    global.fetch = mockFetch(200, { username: "ana" });
    await api.login("ana", "senha");
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/auth/login/");
    expect(JSON.parse(options.body)).toEqual({ username: "ana", password: "senha" });
  });

  it("exporta ApiError", () => {
    expect(new ApiError("x", 500)).toBeInstanceOf(Error);
  });

  it("preserva erros por campo sem misturá-los à mensagem", () => {
    const error = parseApiError(400, {
      nome: ["Campo obrigatório."],
      quantidade: ["Deve ser maior que zero."],
    });
    expect(error.message).toBe("Revise os dados informados.");
    expect(error.fieldErrors.nome).toEqual(["Campo obrigatório."]);
  });

  it("não expõe stacktrace em erros internos", () => {
    const error = parseApiError(500, {
      detail: 'Traceback: File "views.py", line 1',
      stack: "segredo técnico",
    });
    expect(error.message).not.toMatch(/traceback|views\.py|segredo/i);
  });

  it("normaliza falha de rede", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(api.get("/x/")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
      isNetworkError: true,
    });
  });

  it("serializa filtros ignorando valores vazios", () => {
    expect(buildQuery({ q: "mouse sem fio", grupo: 2, ativo: "" }))
      .toBe("?q=mouse+sem+fio&grupo=2");
  });

  it("cria item do catálogo pelo endpoint administrativo", async () => {
    global.fetch = mockFetch(201, { id: 10 });
    const payload = { nome: "Mouse", grupo: 2 };

    await api.createCatalogoItem(payload);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/catalogo/");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual(payload);
  });

  it("edita item do catálogo com atualização parcial", async () => {
    global.fetch = mockFetch(200, { id: 10, nome: "Mouse sem fio" });

    await api.updateCatalogoItem(10, { nome: "Mouse sem fio" });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/catalogo/10/");
    expect(options.method).toBe("PATCH");
    expect(JSON.parse(options.body)).toEqual({ nome: "Mouse sem fio" });
  });

  it.each([
    ["ativarCatalogoItem", "ativar"],
    ["desativarCatalogoItem", "desativar"],
  ])("executa a ação administrativa %s", async (method, action) => {
    global.fetch = mockFetch(200, { id: 10 });

    await api[method](10);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain(`/catalogo/10/${action}/`);
    expect(options.method).toBe("POST");
  });
});
