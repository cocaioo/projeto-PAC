// Cliente HTTP da API REST do PAC UFPI.
// Usa sessão do Django (cookies) + token CSRF em requisições que alteram estado.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request(path, { method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };

  if (method !== "GET" && method !== "HEAD") {
    const csrf = getCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (resp.status === 204) return null;

  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = null;
  }

  if (!resp.ok) {
    const message =
      (data && (data.detail || data.message)) ||
      (data && typeof data === "object" ? Object.values(data).flat().join(" ") : null) ||
      "Erro na requisição.";
    throw new ApiError(message, resp.status, data);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),

  // ---- Autenticação ----
  csrf: () => request("/auth/csrf/"),
  login: (username, password) =>
    request("/auth/login/", { method: "POST", body: { username, password } }),
  logout: () => request("/auth/logout/", { method: "POST" }),
  me: () => request("/auth/me/"),

  // ---- Recursos ----
  listDemandas: () => request("/demandas/"),
  getDemanda: (id) => request(`/demandas/${id}/`),
  createDemanda: (body) => request("/demandas/", { method: "POST", body }),
  updateDemanda: (id, body) => request(`/demandas/${id}/`, { method: "PUT", body }),
  addItem: (demandaId, body) =>
    request(`/demandas/${demandaId}/itens/`, { method: "POST", body }),
  getItem: (id) => request(`/itens/${id}/`),
  updateItem: (id, body) => request(`/itens/${id}/`, { method: "PATCH", body }),
  reenviarItem: (id) => request(`/itens/${id}/reenviar/`, { method: "POST" }),
  enviarDemanda: (id) => request(`/demandas/${id}/enviar/`, { method: "POST" }),

  listCatalogo: () => request("/catalogo/"),
  listGrupos: () => request("/grupos/"),
  listUnidades: () => request("/unidades/"),

  listPendentes: () => request("/validacoes/pendentes/"),
  decidirValidacao: (body) =>
    request("/validacoes/decidir/", { method: "POST", body }),

  listDfds: () => request("/dfds/"),
  getDfd: (id) => request(`/dfds/${id}/`),
  itensDisponiveis: () => request("/dfds/disponiveis/"),
  consolidarDfd: (body) => request("/dfds/consolidar/", { method: "POST", body }),

  dashboardStats: () => request("/dashboard/stats/"),
};
