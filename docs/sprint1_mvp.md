# Sprint MVP PAC UFPI

**Período:** 03/08/2026 a 23/08/2026  
**Objetivo:** disponibilizar uma versão do PAC para a Joara validar o fluxo
principal de cadastro, validação, devolução, consolidação e DFD.

## Regra de atualização

- `[ ]` Não iniciado
- `[~]` Em andamento
- `[x]` Concluído
- `[!]` Bloqueado
- Cada pessoa deve atualizar este arquivo ao finalizar uma sessão de trabalho.
- Não iniciar itens opcionais enquanto houver tarefa essencial pendente.

---

# Fluxo que precisa funcionar

- [~] ADMIN cadastra item no catálogo (Backend OK, UI React parcial)
- [x] USUÁRIO cria uma demanda
- [~] USUÁRIO adiciona itens do catálogo (Backend OK, autocompletar em UI React pendente)
- [x] USUÁRIO salva a demanda como rascunho
- [x] USUÁRIO envia a demanda
- [x] ADMIN visualiza os itens pendentes
- [x] ADMIN valida ou devolve cada item
- [x] USUÁRIO visualiza o motivo da devolução
- [x] USUÁRIO corrige e reenvia o item
- [x] ADMIN consolida os itens validados
- [x] ADMIN vincula os itens a um DFD
- [x] USUÁRIO visualiza o número do DFD

---

# Caio

## Semana 1 — Fundação

- [x] **P0 — Padronizar os status**
  - [x] Unificar enums e constantes
  - [x] Definir transições permitidas
  - [x] Aplicar transições na API
  - [x] Mantido enums minúsculos (sem necessidade de migração extra)
  - [x] Atualizar o frontend (compatibilidade preservada, 54 testes OK)

- [x] **P0 — Corrigir permissões por perfil**
  - [x] Criar permission class para ADMIN (IsAdminUserPermission)
  - [x] Criar permission class para ADMIN MASTER (IsAdminMasterUserPermission)
  - [x] Encapsular permissões em properties do modelo Usuario (is_admin_user / is_admin_master_user)
  - [x] Proteger endpoints da API
  - [x] Testar acesso com perfil (testes positivos e negativos OK)

- [x] **P0 — Corrigir fluxo de validação**
  - [x] Corrigir bug `item` versus `item_demanda` (views legadas + API)
  - [x] Verificar validação individual
  - [x] Exigir comentário na devolução
  - [x] Garantir registro na tabela `Validacao`

## Semana 2 — Fluxos principais

- [x] **P0 — Implementar reedição de item devolvido**
  - [x] Liberar edição somente para item devolvido
  - [x] Exibir comentário do ADMIN
  - [x] Implementar reenvio individual
  - [x] Retornar status para `AGUARDANDO_VALIDACAO`
  - [x] Preservar histórico das decisões

- [x] **P0 — Completar consolidação**
  - [x] Filtrar somente itens validados e sem DFD
  - [x] Agrupar por item do catálogo
  - [x] Somar quantidades
  - [x] Mostrar quantidade por unidade
  - [x] Criar/vincular DFD
  - [x] Atualizar status dos itens
  - [x] Exibir DFD na consulta do usuário

## Semana 3 — Integração e deploy

- [ ] **P0 — Preparar ambiente de homologação**
  - [ ] Configurar variáveis de ambiente
  - [ ] Retirar segredos do código
  - [ ] Configurar `DEBUG=False`
  - [ ] Configurar `ALLOWED_HOSTS`
  - [ ] Configurar CSRF e CORS
  - [ ] Configurar arquivos estáticos
  - [ ] Realizar deploy
  - [ ] Criar usuários de teste

- [ ] **P0 — Testar fluxo completo**
  - [ ] Usuário cria e envia demanda
  - [ ] ADMIN devolve um item
  - [ ] Usuário corrige e reenvia
  - [ ] ADMIN valida
  - [ ] ADMIN consolida
  - [ ] Usuário visualiza o DFD

---

# Miguel

## Semana 1 — Catálogo e formulário

