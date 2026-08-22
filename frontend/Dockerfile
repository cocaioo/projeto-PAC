# =============================================================================
# PAC UFPI — Imagem do Front-end (React SPA + Nginx)
# Estágio 1: build dos arquivos estáticos com Node.js e Vite
# Estágio 2: servidor de produção Nginx Alpine servindo os estáticos e proxy
# =============================================================================

# -----------------------------------------------------------------------------
# Estágio 1 — Build do React com Vite
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Cache eficiente de camadas através dos lockfiles
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copia o código-fonte do frontend e executa o build de produção
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Estágio 2 — Servidor Nginx em Produção
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS production

# Configuração customizada do Nginx com fallback de SPA e proxy reverso para a API
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copia os artefatos compilados do estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Verificação de integridade do Nginx
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
