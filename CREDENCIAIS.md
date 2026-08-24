# Credenciais de Teste e HomologaÃ§Ã£o â€” PAC UFPI

Este documento reÃºne todas as contas e credenciais prÃ©-configuradas para execuÃ§Ã£o local, testes automatizados e demonstraÃ§Ã£o do sistema PAC.

---

## 1. ðŸ§ª UsuÃ¡rios dos Testes Automatizados E2E (Playwright) / Uso Local RÃ¡pido

Utilizados nos testes de ponta a ponta (E2E) e para desenvolvimento local Ã¡gil com banco rÃ¡pido:

* **Arquivos de ReferÃªncia:**
  * ConfiguraÃ§Ã£o e Fixtures: [`frontend/e2e/fixtures/pac.js`](frontend/e2e/fixtures/pac.js)
  * Script de CriaÃ§Ã£o no Banco: [`frontend/e2e/support/seed_e2e.py`](frontend/e2e/support/seed_e2e.py)
* **Senha PadrÃ£o:** `Pac-E2E-Only-2026!` *(ou configurada via variÃ¡vel de ambiente `PAC_E2E_PASSWORD`)*

| UsuÃ¡rio | Senha | Perfil | Unidade | Finalidade / Escopo |
| :--- | :--- | :--- | :--- | :--- |
| `usuario_e2e` | `Pac-E2E-Only-2026!` | `usuario` (Solicitante) | STI | CriaÃ§Ã£o, ediÃ§Ã£o, rascunhos e reenvio de demandas |
| `admin_e2e` | `Pac-E2E-Only-2026!` | `admin` (Validador) | STI | ValidaÃ§Ã£o, devoluÃ§Ã£o e consolidaÃ§Ã£o de DFD do grupo TIC |
| `admin_outro_e2e` | `Pac-E2E-Only-2026!` | `admin` (Outro Grupo) | Almoxarifado | Testes de isolamento e validaÃ§Ã£o de bloqueio de escopo |
| `admin_master_e2e` | `Pac-E2E-Only-2026!` | `admin_master` | STI | GestÃ£o global e visÃ£o administrativa completa de todos os grupos |

### Como popular a massa E2E no banco local:
```powershell
cd frontend
$env:PAC_E2E_DATABASE_URL = "postgres://pac_user:pac_password@localhost:5432/pac_e2e"
python e2e/support/seed_e2e.py
```

> Use um banco exclusivo para E2E, como `pac_e2e`. A suÃ­te recusa o banco compartilhado `pac_db` por padrÃ£o para evitar misturar dados E2E e de homologaÃ§Ã£o.

---

## 2. ðŸ›ï¸ UsuÃ¡rios da Massa Completa de HomologaÃ§Ã£o / DemonstraÃ§Ã£o

Massa de dados rica e determinÃ­stica contendo 41 demandas, itens em todos os estÃ¡gios do fluxo, histÃ³ricos de devoluÃ§Ã£o e DFDs gerados para validar todos os cenÃ¡rios operacionais:

* **Arquivos de ReferÃªncia:**
  * DefiniÃ§Ã£o da Massa: [`backend/apps/core/seed_homologacao_data.py`](backend/apps/core/seed_homologacao_data.py)
  * Comando Django de ExecuÃ§Ã£o: [`backend/apps/core/management/commands/seed_homologacao.py`](backend/apps/core/management/commands/seed_homologacao.py)
  * Roteiro Completo de HomologaÃ§Ã£o: [`docs/roteiro_homologacao.md`](docs/roteiro_homologacao.md)
* **Senha:** Definida dinamicamente no terminal ao executar o comando de seed (via variÃ¡vel `$env:HOMOLOGACAO_TEST_PASSWORD`).

| UsuÃ¡rio | Perfil | Unidade de Origem | Finalidade / CenÃ¡rio Operacional |
| :--- | :--- | :--- | :--- |
| `usuario_teste` | `usuario` | CCN | Solicitante para criar nova demanda do inÃ­cio ao fim |
| `usuario_sem_demanda` | `usuario` | Letras | VisualizaÃ§Ã£o de tela em estado vazio (*Empty State*) |
| `usuario_rascunho` | `usuario` | CMPP | Demanda em rascunho com checklist de validaÃ§Ã£o |
| `usuario_aguardando` | `usuario` | Campus Picos | Demanda enviada aguardando anÃ¡lise administrativa |
| `usuario_devolvido` | `usuario` | Coord. ComputaÃ§Ã£o | Demanda com item devolvido e parecer do validador |
| `usuario_reenviado` | `usuario` | Matemática | Item corrigido e reenviado pelo solicitante |
| `usuario_validado` | `usuario` | Coord. AdministraÃ§Ã£o | Itens validados e prontos para consolidaÃ§Ã£o |
| `usuario_consolidado` | `usuario` | Departamento FÃ­sica | Demanda finalizada com nÃºmero do DFD gerado |
| `admin_teste` | `admin` | STI | Administrador do grupo de **TIC** (STI) |
| `admin_outro_grupo` | `admin` | PREUNI | Administrador de **Infraestrutura** (Prefeitura UniversitÃ¡ria) |
| `admin_almoxarifado` | `admin` | PRAD | Administrador de **Almoxarifado** (PrÃ³-Reitoria de AdministraÃ§Ã£o) |
| `admin_servicos` | `admin` | PRAD | Administrador de **ServiÃ§os Continuados** |
| `admin_permanentes` | `admin` | PRAD | Administrador de **Equipamentos Permanentes** |
| `admin_master_teste` | `admin_master` | STI | VisÃ£o e gestÃ£o administrativa global de todos os grupos |

### Como popular a massa de homologaÃ§Ã£o no banco local:

No PowerShell (dentro da pasta `backend/`):
```powershell
$env:PAC_ENVIRONMENT = "development"
$env:ALLOW_HOMOLOGACAO_SEED = "True"
$env:HOMOLOGACAO_TEST_PASSWORD = "SuaSenhaDeTeste123!"
python manage.py seed_homologacao --check
```

Copie o `<fingerprint>` gerado na checagem e aplique:
```powershell
python manage.py seed_homologacao --apply --confirm-target <fingerprint>
```
*(ApÃ³s a execuÃ§Ã£o, todos os usuÃ¡rios da tabela acima estarÃ£o disponÃ­veis com a senha informada).*

---

## 3. ðŸŒ Acesso ao pgAdmin 4 (Banco de Dados em Docker)

Quando executado via Docker Compose:
* **URL:** `http://localhost:5050`
* **UsuÃ¡rio:** `admin@pac.ufpi.br`
* **Senha:** `admin_pac`
