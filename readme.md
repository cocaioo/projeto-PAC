# Sistema de Gestão do PAC UFPI

Plataforma web para cadastrar, validar, consolidar e acompanhar as demandas do Plano Anual de Contratações da UFPI. O projeto adota uma arquitetura conteinerizada em três camadas com **Django REST Framework** no back-end (Gunicorn), **React com Vite** no front-end servido por **Nginx** como reverse proxy, **PostgreSQL** para persistência e **Docker Compose** para orquestração.

---

## Arquitetura de Contêineres (Docker Compose)

```text
Host (Porta 80 / 8000)
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  pac_frontend (Nginx Alpine)                                │
│  ├── Servidor de arquivos estáticos da SPA (React / Vite)   │
│  ├── Roteamento Client-Side (Fallback SPA: index.html)      │
│  └── Reverse Proxy para /api/, /admin/, /static/, /media/   │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Rede Interna: pac_network)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  pac_backend (Django / DRF + Gunicorn — Python 3.12 Alpine) │
│  ├── API REST (/api/) e Autenticação por Sessão             │
│  ├── Migrações automáticas & Entrypoint seguro              │
│  └── Usuário sem privilégios (appuser)                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Rede Interna: pac_network)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  pac_postgres (PostgreSQL 16 Alpine)                        │
│  └── Armazenamento persistente (Volume postgres_data)       │
└─────────────────────────────────────────────────────────────┘
```

---

## Executando com Docker e Docker Compose (Recomendado)

Pré-requisitos: Docker e Docker Compose instalados.

### 1. Configure as variáveis de ambiente

Copie o modelo de variáveis de ambiente:

```bash
cp .env.example .env
```

Ajuste as configurações no `.env` conforme necessário (`DJANGO_SECRET_KEY`, credenciais do PostgreSQL, portas).

### 2. Construa as imagens e inicialize os serviços

Execute o comando padrão a partir da raiz do projeto:

```bash
docker compose up -d --build
```

*(Ou alternativamente: `docker compose -f infra/docker-compose.yml up -d --build`)*

O contêiner `pac_backend` aguardará a inicialização saudável do PostgreSQL (`db`), executará automaticamente as migrações (`migrate --noinput`) e coletará os arquivos estáticos necessários antes de iniciar o servidor Gunicorn. O Nginx no `pac_frontend` subirá e ficará pronto para receber as requisições.

### 3. Acesse a aplicação

* **Aplicação Web (SPA React via Nginx):** `http://localhost` (ou porta configurada em `PORT`, ex: `http://localhost:80`)
* **API REST (via Nginx Proxy):** `http://localhost/api/`
* **Django Admin (via Nginx Proxy):** `http://localhost/admin/`
* **pgAdmin 4 (Gerenciamento do BD):** `http://localhost:5050` (Login: `admin@pac.ufpi.br` / Senha: `admin_pac`)

### 4. Criar superusuário no Django

Para criar um administrador diretamente no contêiner do backend:

```bash
docker compose exec backend python manage.py createsuperuser
```

### 5. Executar migrações ou comandos manuais

```bash
# Executar migrações
docker compose exec backend python manage.py migrate

# Carregar dados de homologação (em ambiente de teste/desenvolvimento)
docker compose exec backend python manage.py seed_homologacao --check
```

### 6. Visualizar logs e status dos contêineres

```bash
# Verificar status e healthchecks
docker compose ps

# Visualizar logs em tempo real
docker compose logs -f

# Logs específicos do backend ou frontend
docker compose logs -f backend
docker compose logs -f frontend
```

### 7. Parar os contêineres

```bash
# Parar os serviços mantendo os dados persistidos
docker compose down

# Parar e remover volumes de dados (CUIDADO: apaga dados do PostgreSQL)
docker compose down -v
```

---

## Como instalar e rodar localmente (Sem Docker)

Pré-requisitos: Python 3.11+, Node.js 20+, npm, Git e PostgreSQL.

1. Clone o repositório e entre na pasta do projeto:

```bash
git clone <url-do-repositorio>
cd projeto-pac
```

2. Crie e ative o ambiente virtual:

```bash
python -m venv venv
venv\Scripts\activate
```

3. Instale as dependências do back-end:

```bash
pip install -r requirements.txt
```

4. Copie o arquivo de ambiente e ajuste os valores, se necessário:

```bash
copy .env.example .env
```

5. Aplique as migrações e suba a API:

