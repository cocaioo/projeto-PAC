// Cliente HTTP único da SPA. A autenticação usa a sessão do Django e CSRF.

const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/u, "");

const DEFAULT_MESSAGES = {
  400: "Revise os dados informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "O conteúdo solicitado não foi encontrado.",
  409: "A operação não pode ser concluída no estado atual.",
  500: "Ocorreu um erro interno. Tente novamente em instantes.",
  502: "O servidor nao respondeu. Tente novamente em instantes.",
  503: "O servidor nao respondeu. Tente novamente em instantes.",
  504: "O servidor nao respondeu. Tente novamente em instantes.",
};

const TECHNICAL_DETAIL = /(traceback|stack\s*trace|exception|file\s+".+",\s+line|\bat\s+\w+[.(])/iu;
const META_ERROR_KEYS = new Set(["detail", "message", "error", "non_field_errors", "code", "stack", "traceback"]);

export class ApiError extends Error {
  constructor(message, status = 0, data = null, options = {}) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.code = options.code || (status ? `HTTP_${status}` : "NETWORK_ERROR");
    this.fieldErrors = options.fieldErrors || {};
    this.isNetworkError = status === 0;
  }
}

function getCookie(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = document.cookie.match(new RegExp(`(^|;\\s*)${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function cleanMessageString(str) {
  if (typeof str !== "string") return "";
  let s = str.trim();
  if (/^\[\s*['"].*['"]\s*\]$/s.test(s)) {
    s = s.slice(1, -1).trim();
    if ((s.startsWith("'") && s.endsWith("'")) || (s.startsWith('"') && s.endsWith('"'))) {
      s = s.slice(1, -1).trim();
    }
  }
  return s;
}

function toMessages(value) {
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (typeof value === "string" || typeof value === "number") return [cleanMessageString(String(value))].filter(Boolean);
  if (value && typeof value === "object") return Object.values(value).flatMap(toMessages);
  return [];
}

export function extractFieldErrors(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  return Object.fromEntries(
    Object.entries(data)
      .filter(([field]) => !META_ERROR_KEYS.has(field))
      .map(([field, value]) => [field, toMessages(value)])
      .filter(([, messages]) => messages.length > 0)
  );
}

function safeServerMessage(data) {
  if (typeof data === "string") {
    const cleaned = cleanMessageString(data);
    if (!cleaned || /<\/?[a-z][^>]*>/iu.test(cleaned) || TECHNICAL_DETAIL.test(cleaned)) return "";
    return cleaned;
  }
  if (!data || typeof data !== "object") return "";
  let candidate = data.detail || data.message || data.error;
  if (!candidate && Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
    candidate = data.non_field_errors[0];
  }
  if (typeof candidate !== "string") return "";
  const cleaned = cleanMessageString(candidate);
  if (TECHNICAL_DETAIL.test(cleaned)) return "";
  return cleaned;
}

export function parseApiError(status, data) {
  const fieldErrors = extractFieldErrors(data);
  const detail = safeServerMessage(data);
  let message = DEFAULT_MESSAGES[status] || "Não foi possível concluir a solicitação.";

  if (status < 500 && status !== 403 && detail) {
    message = detail;
  } else if (status === 400 && Object.keys(fieldErrors).length > 0) {
    message = DEFAULT_MESSAGES[400];
  }

  return new ApiError(message, status, data, {
    code: typeof data?.code === "string" ? data.code : undefined,
    fieldErrors,
  });
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((entry) => search.append(key, entry));
    else search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

function resolveUrl(path, query) {
  const suffix = buildQuery(query);
  if (/^https?:\/\//iu.test(path)) return `${path}${suffix}`;
  return `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}${suffix}`;
}

export async function request(
  path,
  { method = "GET", body, query, signal, headers: customHeaders = {} } = {}
) {
  const headers = { Accept: "application/json", ...customHeaders };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (method !== "GET" && method !== "HEAD") {
    const csrf = getCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  let response;
  try {
    response = await fetch(resolveUrl(path, query), {
      method,
      headers,
      credentials: "include",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (cause) {
    if (cause?.name === "AbortError") {
      throw new ApiError("A requisição foi cancelada.", 0, null, {
        cause,
        code: "REQUEST_ABORTED",
      });
    }
    throw new ApiError("Não foi possível conectar ao servidor. Verifique sua conexão.", 0, null, { cause });
  }

  if (response.status === 204) return null;

  let data = null;
  let responseText = "";
  try {
    responseText = await response.text();
    data = responseText ? JSON.parse(responseText) : null;
  } catch {
    data = responseText;
  }

  if (!response.ok) throw parseApiError(response.status, data);
  return data;
}

export const api = {
  get: (path, options) => request(path, options),
  post: (path, body, options) => request(path, { ...options, method: "POST", body }),
  put: (path, body, options) => request(path, { ...options, method: "PUT", body }),
  patch: (path, body, options) => request(path, { ...options, method: "PATCH", body }),
  del: (path, options) => request(path, { ...options, method: "DELETE" }),

  csrf: () => request("/auth/csrf/"),
  login: (username, password) => request("/auth/login/", { method: "POST", body: { username, password } }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/auth/me/"),

  listDemandas: (query) => request("/demandas/", { query }),
  getDemanda: (id) => request(`/demandas/${id}/`),
  createDemanda: (body) => request("/demandas/", { method: "POST", body }),
  updateDemanda: (id, body) => request(`/demandas/${id}/`, { method: "PUT", body }),
  deleteDemanda: (id) => request(`/demandas/${id}/`, { method: "DELETE" }),
  addItem: (demandaId, body) => request(`/demandas/${demandaId}/itens/`, { method: "POST", body }),
  getItem: (id) => request(`/itens/${id}/`),
  updateItem: (id, body) => request(`/itens/${id}/`, { method: "PATCH", body }),
  reenviarItem: (id) => request(`/itens/${id}/reenviar/`, { method: "POST" }),
  enviarDemanda: (id) => request(`/demandas/${id}/enviar/`, { method: "POST" }),

  listCatalogo: (query, options) => request("/catalogo/", { query, ...options }),
  createCatalogoItem: (body) => request("/catalogo/", { method: "POST", body }),
  updateCatalogoItem: (id, body) => request(`/catalogo/${id}/`, { method: "PATCH", body }),
  ativarCatalogoItem: (id) => request(`/catalogo/${id}/ativar/`, { method: "POST" }),
  desativarCatalogoItem: (id) => request(`/catalogo/${id}/desativar/`, { method: "POST" }),
  listGrupos: (query) => request("/grupos/", { query }),
  listUnidades: (query) => request("/unidades/", { query }),

  listPendentes: (query) => request("/validacoes/pendentes/", { query }),
  decidirValidacao: (body) => request("/validacoes/decidir/", { method: "POST", body }),

  listDfds: (query) => request("/dfds/", { query }),
  getDfd: (id) => request(`/dfds/${id}/`),
  listConsolidationCycles: (options) => request("/consolidacoes/ciclos/", options),
  listEligibleConsolidationItems: (query, options) => request(
    "/consolidacoes/itens-elegiveis/",
    { query, ...options }
  ),
  consolidarDfd: (body) => request("/dfds/consolidar/", { method: "POST", body }),

  solicitarAcesso: (body) => request("/auth/solicitar-acesso/", { method: "POST", body }),
  listSolicitacoes: (query) => request("/admin/solicitacoes/", { query }),
  aprovarSolicitacao: (id) => request(`/admin/solicitacoes/${id}/aprovar/`, { method: "POST" }),
  rejeitarSolicitacao: (id, body) => request(`/admin/solicitacoes/${id}/rejeitar/`, { method: "POST", body }),
  listUsuariosAdmin: (query) => request("/admin/usuarios/", { query }),
  createUsuarioAdmin: (body) => request("/admin/usuarios/", { method: "POST", body }),
  updateUsuarioStatus: (id, body) => request(`/admin/usuarios/${id}/status/`, { method: "PATCH", body }),
  deleteUsuarioAdmin: (id) => request(`/admin/usuarios/${id}/`, { method: "DELETE" }),

  dashboardStats: () => request("/dashboard/stats/"),
};