- [x] **P0 — Registrar modelos no Django Admin**
  - [x] Unidade
  - [x] GrupoContratacao
  - [x] ItemCatalogo
  - [x] Validacao
  - [x] DFD
  - [x] LogAuditoria

- [x] **P0 — Criar API do catálogo**
  - [x] Serializer
  - [x] ViewSet
  - [x] Rotas
  - [x] Pesquisa por nome/código
  - [x] Filtro por grupo
  - [x] Permissões
  - [x] Ativar/desativar item

- [~] **P0 — Criar telas do catálogo**
  - [x] Listagem básica
  - [ ] Pesquisa
  - [ ] Cadastro
  - [ ] Edição
  - [ ] Ativação/desativação
  - [ ] Mensagens de sucesso e erro

- [ ] **P0 — Integrar catálogo ao formulário da demanda**
  - [ ] Buscar itens pela API
  - [ ] Selecionar item do catálogo
  - [ ] Autopreencher preço
  - [x] Calcular valor total no backend
  - [ ] Bloquear duplicidade
  - [ ] Exigir justificativa de prioridade apenas quando alta

## Semana 2 — Validação e interface

- [x] **P0 — Melhorar tela de validações**
  - [x] Listar itens pendentes
  - [x] Filtrar por unidade
  - [x] Filtrar por grupo
  - [x] Exibir detalhes do item
  - [x] Adicionar ação de validar
  - [x] Adicionar ação de devolver
  - [x] Exibir mensagens de erro

- [~] **P0 — Interface do item devolvido**
  - [x] Exibir badge `DEVOLVIDO`
  - [x] Mostrar comentário do ADMIN
  - [x] Reabilitar botão de edição
  - [x] Mostrar botão de reenvio
  - [~] Exibir histórico básico (parcial: última devolução exibida; histórico completo ainda não implementado)

- [x] **P1 — Interface da consolidação**
  - [x] Tabela de itens agrupados
  - [x] Quantidade total
  - [x] Detalhamento por unidade
  - [x] Seleção de itens
  - [x] Formulário do número do DFD
  - [x] Feedback de consolidação concluída

## Semana 3 — Acabamento

- [x] **P1 — Melhorar dashboard**
  - [x] Total de demandas
  - [x] Total de itens
  - [x] Valor total
  - [x] Itens por status
  - [x] Total de DFDs
  - [x] Percentual validado
  - [x] Percentual consolidado

- [ ] **P1 — Revisar frontend**
  - [ ] Estados de carregamento
  - [ ] Estados vazios
  - [ ] Mensagens de erro
  - [ ] Confirmações antes de ações críticas
  - [ ] Padronização de badges
  - [ ] Responsividade básica
  - [ ] Verificar erros no console

- [ ] **P1 — Preparar dados de demonstração**
  - [ ] Unidades
  - [ ] Grupos de contratação
  - [ ] Itens de catálogo
  - [ ] Usuário comum
  - [ ] ADMIN
  - [ ] ADMIN MASTER

---

# Tarefas compartilhadas

- [ ] Revisar mudanças antes de integrar
- [ ] Não enviar arquivos `.env`
- [ ] Não alterar diretamente o banco de produção
- [ ] Testar backend e frontend após integração
- [ ] Atualizar este arquivo diariamente
- [ ] Registrar problemas conhecidos
- [ ] Preparar roteiro para a Joara

---

# Opcionais — apenas se todos os P0 estiverem prontos

- [ ] **P1 — Auditoria mínima**
- [ ] **P1 — Testes automatizados das regras principais**
- [ ] **P2 — Exportação simples em Excel**
- [ ] **P2 — Notificação de devolução por e-mail**
- [ ] **P2 — Calendário básico do PAC**
- [ ] **P2 — Tooltips configuráveis**

---

# Problemas encontrados

Registrar neste formato:

## Problema

**Data:**  
**Encontrado por:**  
**Descrição:**  
**Impacto:**  
**Responsável:**  
**Solução ou decisão:**  

---

# Diário rápido

## 03/08/2026

### Caio

