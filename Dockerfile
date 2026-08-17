# =============================================================================
# PAC UFPI — Imagem de produção
# Estágio 1: build do front-end React (Vite)
# Estágio 2: Django + Gunicorn + WhiteNoise, servindo o build do React
# =============================================================================

# -----------------------------------------------------------------------------
# Estágio 1 — Build do front-end React
# -----------------------------------------------------------------------------
FROM node:22-slim AS frontend

WORKDIR /frontend

# Instala dependências a partir do lockfile (cache de camadas).
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copia o código e gera o build de produção em /frontend/dist.
COPY frontend/ ./
RUN npm run build

# -----------------------------------------------------------------------------
# Estágio 2 — Aplicação Django
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS app

# Boas práticas para Python em contêiner.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Instala as dependências Python primeiro para aproveitar o cache de camadas.
COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# Copia o código da aplicação.
COPY pac/ ./pac/

# Copia o build do React gerado no estágio anterior para ser servido
# como arquivo estático pelo WhiteNoise.
COPY --from=frontend /frontend/dist ./pac/frontend_build

WORKDIR /app/pac

# Coleta os arquivos estáticos (servidos pelo WhiteNoise).
# SECRET_KEY temporária apenas para o build; substituída em runtime.
RUN SECRET_KEY=build-time-key DEBUG=False python manage.py collectstatic --noinput

# Permissões do script de entrada
RUN chmod +x /app/pac/entrypoint.sh

# Usuário sem privilégios e diretórios de runtime.
RUN useradd --create-home appuser \
    && mkdir -p /app/pac/staticfiles /app/pac/media \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Verificação de saúde do contêiner
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/').read()" || exit 1

ENTRYPOINT ["/app/pac/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
