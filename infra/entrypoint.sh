#!/bin/sh
set -e

# =============================================================================
# PAC UFPI — Script de entrada do contêiner de Back-end
# 1. Aguarda a disponibilidade do banco de dados (se configurado)
# 2. Executa as migrações automáticas do Django
# 3. Coleta os arquivos estáticos do Django/Admin
# 4. Inicia o comando principal (Gunicorn por padrão)
# =============================================================================

# Verifica conexão com o banco de dados remoto
python - <<'EOF'
import os
import sys
import time
import socket
from urllib.parse import urlparse

database_url = os.getenv("DATABASE_URL", "")
if database_url:
    parsed = urlparse(database_url)
    scheme = parsed.scheme.split("+")[0]
    if scheme in ("postgres", "postgresql", "mysql"):
        host = parsed.hostname or "localhost"
        port = parsed.port or (5432 if "postgres" in scheme else 3306)
        timeout = int(os.getenv("DATABASE_WAIT_TIMEOUT", "30"))
        start = time.time()
        print(f"[entrypoint] Aguardando banco de dados em {host}:{port}...", flush=True)
        while True:
            try:
                with socket.create_connection((host, port), timeout=2):
                    print(f"[entrypoint] Banco de dados acessível em {host}:{port}.", flush=True)
                    break
            except (OSError, socket.error):
                if time.time() - start > timeout:
                    print(f"[entrypoint] Timeout ({timeout}s) aguardando banco em {host}:{port}.", file=sys.stderr, flush=True)
                    sys.exit(1)
                time.sleep(1)
EOF

echo "[entrypoint] Aplicando migrações do banco de dados..."
python manage.py migrate --noinput

echo "[entrypoint] Coletando arquivos estáticos do Django..."
python manage.py collectstatic --noinput --clear

echo "[entrypoint] Inicializando processo da aplicação..."
exec "$@"
