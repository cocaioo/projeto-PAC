import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, ApiError } from "./client";

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
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("GET");
    expect(opts.credentials).toBe("include");
  });

  it("envia o cabeçalho CSRF em requisições POST", async () => {
    global.fetch = mockFetch(201, { id: 2 });
    await api.post("/demandas/", { ano_referencia: 2027 });
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.method).toBe("POST");
    expect(opts.headers["X-CSRFToken"]).toBe("tok123");
    expect(JSON.parse(opts.body)).toEqual({ ano_referencia: 2027 });
  });

  it("lança ApiError com a mensagem detail em caso de erro", async () => {
    global.fetch = mockFetch(400, { detail: "Falha X" }, false);
    await expect(api.get("/x/")).rejects.toMatchObject({
      message: "Falha X",
      status: 400,
    });
  });

  it("retorna null em respostas 204", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    const data = await api.logout();
    expect(data).toBeNull();
  });

  it("login envia usuário e senha", async () => {
    global.fetch = mockFetch(200, { username: "ana" });
    await api.login("ana", "senha");
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/auth/login/");
    expect(JSON.parse(opts.body)).toEqual({ username: "ana", password: "senha" });
  });

  it("ApiError é exportado", () => {
    expect(new ApiError("x", 500)).toBeInstanceOf(Error);
  });
});
