// Cliente HTTP único da SPA. A autenticação usa a sessão do Django e CSRF.

const BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/u, "");

const DEFAULT_MESSAGES = {
  400: "Revise os dados informados.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "O conteúdo solicitado não foi encontrado.",
  409: "A operação não pode ser concluída no estado atual.",
  500: "Ocorreu um erro interno. Tente novamente em instantes.",
};

const TECHNICAL_DETAIL = /(traceback|stack\s*trace|exception|file\s+".+",\s+line|\bat\s+\w+[.(])/iu;
const META_ERROR_KEYS = new Set(["detail", "message", "code", "stack", "traceback"]);

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

function toMessages(value) {
  if (Array.isArray(value)) return value.flatMap(toMessages);
  if (typeof value === "string" || typeof value === "number") return [String(value)];
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
  const candidate = data && (data.detail || data.message);
  if (typeof candidate !== "string" || TECHNICAL_DETAIL.test(candidate)) return "";
  return candidate.trim();
}

export function parseApiError(status, data) {
  const fieldErrors = extractFieldErrors(data);
  const detail = safeServerMessage(data);
  let message = DEFAULT_MESSAGES[status] || "Não foi possível concluir a solicitação.";

  if (status < 500 && status !== 401 && status !== 403 && detail) {
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
  try {
    data = await response.json();
  } catch {
    data = null;
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
  addItem: (demandaId, body) => request(`/demandas/${demandaId}/itens/`, { method: "POST", body }),
  getItem: (id) => request(`/itens/${id}/`),
  updateItem: (id, body) => request(`/itens/${id}/`, { method: "PATCH", body }),
  reenviarItem: (id) => request(`/itens/${id}/reenviar/`, { method: "POST" }),
  enviarDemanda: (id) => request(`/demandas/${id}/enviar/`, { method: "POST" }),

  listCatalogo: (query, options) => request("/catalogo/", { query, ...options }),
  listGrupos: (query) => request("/grupos/", { query }),
  listUnidades: (query) => request("/unidades/", { query }),

  listPendentes: (query) => request("/validacoes/pendentes/", { query }),
  decidirValidacao: (body) => request("/validacoes/decidir/", { method: "POST", body }),

  listDfds: (query) => request("/dfds/", { query }),
  getDfd: (id) => request(`/dfds/${id}/`),
  itensDisponiveis: (query) => request("/dfds/disponiveis/", { query }),
  consolidarDfd: (body) => request("/dfds/consolidar/", { method: "POST", body }),

  dashboardStats: () => request("/dashboard/stats/"),
};
