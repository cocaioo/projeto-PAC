import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const port = Number(process.env.PAC_LIGHTHOUSE_PORT || 4173);
const distDir = resolve(process.cwd(), "dist");
const indexPath = join(distDir, "index.html");

if (!existsSync(indexPath)) {
  throw new Error("Build ausente. Execute `npm run build` antes do Lighthouse.");
}

const demanda = {
  id: 1,
  unidade_sigla: "STI",
  usuario_nome: "Joara Solicitante",
  ano_referencia: 2027,
  status: "aguardando_validacao",
  valor_total: "10000.00",
  criado_em: "2026-08-15T12:00:00Z",
  atualizado_em: "2026-08-15T13:00:00Z",
  itens: [{
    id: 1,
    demanda: 1,
    nome: "Notebook institucional",
    descricao: "Equipamento homologado",
    unidade_medida: "unidade",
    quantidade: 2,
    valor_estimado: "5000.00",
    valor_total: "10000.00",
    prioridade: "media",
    status: "validada",
    item_catalogo: 1,
    dfd: null,
  }],
};

const pendente = {
  ...demanda.itens[0],
  status: "aguardando_validacao",
  demanda_id: 1,
  grupo_id: 1,
  grupo_nome: "Tecnologia da Informação",
  demanda_dados: {
    id: 1,
    ano_referencia: 2027,
    status: "aguardando_validacao",
    observacao: "Renovação do parque",
    unidade: { id: 1, nome: "Superintendência de TI", sigla: "STI" },
    usuario: { id: 2, nome: "Joara Solicitante", username: "joara" },
  },
};

function json(response, body, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

function apiResponse(pathname) {
  if (pathname === "/api/auth/me/") {
    return { id: 1, username: "admin_lighthouse", perfil: "admin_master", is_staff: false, unidade: 1 };
  }
  if (pathname === "/api/dashboard/stats/") {
    return {
      total_demandas: 24, total_itens: 86, aguardando_validacao: 9,
      validados: 48, consolidados: 18, total_dfds: 7,
      valor_total_estimado: "850000.00",
      itens_por_status: { rascunho: 11, aguardando_validacao: 9, validada: 48, vinculada_dfd: 18 },
    };
  }
  if (pathname === "/api/demandas/") return { count: 1, next: null, previous: null, results: [demanda] };
  if (pathname === "/api/demandas/1/") return demanda;
  if (pathname === "/api/catalogo/") {
    return { count: 1, next: null, previous: null, results: [{
      id: 1, tipo: "material", nome: "Notebook institucional",
      descricao: "Equipamento homologado", codigo_catmat_catser: "CAT-001",
      grupo: 1, grupo_nome: "Tecnologia da Informação", unidade_medida: "unidade",
      valor_estimado: "5000.00", ativo: true,
    }] };
  }
  if (pathname === "/api/unidades/") {
    return { results: [{ id: 1, nome: "Superintendência de TI", sigla: "STI", ativo: true }] };
  }
  if (pathname === "/api/grupos/") {
    return { results: [{ id: 1, nome: "Tecnologia da Informação", ativo: true }] };
  }
  if (pathname === "/api/validacoes/pendentes/") return [pendente];
  if (pathname === "/api/consolidacoes/ciclos/") return [{ id: 1, ano: 2027, ativo: true, total_itens_elegiveis: 1 }];
  if (pathname === "/api/consolidacoes/itens-elegiveis/") return [{
    ciclo_pac: { id: 1, ano: 2027 },
    grupo_contratacao: { id: 1, nome: "Tecnologia da Informação" },
    item_catalogo: { id: 1, nome: "Notebook institucional", unidade_medida: "unidade" },
    quantidade_total: 2,
    valor_total_estimado: "10000.00",
    total_solicitacoes: 1,
    item_ids: [1],
    detalhamento_por_unidade: [{
      unidade: { id: 1, nome: "Superintendência de TI", sigla: "STI" },
      quantidade_total: 2,
      total_solicitacoes: 1,
      solicitacoes: [{ item_id: 1, demanda_id: 1, solicitante: { id: 2, nome: "Joara Solicitante" }, quantidade: 2, valor_total: "10000.00" }],
    }],
  }];
  return null;
}

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    const body = apiResponse(url.pathname);
    return body === null
      ? json(response, { detail: "Endpoint não simulado para o Lighthouse." }, 404)
      : json(response, body);
  }

  const relativePath = normalize(decodeURIComponent(url.pathname)).replace(/^[/\\]+/u, "");
  const assetPath = resolve(distDir, relativePath);
  const insideDist = assetPath === distDir || assetPath.startsWith(`${distDir}${sep}`);
  if (insideDist && existsSync(assetPath) && statSync(assetPath).isFile()) {
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(assetPath)] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    });
    createReadStream(assetPath).pipe(response);
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(readFileSync(indexPath));
}).listen(port, "127.0.0.1", () => {
  process.stdout.write(`PAC Lighthouse server ready at http://127.0.0.1:${port}\n`);
});