```bash
cd backend
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

6. Em outro terminal, suba o front-end:

```bash
cd frontend
npm install
npm run dev
```

Por padrão no modo desenvolvimento local, o front-end roda em `http://localhost:5173` e a API em `http://localhost:8000`.

7. Execução dos testes automatizados:

```bash
# Testes do backend (Django)
cd backend
python manage.py test apps

# Testes do frontend (Vitest)
cd ../frontend
npm test
```

---

## Dados de Homologação (Seed)

O comando `seed_homologacao` prepara uma massa determinística e fictícia com 17 unidades, 5 grupos, 41 itens de catálogo, 41 demandas em oito cenários, históricos de validação e 5 DFDs. Ele nunca possui senha padrão e só grava quando todas estas proteções são atendidas:

- `PAC_ENVIRONMENT` é explicitamente `development` ou `homologation`;
- `ALLOW_HOMOLOGACAO_SEED=True` habilita o opt-in naquele processo;
- `--apply` autoriza a escrita;
- `--confirm-target` corresponde ao fingerprint sanitizado mostrado por `--check`;
- bancos remotos também precisam estar na allowlist `HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS`.

Exemplo local em PowerShell (substitua `<fingerprint>` e defina uma senha temporária no próprio terminal):

```powershell
cd backend
$env:PAC_ENVIRONMENT = "development"
$env:ALLOW_HOMOLOGACAO_SEED = "True"
$env:HOMOLOGACAO_TEST_PASSWORD = "<senha-temporaria>"
python manage.py migrate
python manage.py seed_homologacao --check
python manage.py seed_homologacao --apply --confirm-target <fingerprint>
```

O modo `--check` não abre conexão nem grava no banco e não exibe host, nome, usuário, URI ou senha. A reexecução reconcilia somente os registros reservados do seed, mantendo identidades e contagens sem duplicação descontrolada. Nunca habilite o comando em produção, não grave a senha no repositório e remova as variáveis temporárias do terminal ao terminar. O passo a passo completo está em [docs/roteiro_homologacao.md](docs/roteiro_homologacao.md).

---

## Estrutura de Pastas

- `backend/`: Código da API Django/DRF, configurações (`config/`), apps de domínio e `Dockerfile` do back-end.
- `frontend/`: SPA em React 18 (Vite, Bootstrap), testes unitários/componentes (Vitest), testes E2E (Playwright) e `Dockerfile` do front-end.
- `infra/`: Configurações de infraestrutura (Nginx `default.conf`, scripts de `entrypoint.sh`, pgAdmin e Docker Compose).
- `docker-compose.yml`: Orquestração multi-contêiner principal do projeto.
- `docs/`: Documentação de arquitetura, homologação e requisitos do projeto.
- `requirements.txt`: Dependências Python pinadas para o back-end.

---

## Autoria e Desenvolvimento

- **Autor e Desenvolvedor:** Caio Victor Nascimento ([@cocaioo](https://github.com/cocaioo))
- **Nota de autoria e responsabilidade:** O projeto foi inicialmente planejado para ser realizado em dupla. Contudo, após o desligamento do colaborador Miguel no início do ciclo, **todo o desenvolvimento do sistema (100% do projeto) foi assumido e executado integralmente por Caio Victor**. Isso abrange:
  - **Back-end & Regras de Negócio:** API REST com Django REST Framework, autenticação de sessão, controle de permissões por perfil de acesso (Usuário, Admin e Admin Master), máquina de estados das demandas, validações por item, devoluções com parecer, consolidação e emissão de DFDs.
  - **Front-end & Interface:** SPA em React 18 com Vite e Bootstrap 5, cobrindo catálogo, formulários de demandas com cálculo dinâmico, telas de validação/devolução, reedição e reenvio de itens, módulo de consolidação e dashboard analítico com indicadores.
  - **Banco de Dados & Infraestrutura:** Modelagem relacional em PostgreSQL, conteinerização com Docker e Docker Compose, pgAdmin 4 e rotinas de automação.
  - **Testes, Qualidade & Segurança:** Testes automatizados no Django, testes unitários/componentes no frontend com Vitest, testes ponta a ponta (E2E) com Playwright, proteções contra CSRF e validações estritas de escopo.
  - **Documentação Técnica & Seed de Dados:** Roteiros de homologação com travas de segurança (`seed_homologacao`), especificações didáticas da API e documentação de arquitetura.
