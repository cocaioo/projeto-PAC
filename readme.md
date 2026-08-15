# Sistema de Gestão do PAC UFPI

Plataforma web para cadastrar, validar, consolidar e acompanhar as demandas do Plano Anual de Contratações da UFPI. O projeto usa Django e Django REST Framework no back-end, React com Vite no front-end, Bootstrap para interface, SQLite para persistência local e Docker para execução em produção.

## Como instalar e rodar o projeto

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

Depois de iniciar os dois servidores, acesse o front-end, faça login e use os módulos principais para cadastrar demandas, revisar itens do catálogo, validar ou devolver solicitações e acompanhar os indicadores no dashboard. Se quiser, inclua aqui capturas de tela dos fluxos mais importantes.

## Dados de homologação

O comando `seed_homologacao` prepara uma massa determinística com unidades, grupos, itens de catálogo e perfis de usuário, ADMIN e ADMIN_MASTER. A senha não possui valor padrão e deve ser fornecida exclusivamente pela variável de ambiente `HOMOLOGACAO_TEST_PASSWORD`.

```bash
cd pac
python manage.py migrate
python manage.py seed_homologacao
```

O comando pode ser executado novamente para restaurar os registros controlados de demonstração sem duplicá-los. Não grave a senha no repositório, no roteiro ou em capturas de tela; configure-a pelo gerenciador de segredos do ambiente. O passo a passo completo de validação está em [docs/roteiro_homologacao.md](docs/roteiro_homologacao.md).

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
- `Dockerfile`: imagem de produção para back-end e front-end.
- `requirements.txt`: dependências Python do projeto.
- `ruff.toml`: configuração de lint do Python.
