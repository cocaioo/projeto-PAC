# =============================================================================
# PAC UFPI — Imagem do Back-end (Django / DRF + Gunicorn)
# =============================================================================

FROM python:3.12-alpine AS backend

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Instala dependências Python e remove caches para reduzir superfície de ataque
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip wheel \
    && pip install --no-cache-dir -r requirements.txt \
    && rm -rf /root/.cache /usr/local/lib/python3.12/ensurepip /usr/local/lib/python3.12/site-packages/pip* /usr/local/lib/python3.12/site-packages/wheel* /usr/local/lib/python3.12/site-packages/setuptools*

# Copia a aplicação Django e o script de inicialização
COPY backend/ ./backend/
COPY infra/entrypoint.sh ./backend/entrypoint.sh

WORKDIR /app/backend

# Permissões do script de entrada
RUN chmod +x /app/backend/entrypoint.sh

# Cria usuário sem privilégios e diretórios de execução
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && mkdir -p /app/backend/staticfiles /app/backend/media \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

# Verificação de saúde da API Django
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/auth/csrf/').read()" || exit 1

ENTRYPOINT ["/app/backend/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
