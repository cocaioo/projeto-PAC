# Sistema de Gestão do PAC UFPI

O **Sistema de Gestão do PAC UFPI** é uma plataforma web para planejamento, cadastro descentralizado por unidades, validação por grupos de contratação, consolidação e emissão de Documentos de Formalização de Demanda (DFD) no Plano Anual de Contratações da Universidade Federal do Piauí. O projeto adota arquitetura conteinerizada em três camadas com **Django REST Framework** (Python 3.12 / Gunicorn), **React SPA** (Vite / Bootstrap 5), **PostgreSQL 16** e **Nginx** como reverse proxy e servidor estático, com isolamento completo de escopo RBAC e automações via Docker Compose.

---

## 🚀 Guia Rápido de Build e Execução (Docker Compose)

### Pré-requisitos
* Docker Engine 24+ e Docker Compose v2+

### 1. Clonar e Acessar o Projeto
```bash
git clone <url-do-repositorio>
cd projeto-pac
```

### 2. Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```
> Edite o arquivo `.env` ajustando as variáveis principais para o ambiente:
> * `DJANGO_SECRET_KEY`: Chave secreta de produção (`python3 -c "import secrets; print(secrets.token_urlsafe(50))"`).
> * `DJANGO_DEBUG`: `False` para produção.
> * `DJANGO_ALLOWED_HOSTS`: Hosts/IPs permitidos (ex: `localhost,127.0.0.1,pac.ufpi.br,200.17.x.x`).
> * `DJANGO_CSRF_TRUSTED_ORIGINS`: Origens confiáveis (ex: `http://localhost,https://pac.ufpi.br`).
> * `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`: Credenciais do banco.

### 3. Fazer o Build e Subir a Aplicação
```bash
docker compose up -d --build
```
> O Docker executará o build multi-estágio do frontend (Node -> Nginx Alpine), construirá a imagem do backend (Python 3.12 Alpine), aguardará o banco de dados, aplicará as migrações automaticamente (`migrate --noinput`) e coletará os arquivos estáticos (`collectstatic`).

### 4. Criar Superusuário Inicial (Admin Master)
```bash
docker compose exec -it backend python manage.py bootstrap_admin_master
```
O comando solicita apenas o usuário e e-mail no terminal. A senha temporária padrão gerada será **`PacBootstrap!2026`** (caso não tenha configurado a variável de ambiente). Essa conta será criada como **Admin Master** e exigirá a troca da senha no primeiro acesso; enquanto a troca não ocorrer, a API bloqueará os demais recursos.

Para uma execução automatizada no servidor, injete os valores por um secret manager apenas durante o comando e use:

```bash
docker compose exec -T \
  -e PAC_BOOTSTRAP_ADMIN_USERNAME \
  -e PAC_BOOTSTRAP_ADMIN_EMAIL \
  -e PAC_BOOTSTRAP_ADMIN_PASSWORD \
  backend python manage.py bootstrap_admin_master --no-input
```

O bootstrap é idempotente: se já existir um Admin Master ou superusuário, nenhuma senha ou dado será alterado. Não grave essas variáveis no repositório, no Dockerfile ou em um `.env` versionado.

### 5. Acessar os Serviços
* **Aplicação Web (SPA React via Nginx):** `http://localhost` (ou porta configurada em `PORT`)
* **API REST:** `http://localhost/api/`
* **Django Admin:** `http://localhost/admin/`
* **pgAdmin 4 (Gerenciamento do BD):** `http://localhost:5050` (`admin@pac.ufpi.br` / `admin_pac`)

---

## 🛠️ Comandos Úteis de Operação

```bash
# Visualizar status dos contêineres e healthchecks
docker compose ps

# Acompanhar logs em tempo real
docker compose logs -f

# Logs específicos de um serviço
docker compose logs -f backend
docker compose logs -f frontend

# Reiniciar serviços
docker compose restart

# Parar serviços mantendo os dados persistidos no volume
docker compose down

# Executar migrações manualmente (se necessário)
docker compose exec backend python manage.py migrate

# Rodar suíte de testes do backend
docker compose exec backend python manage.py test apps
```

---

## 🧪 Ambiente de Desenvolvimento Local (Sem Docker)

```bash
# 1. Back-end (Terminal 1)
cd backend
python -m venv venv
venv\Scripts\activate       # No Linux/macOS: source venv/bin/activate
pip install -r ../requirements.txt
python manage.py migrate
python manage.py bootstrap_admin_master
python manage.py runserver 8000

# 2. Front-end (Terminal 2)
cd frontend
npm install
npm run dev

# 3. Execução de Testes
# Backend:
python backend/manage.py test apps
# Frontend:
cd frontend && npm test
```

---

## 🧹 Apagar o Admin Master (Para revalidação)

Caso precise revalidar e criar o Admin Master novamente, você pode apagar apenas os usuários do tipo dmin_master sem limpar o banco inteiro. Na pasta ackend/:

**No Banco Principal (PostgreSQL)**:
* **PowerShell**: python manage.py shell -c "from apps.usuarios.models import Usuario; Usuario.objects.filter(perfil='admin_master').delete()"
* **Git Bash / macOS / Linux**: python manage.py shell -c 'from apps.usuarios.models import Usuario; Usuario.objects.filter(perfil="admin_master").delete()'

**No Banco E2E (e2e.sqlite3)**:
* **PowerShell**: python -c "import sqlite3; conn = sqlite3.connect('e2e.sqlite3'); conn.execute('DELETE FROM usuarios_usuario WHERE perfil=''admin_master'''); conn.commit()"
* **Git Bash / macOS / Linux**: python -c 'import sqlite3; conn = sqlite3.connect("e2e.sqlite3"); conn.execute("DELETE FROM usuarios_usuario WHERE perfil=\"admin_master\""); conn.commit()'

---

## 👥 Autoria e Desenvolvimento

* **Autor:** Caio Victor Nascimento ([@cocaioo](https://github.com/cocaioo))
* **Instituição:** Universidade Federal do Piauí (UFPI)