- Feito:
  - Correção do Bug B1 (`item_demanda` nas views de validação).
  - Reutilização direta do enum `StatusDemanda` em `constants.py` e implementação da máquina de estados genérica `pode_transicionar_status`.
  - Encapsulamento de permissões por perfil no modelo `Usuario` (`is_admin_user` / `is_admin_master_user`) e criação das Permission Classes DRF (`IsAdminUserPermission` / `IsAdminMasterUserPermission`).
  - Proteção dos ViewSets (`ValidacaoViewSet`, `DFDViewSet`, etc.) com permissões por perfil e validação de transição de status.
  - Testes automatizados backend (21/21 OK, incluindo testes negativos) e frontend Vitest (54/54 OK).
  - 4 commits independentes realizados.
- Em andamento: Tarefas da Semana 1 concluídas.
- Bloqueio: Nenhum.

### Miguel

- Feito:
- Em andamento:
- Bloqueio:

## 05/08/2026

### Caio

- Feito:
  - Reedição e reenvio de item devolvido implementados na API e no frontend.
  - Política de acesso por item aplicada: proprietário, ADMIN do grupo, ADMIN de outro grupo, ADMIN MASTER e item manual.
  - `PATCH` de correção criado com campos permitidos/protegidos/desconhecidos, bloqueio de campos herdados em item catalogado e recálculo de `valor_total`.
  - `PUT` de item bloqueado globalmente.
  - Reenvio individual com transação, locks na ordem demanda → item, rollback em falha de sincronização macro e preservação dos registros de `Validacao`.
  - Parecer de devolução usando `ultima_devolucao` como fonte principal e `justificativa_devolucao` apenas como fallback temporário.
  - Testes backend e frontend adicionados para política de acesso, serializer, serviço, rollback, queries e interface.
  - Commit validado: `543e1b983fdf7794b94704c6823a99ad231214c6`.
- Validação:
  - Backend específico: 22 testes OK.
  - Backend completo: 80 testes OK.
  - Frontend específico: 28 testes OK.
  - Frontend completo: 77 testes OK.
  - Build, lint, `check`, `makemigrations --check --dry-run` e `git diff --check` OK.
  - Queries medidas: detail 1 item = 5; detail 10 itens = 5; list pequeno = 6; list maior = 6.
- Em andamento:
  - Histórico visual completo de devoluções ainda não foi implementado; a interface exibe a última devolução.
- Bloqueio:
  - Semântica concorrente e validação de locks por linha com `select_for_update` devem ser confirmadas no PostgreSQL com suporte a row locks.
  - Fluxos legados/server-side de validação, consolidação e reenvio ainda têm pontos com ordem item → demanda e precisam de cobertura própria antes de refatoração ampla.

### Miguel

- Feito:
  - Modelos da Semana 1 registrados no Django Admin: Unidade, GrupoContratacao, ItemCatalogo, Validacao, DFD e LogAuditoria.
  - API do catálogo completada com listagem, criação, edição, exclusão, busca por nome/código, filtro por grupo, filtro por ativo para ADMIN e ações de ativar/desativar.
  - Permissões da API do catálogo: leitura autenticada apenas de itens ativos para usuário comum; escrita e consulta de inativos restritas a ADMIN/ADMIN MASTER.
  - Testes básicos adicionados para registro no Admin e contrato da API de catálogo.
- Em andamento:
  - Tela de catálogo: listagem básica pronta; pesquisa, cadastro, edição, ativação/desativação e mensagens completas ainda pendentes.
  - Integração do catálogo ao formulário de demanda: ainda pendente; o formulário segue criando item manual.
- Bloqueio:
  - Nenhum.

---

# Critério de entrega

O MVP estará pronto quando o fluxo abaixo funcionar no ambiente publicado:

- [~] Cadastro de catálogo (Backend OK, UI React parcial)
- [x] Criação da demanda
- [~] Inclusão de itens (Item manual OK, autocompletar do catálogo no frontend em andamento)
- [x] Salvamento como rascunho
- [x] Envio para validação
- [x] Validação individual
- [x] Devolução com justificativa
- [x] Correção e reenvio
- [x] Consolidação
- [x] Vinculação de DFD
- [x] Visualização do DFD pelo solicitante
