# Sistema de Gestão do PAC UFPI

Plataforma web para cadastrar, validar, consolidar e acompanhar as demandas do Plano Anual de Contratações da UFPI. O projeto usa Django e Django REST Framework no back-end, React com Vite no front-end, Bootstrap para interface, PostgreSQL/SQLite para persistência e Docker para execução em contêineres.

## Executando com Docker e Docker Compose (Recomendado)

Pré-requisitos: Docker e Docker Compose instalados.

1. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

2. Suba o banco de dados PostgreSQL e a aplicação com o build do React:
```bash
docker compose up --build -d
```

O script de entrada (`entrypoint.sh`) aguarda o PostgreSQL estar pronto e aplica as migrações automaticamente.

3. Acesse a aplicação:
* **Aplicação Web:** `http://localhost:8000`
* **API REST:** `http://localhost:8000/api/`
* **Django Admin:** `http://localhost:8000/admin/`

4. Para criar um superusuário dentro do contêiner:
```bash
docker compose exec app python manage.py createsuperuser
```

5. Para parar os contêineres:
```bash
docker compose down
```

---

## Como instalar e rodar localmente (Sem Docker)

Pré-requisitos: Python 3.11+, Node.js 20+, npm e Git.

1. Clone o repositório e entre na pasta do projeto:

```bash
git clone <url-do-repositorio>
cd PAC-UFPI-Final
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
cd pac
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

Por padrão, o front-end roda em `http://localhost:5173` e a API em `http://localhost:8000`.

7. Se quiser validar tudo, rode os testes:

```bash
cd pac
python manage.py test

cd ../frontend
npm test
```

## Como usar o projeto

Depois de iniciar os servidores ou contêineres, acesse o sistema, faça login e use os módulos principais para cadastrar demandas, revisar itens do catálogo, validar ou devolver solicitações e acompanhar os indicadores no dashboard.

## Dados de homologação

O comando `seed_homologacao` prepara uma massa determinística e fictícia com 17 unidades, 5 grupos, 41 itens de catálogo, 41 demandas em oito cenários, históricos de validação e 5 DFDs. Ele nunca possui senha padrão e só grava quando todas estas proteções são atendidas:

- `PAC_ENVIRONMENT` é explicitamente `development` ou `homologation`;
- `ALLOW_HOMOLOGACAO_SEED=True` habilita o opt-in naquele processo;
- `--apply` autoriza a escrita;
- `--confirm-target` corresponde ao fingerprint sanitizado mostrado por `--check`;
- bancos remotos também precisam estar na allowlist `HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS`.

Exemplo local em PowerShell (substitua `<fingerprint>` e defina uma senha temporária no próprio terminal):

```powershell
cd pac
$env:PAC_ENVIRONMENT = "development"
$env:ALLOW_HOMOLOGACAO_SEED = "True"
$env:HOMOLOGACAO_TEST_PASSWORD = "<senha-temporaria>"
python manage.py migrate
python manage.py seed_homologacao --check
python manage.py seed_homologacao --apply --confirm-target <fingerprint>
```

O modo `--check` não abre conexão nem grava no banco e não exibe host, nome, usuário, URI ou senha. A reexecução reconcilia somente os registros reservados do seed, mantendo identidades e contagens sem duplicação descontrolada. Nunca habilite o comando em produção, não grave a senha no repositório e remova as variáveis temporárias do terminal ao terminar. O passo a passo completo está em [docs/roteiro_homologacao.md](docs/roteiro_homologacao.md).

## Como contribuir

1. Faça um fork do projeto.
2. Crie uma branch para sua alteração.
3. Implemente a mudança e valide localmente.
4. Abra uma pull request explicando o que foi alterado.

Se a contribuição for grande, vale abrir uma issue antes para alinhar o escopo.

## Estrutura de pastas

- `pac/`: back-end Django, apps, rotas e configuração principal.
- `frontend/`: SPA em React com testes e configuração do Vite.
- `docs/`: documentação do projeto e dos fluxos.
- `templates/`: templates HTML do Django.
- `static/`: arquivos estáticos servidos pela aplicação.
- `Dockerfile`: imagem de produção multi-stage para back-end e front-end.
- `docker-compose.yml`: orquestração de contêineres para banco de dados e aplicação.
- `requirements.txt`: dependências Python do projeto.
- `ruff.toml`: configuração de lint do Python.
