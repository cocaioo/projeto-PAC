# Credenciais de Teste e Homologação — PAC UFPI

Este documento reúne todas as contas e credenciais pré-configuradas para execução local, testes automatizados e demonstração do sistema PAC.

---

## 1. 🧪 Usuários dos Testes Automatizados E2E (Playwright) / Uso Local Rápido

Utilizados nos testes de ponta a ponta (E2E) e para desenvolvimento local ágil com banco rápido:

* **Arquivos de Referência:**
  * Configuração e Fixtures: [`frontend/e2e/fixtures/pac.js`](frontend/e2e/fixtures/pac.js)
  * Script de Criação no Banco: [`frontend/e2e/support/seed_e2e.py`](frontend/e2e/support/seed_e2e.py)
* **Senha Padrão:** `Pac-E2E-Only-2026!` *(ou configurada via variável de ambiente `PAC_E2E_PASSWORD`)*

| Usuário | Senha | Perfil | Unidade | Finalidade / Escopo |
| :--- | :--- | :--- | :--- | :--- |
| `usuario_e2e` | `Pac-E2E-Only-2026!` | `usuario` (Solicitante) | STI | Criação, edição, rascunhos e reenvio de demandas |
| `admin_e2e` | `Pac-E2E-Only-2026!` | `admin` (Validador) | STI | Validação, devolução e consolidação de DFD do grupo TIC |
| `admin_outro_e2e` | `Pac-E2E-Only-2026!` | `admin` (Outro Grupo) | Almoxarifado | Testes de isolamento e validação de bloqueio de escopo |
| `admin_master_e2e` | `Pac-E2E-Only-2026!` | `admin_master` | STI | Gestão global e visão administrativa completa de todos os grupos |

### Como popular a massa E2E no banco local:
```bash
cd frontend
python e2e/support/seed_e2e.py
```

---

## 2. 🏛️ Usuários da Massa Completa de Homologação / Demonstração

Massa de dados rica e determinística contendo 41 demandas, itens em todos os estágios do fluxo, históricos de devolução e DFDs gerados para validar todos os cenários operacionais:

* **Arquivos de Referência:**
  * Definição da Massa: [`backend/apps/core/seed_homologacao_data.py`](backend/apps/core/seed_homologacao_data.py)
  * Comando Django de Execução: [`backend/apps/core/management/commands/seed_homologacao.py`](backend/apps/core/management/commands/seed_homologacao.py)
  * Roteiro Completo de Homologação: [`docs/roteiro_homologacao.md`](docs/roteiro_homologacao.md)
* **Senha:** Definida dinamicamente no terminal ao executar o comando de seed (via variável `$env:HOMOLOGACAO_TEST_PASSWORD`).

| Usuário | Perfil | Unidade de Origem | Finalidade / Cenário Operacional |
| :--- | :--- | :--- | :--- |
| `usuario_teste` | `usuario` | CCN | Solicitante para criar nova demanda do início ao fim |
| `usuario_sem_demanda` | `usuario` | Letras | Visualização de tela em estado vazio (*Empty State*) |
| `usuario_rascunho` | `usuario` | Centro de Tecnologia | Demanda em rascunho com checklist de validação |
| `usuario_aguardando` | `usuario` | Campus Picos | Demanda enviada aguardando análise administrativa |
| `usuario_devolvido` | `usuario` | Coord. Computação | Demanda com item devolvido e parecer do validador |
| `usuario_reenviado` | `usuario` | Coord. Enfermagem | Item corrigido e reenviado pelo solicitante |
| `usuario_validado` | `usuario` | Coord. Administração | Itens validados e prontos para consolidação |
| `usuario_consolidado` | `usuario` | Departamento Física | Demanda finalizada com número do DFD gerado |
| `admin_teste` | `admin` | STI | Administrador do grupo de **TIC** (STI) |
| `admin_outro_grupo` | `admin` | PREUNI | Administrador de **Infraestrutura** (Prefeitura Universitária) |
| `admin_almoxarifado` | `admin` | PRAD | Administrador de **Almoxarifado** (Pró-Reitoria de Administração) |
| `admin_servicos` | `admin` | Biblioteca Central | Administrador de **Serviços Continuados** |
| `admin_permanentes` | `admin` | Centro de Tecnologia | Administrador de **Equipamentos Permanentes** |
| `admin_master_teste` | `admin_master` | STI | Visão e gestão administrativa global de todos os grupos |

### Como popular a massa de homologação no banco local:

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
*(Após a execução, todos os usuários da tabela acima estarão disponíveis com a senha informada).*

---

## 3. 🌐 Acesso ao pgAdmin 4 (Banco de Dados em Docker)

Quando executado via Docker Compose:
* **URL:** `http://localhost:5050`
* **Usuário:** `admin@pac.ufpi.br`
* **Senha:** `admin_pac`
