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

  it("substitui o detalhe interno de um erro 403 por mensagem pública", () => {
    const error = parseApiError(403, {
      detail: "Regra interna: grupo 42 não corresponde à unidade do operador.",
    });

    expect(error.message).toBe("Você não tem permissão para realizar esta ação.");
    expect(error.message).not.toMatch(/grupo 42|unidade do operador/i);
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

  it("não persiste nem registra credenciais ou tokens durante o login", async () => {
    localStorage.clear();
    sessionStorage.clear();
    const storageSetItem = vi.spyOn(Storage.prototype, "setItem");
    const consoleSpies = ["log", "info", "warn", "error", "debug"].map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {})
    );
    global.fetch = mockFetch(200, { username: "ana", perfil: "usuario" });

    try {
      await api.login("ana", "senha-super-secreta");

      const [, options] = global.fetch.mock.calls[0];
      expect(options.credentials).toBe("include");
      expect(options.headers.Authorization).toBeUndefined();
      expect(storageSetItem).not.toHaveBeenCalled();
      expect(localStorage).toHaveLength(0);
      expect(sessionStorage).toHaveLength(0);
      consoleSpies.forEach((spy) => expect(spy).not.toHaveBeenCalled());
    } finally {
      storageSetItem.mockRestore();
      consoleSpies.forEach((spy) => spy.mockRestore());
    }
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

  it("exclui demanda pelo endpoint DELETE", async () => {
    global.fetch = mockFetch(204, null);

    const result = await api.deleteDemanda(7);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toContain("/demandas/7/");
    expect(options.method).toBe("DELETE");
    expect(result).toBeNull();
  });

  it("extrai mensagem do campo 'error' e limpa formatação de ValidationError do Django", () => {
    const error = parseApiError(400, {
      error: "['Já existe um usuário com este e-mail.']",
    });
    expect(error.message).toBe("Já existe um usuário com este e-mail.");
    expect(error.fieldErrors).toEqual({});
  });

  it("extrai mensagem de non_field_errors", () => {
    const error = parseApiError(400, {
      non_field_errors: ["As credenciais informadas não são válidas."],
    });
    expect(error.message).toBe("As credenciais informadas não são válidas.");
    expect(error.fieldErrors).toEqual({});
  });

  it("preserva mensagem específica em erro 401 de login", () => {
    const error = parseApiError(401, {
      detail: "Credenciais inválidas.",
    });
    expect(error.message).toBe("Credenciais inválidas.");
  });

  it("utiliza mensagem padrão de sessão expirada em 401 sem detalhe", () => {
    const error = parseApiError(401, {});
    expect(error.message).toBe("Sua sessão expirou. Entre novamente.");
  });

  it("executa métodos de API para gestão de contas e solicitação de acesso", async () => {
    global.fetch = mockFetch(201, { message: "ok" });

    await api.solicitarAcesso({ email: "teste@ufpi.edu.br" });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/auth/solicitar-acesso/"),
      expect.objectContaining({ method: "POST" })
    );

    global.fetch = mockFetch(200, []);
    await api.listSolicitacoes({ status: "pendente" });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/solicitacoes/?status=pendente"),
      expect.objectContaining({ method: "GET" })
    );

    global.fetch = mockFetch(200, { message: "ok" });
    await api.aprovarSolicitacao(5);
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/solicitacoes/5/aprovar/"),
      expect.objectContaining({ method: "POST" })
    );

    await api.rejeitarSolicitacao(5, { motivo_rejeicao: "Motivo" });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/solicitacoes/5/rejeitar/"),
      expect.objectContaining({ method: "POST" })
    );

    await api.listUsuariosAdmin({ perfil: "admin" });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/usuarios/?perfil=admin"),
      expect.objectContaining({ method: "GET" })
    );

    await api.createUsuarioAdmin({ email: "novo@ufpi.edu.br" });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/usuarios/"),
      expect.objectContaining({ method: "POST" })
    );

    await api.updateUsuarioStatus(12, { is_active: false });
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/usuarios/12/status/"),
      expect.objectContaining({ method: "PATCH" })
    );

    global.fetch = mockFetch(200, { message: "Usuário excluído com sucesso." });
    await api.deleteUsuarioAdmin(12);
    expect(global.fetch).toHaveBeenLastCalledWith(
      expect.stringContaining("/admin/usuarios/12/"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});

