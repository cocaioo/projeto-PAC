# Auditoria tecnica revisada do Projeto PAC

## Escopo e metodo

Esta versao foi revisada contra o codigo atual, os testes existentes e tres investigacoes independentes por sub-agentes. Cada item abaixo distingue problema confirmado, problema ja corrigido, recomendacao desatualizada e lacuna que permanece.

## 1. Back-end

### 1.1 Concorrencia e locks

**Diagnostico revisado:** a explicacao anterior estava imprecisa. Uma reconsulta dentro da mesma transacao nao perde o `select_for_update`; o lock pertence a transacao do banco, nao a instancia Python.

O risco real era a ordem inconsistente de locks e o recalculo macro sem garantir o lock da demanda pai. Os fluxos de validacao, reenvio, edicao e consolidacao agora seguem a ordem `Demanda -> ItemDemanda`. `sincronizar_status_macro_demanda` tambem bloqueia a demanda e recalcula os filhos dentro de uma transacao. A view legada de edicao foi alinhada ao mesmo padrao.

**Status:** corrigido.

### 1.2 Escopo de itens manuais

Itens sem catalogo pertencem ao escopo administrativo da unidade que criou a demanda. A API REST e o servico de dominio ja continham parte dessa regra, mas a view server-side de validacao ainda excluia itens manuais. A view foi alinhada, e o cancelamento de uma demanda manual agora tambem verifica explicitamente a unidade da demanda.

Foram adicionados testes para admin da unidade solicitante validar e cancelar demanda manual, e para admin de outra unidade continuar bloqueado.

**Status:** corrigido e coberto por teste.

### 1.3 Exclusao protegida e soft delete

`Unidade`, `GrupoContratacao` e `ItemCatalogo` ja possuiam o campo `ativo`; portanto, criar o campo de soft delete nao era necessario. O problema confirmado era o `destroy` padrao deixar `ProtectedError` virar 500.

Os endpoints agora retornam `409 Conflict` com orientacao para desativar o registro quando houver dependencias protegidas. O tratamento tambem foi aplicado a demanda e item de demanda para impedir erros internos semelhantes.

**Status:** corrigido e coberto por testes para unidade e grupo.

## 2. Front-end

### 2.1 Carregamento de autenticacao

`AuthContext` ja expunha `loading` e as requisicoes das telas de validacao ja aguardavam o carregamento. Faltava evitar o flash de `Acesso restrito` durante esse intervalo. As telas agora exibem estado de carregamento antes de decidir o acesso.

**Status:** corrigido.

### 2.2 Erros HTTP, texto e HTML

O cliente ja capturava a falha de `.json()`, logo a auditoria original exagerava ao afirmar que a aplicacao necessariamente quebrava. Ainda assim, respostas text/html perdiam informacao. O cliente agora le o corpo uma vez, aceita JSON ou texto, remove HTML e detalhes tecnicos, e usa mensagens especificas para `502`, `503` e `504`.

**Status:** corrigido e coberto por testes.

### 2.3 Error Boundary

Nao havia Error Boundary para falhas durante renderizacao. Foi adicionado um boundary na raiz da aplicacao com fallback acessivel e opcao de recarregar a pagina. Falhas assincronas de API continuam sendo tratadas por `ApiErrorMessage`.

**Status:** corrigido e coberto por teste.

### 2.4 Paginacao e validacoes

`ValidacaoDecisao` ja envia o filtro da demanda, e `pendentes` e uma action customizada que retorna lista direta; portanto, a afirmacao de que esse endpoint ja recebia automaticamente a primeira pagina do DRF era falsa no estado atual. O helper do front aceita tanto lista quanto `{ results }`, preservando compatibilidade.

Os endpoints genericos paginados continuam exigindo fixtures de teste coerentes com `{ results }`. MSW ja esta instalado e e usado nos testes de integracao; migrar todos os testes unitarios para MSW e uma melhoria de arquitetura, nao uma correcao obrigatoria de producao.

**Status:** risco original nao reproduzido; compatibilidade mantida.

## 3. Testes e cobertura

Playwright, fixtures E2E e fluxo MVP ja existem no repositorio. MSW tambem ja existe. A alegacao de que nao havia cobertura E2E estava desatualizada.

O uso de `userEvent.setup()` foi aplicado em parte dos testes de integracao, mas ainda existem testes unitarios usando os helpers de conveniencia do pacote. Como a suite atual passa e esses helpers sao suportados pelo `user-event` instalado, isso nao foi confirmado como bug de producao; fica como padrao de manutencao recomendado. A auditoria anterior foi corrigida para nao declarar que todos os usos foram migrados.

Permanece uma lacuna: nao ha teste de concorrencia real com `TransactionTestCase`/duas conexoes para provar bloqueio sob disputa. A implementacao agora usa ordem deterministica de locks, mas esse teste deve ser adicionado quando houver ambiente de CI PostgreSQL apropriado.

## 4. Alteracoes implementadas

- Locks de demanda e item padronizados nos fluxos concorrentes.
- Recalculo macro protegido por lock transacional da demanda.
- Escopo de itens manuais alinhado entre API e views server-side.
- Tratamento amigavel de `ProtectedError` nos endpoints de exclusao.
- Parser de respostas text/html e mensagens para erros de infraestrutura.
- Error Boundary na raiz da SPA.
- Testes para texto nao JSON, Error Boundary, escopo manual e exclusoes protegidas.

## 5. Validacao

Validacao final:

- Backend Django: `218` testes, `OK`, com `--keepdb`.
- Frontend Vitest: `38` arquivos e `222` testes, todos aprovados.
- Frontend performance: `5` testes aprovados.
- Playwright E2E: `11` testes aprovados em `2` arquivos.
- ESLint, `vite build`, `manage.py check` e `makemigrations --check --dry-run`: aprovados.
