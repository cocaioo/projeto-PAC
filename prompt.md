Run ruff check backend
F401 [*] `apps.validacoes.models.TipoAcao` imported but unused
 --> backend/apps/api/filters.py:4:36
  |
2 | from django.db.models import Q, Sum
3 | from apps.demandas.models import Demanda, StatusDemanda
4 | from apps.validacoes.models import TipoAcao, Validacao
  |                                    ^^^^^^^^
5 | from apps.api.views import itens_no_escopo_do_usuario
6 | from apps.demandas.models import ItemDemanda
  |
help: Remove unused import
  |
3 | from apps.demandas.models import Demanda, StatusDemanda
  - from apps.validacoes.models import TipoAcao, Validacao
4 | from apps.api.views import itens_no_escopo_do_usuario
  |

F401 [*] `apps.validacoes.models.Validacao` imported but unused
 --> backend/apps/api/filters.py:4:46
  |
2 | from django.db.models import Q, Sum
3 | from apps.demandas.models import Demanda, StatusDemanda
4 | from apps.validacoes.models import TipoAcao, Validacao
  |                                              ^^^^^^^^^
5 | from apps.api.views import itens_no_escopo_do_usuario
6 | from apps.demandas.models import ItemDemanda
  |
help: Remove unused import
  |
3 | from apps.demandas.models import Demanda, StatusDemanda
  - from apps.validacoes.models import TipoAcao, Validacao
4 | from apps.api.views import itens_no_escopo_do_usuario
  |

F401 [*] `apps.api.views.itens_no_escopo_do_usuario` imported but unused
 --> backend/apps/api/filters.py:5:28
  |
3 | from apps.demandas.models import Demanda, StatusDemanda
4 | from apps.validacoes.models import TipoAcao, Validacao
5 | from apps.api.views import itens_no_escopo_do_usuario
  |                            ^^^^^^^^^^^^^^^^^^^^^^^^^^
6 | from apps.demandas.models import ItemDemanda
  |
help: Remove unused import: `apps.api.views.itens_no_escopo_do_usuario`
  |
4 | from apps.validacoes.models import TipoAcao, Validacao
  - from apps.api.views import itens_no_escopo_do_usuario
5 | from apps.demandas.models import ItemDemanda
  |

F401 [*] `apps.demandas.models.ItemDemanda` imported but unused
 --> backend/apps/api/filters.py:6:34
  |
4 | from apps.validacoes.models import TipoAcao, Validacao
5 | from apps.api.views import itens_no_escopo_do_usuario
6 | from apps.demandas.models import ItemDemanda
  |                                  ^^^^^^^^^^^
7 |
8 | class DemandaFilterSet(django_filters.FilterSet):
  |
help: Remove unused import: `apps.demandas.models.ItemDemanda`
  |
5 | from apps.api.views import itens_no_escopo_do_usuario
  - from apps.demandas.models import ItemDemanda
6 |
  |

F401 [*] `apps.catalogo.models.ItemCatalogo` imported but unused
 --> backend/apps/api/tests_demandas_filters.py:6:34
  |
4 | from apps.demandas.models import Demanda, StatusDemanda, ItemDemanda, Prioridade, TipoItem
5 | from apps.unidades.models import Unidade
6 | from apps.catalogo.models import ItemCatalogo
  |                                  ^^^^^^^^^^^^
7 | from decimal import Decimal
8 | from datetime import date
  |
help: Remove unused import: `apps.catalogo.models.ItemCatalogo`
  |
5 | from apps.unidades.models import Unidade
  - from apps.catalogo.models import ItemCatalogo
6 | from decimal import Decimal
  |

E402 Module level import not at top of file
   --> backend/apps/api/views.py:320:1
    |
318 | # =============================================================================
319 |
320 | from apps.api.filters import DemandaFilterSet
    | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
321 |
322 | class DemandaViewSet(viewsets.ModelViewSet):
    |
help: Move module level imports to top of file

Found 6 errors.
[*] 5 fixable with the `--fix` option.
Error: Process completed with exit code 1.

Run npm test

> pac-ufpi-frontend@1.0.0 test
> vitest run


 RUN  v4.1.10 /home/runner/work/projeto-PAC/projeto-PAC/frontend

stderr | src/pages/AdministrativeFlow.regression.test.jsx > fluxo administrativo — contratos de regressão pré-correção > fila administrativa e estado stale > refaz a consulta quando a janela recupera foco
Warning: An update to ValidacoesList inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at ValidacoesList (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/pages/ValidacoesList.jsx:72:62)
    at Routes (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/router/react-router-dom.js:200:19)
    at MemoryRouter (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/router/react-router-dom.js:165:25)
Warning: An update to ValidacoesList inside a test was not wrapped in act(...).

When testing, code that causes React state updates should be wrapped into act(...):

act(() => {
  /* fire events that update state */
});
/* assert on the output */

This ensures that you're testing the behavior the user would see in the browser. Learn more at https://reactjs.org/link/wrap-tests-with-act
    at ValidacoesList (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/pages/ValidacoesList.jsx:72:62)
    at Routes (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/router/react-router-dom.js:200:19)
    at MemoryRouter (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/router/react-router-dom.js:165:25)

 ✓ src/pages/AdministrativeFlow.regression.test.jsx (12 tests) 674ms
 ✓ src/pages/DemandaDetail.test.jsx (24 tests) 1785ms
 ✓ src/api/client.test.js (25 tests) 43ms
 ✓ src/pages/ItemForm.test.jsx (17 tests) 4243ms
     ✓ bloqueia item de catálogo duplicado na demanda  487ms
     ✓ mostra erro estruturado do backend no campo correto  767ms
     ✓ seleciona item do catálogo, preenche dados e calcula o total visual  853ms
     ✓ adiciona item à demanda e navega de volta ao detalhe  593ms
     ✓ mostra erro quando a API rejeita adição  562ms
 ✓ src/pages/AdminUsuarios.test.jsx (9 tests) 1582ms
     ✓ navega para aba de criar usuário, preenche form e salva  420ms
 ✓ src/pages/Catalogo.test.jsx (12 tests) 1344ms
     ✓ ADMIN cadastra item e recebe feedback  431ms
 ✓ src/pages/Validacoes.integration.test.jsx (4 tests) 678ms
     ✓ abre uma demanda recebida e valida um item pela API  400ms
 ✓ src/pages/ValidacaoDecisao.test.jsx (9 tests) 1050ms
 ❯ src/pages/DemandaList.test.jsx (6 tests | 4 failed) 2063ms
     × lista as demandas retornadas pela API 490ms
     ✓ mostra aviso quando não há demandas 18ms
     ✓ mostra erro padronizado e permite tentar carregar novamente 57ms
     × exibe pílulas de filtro de status com contadores dinâmicos e filtra a lista 244ms
     × filtra demandas por busca textual em tempo real por ID, ano ou observação 79ms
     × exibe estado vazio quando busca não retorna resultados e permite limpar filtros 1168ms
 ✓ src/pages/DfdDetail.test.jsx (6 tests) 476ms
 ✓ src/pages/DfdConsolidar.test.jsx (6 tests) 984ms
     ✓ valida número e seleção antes de abrir a confirmação  328ms
     ✓ confirma, envia o contrato novo e mostra o DFD sem recarregar a página  313ms
 ✓ src/pages/Catalogo.integration.test.jsx (5 tests) 1733ms
     ✓ envia apenas uma pesquisa após o debounce  513ms
     ✓ ADMIN cria, edita e desativa um item pela API  897ms
 ✓ src/auth/AuthFlow.integration.test.jsx (4 tests) 1390ms
     ✓ fluxo de solicitação de acesso por novo usuário  767ms
 ✓ src/pages/ValidacoesList.test.jsx (8 tests) 539ms
 ✓ src/pages/SolicitarAcesso.test.jsx (6 tests) 1715ms
     ✓ valida erro de senhas que não coincidem  447ms
     ✓ envia formulário com sucesso e exibe mensagem de sucesso sem redirecionar automaticamente  424ms
     ✓ exibe erro específico de campo quando backend retorna fieldErrors  341ms
 ✓ src/pages/DfdConsolidar.integration.test.jsx (3 tests) 1069ms
     ✓ consulta os itens elegíveis usando filtros do contrato novo  427ms
     ✓ envia IDs elegíveis e exibe o resultado devolvido pela API  332ms
     ✓ mantém a tela e apresenta conflito quando os itens deixam de ser elegíveis  303ms
 ✓ src/routes.test.jsx (11 tests) 572ms
 ✓ src/components/ProtectedRoute.test.jsx (9 tests) 161ms
 ✓ src/components/Layout.test.jsx (5 tests) 223ms
 ✓ src/pages/Login.test.jsx (6 tests) 923ms
 ✓ src/pages/DemandaDetail.integration.test.jsx (1 test) 433ms
     ✓ mostra devolução e DFD e permite reenviar somente o item devolvido  425ms
 ✓ src/auth/AuthContext.test.jsx (5 tests) 207ms
 ✓ src/components/AppLayout.integration.test.jsx (1 test) 433ms
     ✓ mantém a página no scroll principal e reserva à tabela apenas o eixo horizontal  429ms
 ✓ src/pages/Profile.test.jsx (2 tests) 234ms
 ✓ src/components/ApiErrorMessage.test.jsx (3 tests) 99ms
 ✓ src/pages/DemandaForm.test.jsx (3 tests) 364ms
 ✓ src/components/ui/ui.test.jsx (5 tests) 287ms
 ✓ src/utils/nextActions.test.js (3 tests) 10ms
 ✓ src/components/CatalogItemAutocomplete.integration.test.jsx (1 test) 547ms
     ✓ pesquisa e entrega o item escolhido  539ms
 ✓ src/components/ui/ConfirmDialog.test.jsx (2 tests) 254ms
 ✓ src/pages/Dashboard.test.jsx (2 tests) 129ms
 ✓ src/components/CatalogoFormModal.test.jsx (2 tests) 224ms
 ✓ src/pages/DfdList.test.jsx (2 tests) 164ms
 ✓ src/utils/statusConfig.test.js (9 tests) 10ms
 ✓ src/pages/Home.test.jsx (2 tests) 80ms
 ✓ src/hooks/useDebouncedValue.test.js (1 test) 59ms
Error: Uncaught [Error: render failure]
    at reportException (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/helpers/runtime-script-errors.js:66:24)
    at innerInvokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:353:9)
    at invokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
    at HTMLUnknownElement.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34)
    at Object.invokeGuardedCallbackDev (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4213:16)
    at invokeGuardedCallback (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4277:31)
    at beginWork$1 (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:27490:7)
    at performUnitOfWork (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:26599:12) Error: render failure
    at BrokenComponent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/components/ErrorBoundary.test.jsx:6:9)
    at renderWithHooks (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:15486:18)
    at mountIndeterminateComponent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:20103:13)
    at beginWork (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:21626:16)
    at HTMLUnknownElement.callCallback (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4164:14)
    at HTMLUnknownElement.callTheUserObjectsOperation (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30)
    at innerInvokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25)
    at invokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
Error: Uncaught [Error: render failure]
    at reportException (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/helpers/runtime-script-errors.js:66:24)
    at innerInvokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:353:9)
    at invokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
    at HTMLUnknownElement.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/generated/EventTarget.js:241:34)
    at Object.invokeGuardedCallbackDev (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4213:16)
    at invokeGuardedCallback (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4277:31)
    at beginWork$1 (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:27490:7)
    at performUnitOfWork (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:26599:12) Error: render failure
    at BrokenComponent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/src/components/ErrorBoundary.test.jsx:6:9)
    at renderWithHooks (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:15486:18)
    at mountIndeterminateComponent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:20103:13)
    at beginWork (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:21626:16)
    at HTMLUnknownElement.callCallback (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/react-dom/cjs/react-dom.development.js:4164:14)
    at HTMLUnknownElement.callTheUserObjectsOperation (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/generated/EventListener.js:26:30)
    at innerInvokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:350:25)
    at invokeEventListeners (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:286:3)
    at HTMLUnknownElementImpl._dispatch (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:233:9)
    at HTMLUnknownElementImpl.dispatchEvent (/home/runner/work/projeto-PAC/projeto-PAC/frontend/node_modules/jsdom/lib/jsdom/living/events/EventTarget-impl.js:104:17)
 ✓ src/components/ErrorBoundary.test.jsx (1 test) 167ms
 ✓ src/components/StatusBadge.test.jsx (2 tests) 43ms
 ✓ src/utils/format.test.js (2 tests) 19ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/pages/DemandaList.test.jsx > DemandaList > lista as demandas retornadas pela API
TestingLibraryElementError: Unable to find an accessible element with the role "link" and name `/acompanhar demanda 1/i`

Here are the accessible roles:

  banner:

  Name "":
  <header
    class="page-header"
  />

  --------------------------------------------------
  heading:

  Name "Minhas demandas":
  <h1
    class="page-header__title"
  />

  --------------------------------------------------
  paragraph:

  Name "":
  <p
    class="page-header__description"
  />

  --------------------------------------------------
  link:

  Name "Nova demanda":
  <a
    class="pac-button pac-button--primary"
    href="/demandas/nova"
  />

  Name "#1":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  --------------------------------------------------
  searchbox:

  Name "Buscar demandas":
  <input
    class="pac-input"
    id="busca-demandas"
    placeholder="Buscar por ID, ano ou observacao..."
    type="search"
    value=""
  />

  --------------------------------------------------
  tablist:

  Name "Filtro de demandas por status":
  <div
    aria-label="Filtro de demandas por status"
    class="d-flex flex-wrap gap-2 align-items-center"
    role="tablist"
  />

  --------------------------------------------------
  tab:

  Name "Todas":
  <button
    aria-selected="true"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Rascunhos":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Aguardando validacao":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Devolvidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Concluidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  --------------------------------------------------
  table:

  Name "Demandas cadastradas pelo usuario":
  <table
    class="pac-table"
  />

  --------------------------------------------------
  caption:

  Name "Demandas cadastradas pelo usuario":
  <caption
    class="visually-hidden"
  />

  --------------------------------------------------
  rowgroup:

  Name "":
  <thead />

  Name "":
  <tbody />

  --------------------------------------------------
  row:

  Name "Demanda Unidade Ano Status Valor total Proxima acao Acoes":
  <tr />

  Name "#1 STI 2027 Status: Rascunho R$ 3.000,00 Editar rascunho Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  --------------------------------------------------
  columnheader:

  Name "Demanda":
  <th
    scope="col"
  />

  Name "Unidade":
  <th
    scope="col"
  />

  Name "Ano":
  <th
    scope="col"
  />

  Name "Status":
  <th
    scope="col"
  />

  Name "Valor total":
  <th
    scope="col"
  />

  Name "Proxima acao":
  <th
    scope="col"
  />

  Name "Acoes":
  <th
    class="text-end"
    scope="col"
  />

  --------------------------------------------------
  cell:

  Name "#1":
  <td
    class="fw-semibold"
  />

  Name "STI":
  <td />

  Name "2027":
  <td />

  Name "Status: Rascunho":
  <td />

  Name "R$ 3.000,00":
  <td />

  Name "Editar rascunho":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  --------------------------------------------------

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
          </p>
        </div>
        <div
          class="d-flex flex-wrap gap-2"
        >
          <a
            class="pac-button pac-button--primary"
            href="/demandas/nova"
          >
            <i
              aria-hidden="true"
              class="bi bi-plus-lg"
            />
            Nova demanda
          </a>
        </div>
      </header>
      <section
        class="pac-card mb-4"
      >
        <div
          class="pac-card__body"
        >
          <div
            class="d-flex flex-column gap-3"
          >
            <div
              class="row g-3 align-items-center"
            >
              <div
                class="col-12 col-md-6"
              >
                <div
                  class="pac-field"
                >
                  <label
                    class="pac-field__label"
                    for="busca-demandas"
                  >
                    <span>
                      <i
                        aria-hidden="true"
                        class="bi bi-search me-1"
                      />
                      Buscar demandas
                    </span>
                  </label>
                  <input
                    class="pac-input"
                    id="busca-demandas"
                    placeholder="Buscar por ID, ano ou observacao..."
                    type="search"
                    value=""
                  />
                </div>
              </div>
            </div>
            <div
              aria-label="Filtro de demandas por status"
              class="d-flex flex-wrap gap-2 align-items-center"
              role="tablist"
            >
              <button
                aria-selected="true"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Todas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Rascunhos
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Aguardando validacao
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Devolvidas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Concluidas
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        class="pac-table-wrap"
        data-scroll-direction="horizontal"
      >
        <table
          class="pac-table"
        >
          <caption
            class="visually-hidden"
          >
            Demandas cadastradas pelo usuario
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
              >
                Demanda
              </th>
              <th
                scope="col"
              >
                Unidade
              </th>
              <th
                scope="col"
              >
                Ano
              </th>
              <th
                scope="col"
              >
                Status
              </th>
              <th
                scope="col"
              >
                Valor total
              </th>
              <th
                scope="col"
              >
                Proxima acao
              </th>
              <th
                class="text-end"
                scope="col"
              >
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  1
                </a>
              </td>
              <td>
                STI
              </td>
              <td>
                2027
              </td>
              <td>
                <span
                  aria-label="Status: Rascunho"
                  class="pac-badge pac-badge--neutral"
                  data-status="rascunho"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-pencil"
                  />
                  Rascunho
                </span>
              </td>
              <td>
                R$ 3.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--required pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-exclamation-circle"
                    />
                    <span>
                      Editar rascunho
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
 ❯ Object.getElementError node_modules/@testing-library/dom/dist/config.js:37:19
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:76:38
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:52:17
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:95:19
 ❯ src/pages/DemandaList.test.jsx:41:19
     39|     expect(screen.getByText(/3\.000,00/)).toBeInTheDocument();
     40|     expect(screen.getByRole("link", { name: /nova demanda/i })).toBeIn…
     41|     expect(screen.getByRole("link", { name: /acompanhar demanda 1/i })…
       |                   ^
     42|       "href",
     43|       "/demandas/1"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  src/pages/DemandaList.test.jsx > DemandaList > exibe pílulas de filtro de status com contadores dinâmicos e filtra a lista
TestingLibraryElementError: Unable to find an accessible element with the role "tab" and name `/aguardando validação/i`

Here are the accessible roles:

  banner:

  Name "":
  <header
    class="page-header"
  />

  --------------------------------------------------
  heading:

  Name "Minhas demandas":
  <h1
    class="page-header__title"
  />

  --------------------------------------------------
  paragraph:

  Name "":
  <p
    class="page-header__description"
  />

  --------------------------------------------------
  link:

  Name "Nova demanda":
  <a
    class="pac-button pac-button--primary"
    href="/demandas/nova"
  />

  Name "#1":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#2":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#3":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#4":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  --------------------------------------------------
  searchbox:

  Name "Buscar demandas":
  <input
    class="pac-input"
    id="busca-demandas"
    placeholder="Buscar por ID, ano ou observacao..."
    type="search"
    value=""
  />

  --------------------------------------------------
  tablist:

  Name "Filtro de demandas por status":
  <div
    aria-label="Filtro de demandas por status"
    class="d-flex flex-wrap gap-2 align-items-center"
    role="tablist"
  />

  --------------------------------------------------
  tab:

  Name "Todas":
  <button
    aria-selected="true"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Rascunhos":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Aguardando validacao":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Devolvidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Concluidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  --------------------------------------------------
  table:

  Name "Demandas cadastradas pelo usuario":
  <table
    class="pac-table"
  />

  --------------------------------------------------
  caption:

  Name "Demandas cadastradas pelo usuario":
  <caption
    class="visually-hidden"
  />

  --------------------------------------------------
  rowgroup:

  Name "":
  <thead />

  Name "":
  <tbody />

  --------------------------------------------------
  row:

  Name "Demanda Unidade Ano Status Valor total Proxima acao Acoes":
  <tr />

  Name "#1 STI 2027 Status: Rascunho R$ 1.000,00 Editar rascunho Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#2 PROPLAN 2027 Status: Aguardando validação R$ 2.000,00 Aguardar validação Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#3 CCE 2026 Status: Em andamento R$ 3.000,00 Corrigir itens devolvidos Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#4 PREG 2026 Status: Concluída R$ 4.000,00 Consultar histórico Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  --------------------------------------------------
  columnheader:

  Name "Demanda":
  <th
    scope="col"
  />

  Name "Unidade":
  <th
    scope="col"
  />

  Name "Ano":
  <th
    scope="col"
  />

  Name "Status":
  <th
    scope="col"
  />

  Name "Valor total":
  <th
    scope="col"
  />

  Name "Proxima acao":
  <th
    scope="col"
  />

  Name "Acoes":
  <th
    class="text-end"
    scope="col"
  />

  --------------------------------------------------
  cell:

  Name "#1":
  <td
    class="fw-semibold"
  />

  Name "STI":
  <td />

  Name "2027":
  <td />

  Name "Status: Rascunho":
  <td />

  Name "R$ 1.000,00":
  <td />

  Name "Editar rascunho":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  Name "#2":
  <td
    class="fw-semibold"
  />

  Name "PROPLAN":
  <td />

  Name "2027":
  <td />

  Name "Status: Aguardando validação":
  <td />

  Name "R$ 2.000,00":
  <td />

  Name "Aguardar validação":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  Name "#3":
  <td
    class="fw-semibold"
  />

  Name "CCE":
  <td />

  Name "2026":
  <td />

  Name "Status: Em andamento":
  <td />

  Name "R$ 3.000,00":
  <td />

  Name "Corrigir itens devolvidos":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  Name "#4":
  <td
    class="fw-semibold"
  />

  Name "PREG":
  <td />

  Name "2026":
  <td />

  Name "Status: Concluída":
  <td />

  Name "R$ 4.000,00":
  <td />

  Name "Consultar histórico":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  --------------------------------------------------

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
          </p>
        </div>
        <div
          class="d-flex flex-wrap gap-2"
        >
          <a
            class="pac-button pac-button--primary"
            href="/demandas/nova"
          >
            <i
              aria-hidden="true"
              class="bi bi-plus-lg"
            />
            Nova demanda
          </a>
        </div>
      </header>
      <section
        class="pac-card mb-4"
      >
        <div
          class="pac-card__body"
        >
          <div
            class="d-flex flex-column gap-3"
          >
            <div
              class="row g-3 align-items-center"
            >
              <div
                class="col-12 col-md-6"
              >
                <div
                  class="pac-field"
                >
                  <label
                    class="pac-field__label"
                    for="busca-demandas"
                  >
                    <span>
                      <i
                        aria-hidden="true"
                        class="bi bi-search me-1"
                      />
                      Buscar demandas
                    </span>
                  </label>
                  <input
                    class="pac-input"
                    id="busca-demandas"
                    placeholder="Buscar por ID, ano ou observacao..."
                    type="search"
                    value=""
                  />
                </div>
              </div>
            </div>
            <div
              aria-label="Filtro de demandas por status"
              class="d-flex flex-wrap gap-2 align-items-center"
              role="tablist"
            >
              <button
                aria-selected="true"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Todas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Rascunhos
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Aguardando validacao
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Devolvidas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Concluidas
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        class="pac-table-wrap"
        data-scroll-direction="horizontal"
      >
        <table
          class="pac-table"
        >
          <caption
            class="visually-hidden"
          >
            Demandas cadastradas pelo usuario
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
              >
                Demanda
              </th>
              <th
                scope="col"
              >
                Unidade
              </th>
              <th
                scope="col"
              >
                Ano
              </th>
              <th
                scope="col"
              >
                Status
              </th>
              <th
                scope="col"
              >
                Valor total
              </th>
              <th
                scope="col"
              >
                Proxima acao
              </th>
              <th
                class="text-end"
                scope="col"
              >
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  1
                </a>
              </td>
              <td>
                STI
              </td>
              <td>
                2027
              </td>
              <td>
                <span
                  aria-label="Status: Rascunho"
                  class="pac-badge pac-badge--neutral"
                  data-status="rascunho"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-pencil"
                  />
                  Rascunho
                </span>
              </td>
              <td>
                R$ 1.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--required pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-exclamation-circle"
                    />
                    <span>
                      Editar rascunho
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-hourglass-split"
                    />
                    <span>
                      Aguardar validação
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  3
                </a>
              </td>
              <td>
                CCE
              </td>
              <td>
                2026
              </td>
              <td>
                <span
                  aria-label="Status: Em andamento"
                  class="pac-badge pac-badge--info"
                  data-status="em_andamento"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-arrow-repeat"
                  />
                  Em andamento
                </span>
              </td>
              <td>
                R$ 3.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--required pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-exclamation-circle"
                    />
                    <span>
                      Corrigir itens devolvidos
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  4
                </a>
              </td>
              <td>
                PREG
              </td>
              <td>
                2026
              </td>
              <td>
                <span
                  aria-label="Status: Concluída"
                  class="pac-badge pac-badge--success"
                  data-status="concluida"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-check2-all"
                  />
                  Concluída
                </span>
              </td>
              <td>
                R$ 4.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--view pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-folder2-open"
                    />
                    <span>
                      Consultar histórico
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
 ❯ Object.getElementError node_modules/@testing-library/dom/dist/config.js:37:19
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:76:38
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:52:17
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:95:19
 ❯ src/pages/DemandaList.test.jsx:120:34
    118|     const tabTodas = screen.getByRole("tab", { name: /todas/i });
    119|     const tabRascunhos = screen.getByRole("tab", { name: /rascunhos/i …
    120|     const tabAguardando = screen.getByRole("tab", { name: /aguardando …
       |                                  ^
    121|     const tabAcaoNecessaria = screen.getByRole("tab", { name: /ação ne…
    122|     const tabConcluidas = screen.getByRole("tab", { name: /concluídas/…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  src/pages/DemandaList.test.jsx > DemandaList > filtra demandas por busca textual em tempo real por ID, ano ou observação
Error: expect(element).not.toBeInTheDocument()

expected document not to contain element, found <td>
  CCS
</td> instead
 ❯ src/pages/DemandaList.test.jsx:191:43
    189|     await testUser.type(searchInput, "101");
    190|     expect(screen.getByText("STI")).toBeInTheDocument();
    191|     expect(screen.queryByText("CCS")).not.toBeInTheDocument();
       |                                           ^
    192|
    193|     // Clear search

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  src/pages/DemandaList.test.jsx > DemandaList > exibe estado vazio quando busca não retorna resultados e permite limpar filtros
TestingLibraryElementError: Unable to find an element with the text: /nenhuma demanda encontrada/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
          </p>
        </div>
        <div
          class="d-flex flex-wrap gap-2"
        >
          <a
            class="pac-button pac-button--primary"
            href="/demandas/nova"
          >
            <i
              aria-hidden="true"
              class="bi bi-plus-lg"
            />
            Nova demanda
          </a>
        </div>
      </header>
      <section
        class="pac-card mb-4"
      >
        <div
          class="pac-card__body"
        >
          <div
            class="d-flex flex-column gap-3"
          >
            <div
              class="row g-3 align-items-center"
            >
              <div
                class="col-12 col-md-6"
              >
                <div
                  class="pac-field"
                >
                  <label
                    class="pac-field__label"
                    for="busca-demandas"
                  >
                    <span>
                      <i
                        aria-hidden="true"
                        class="bi bi-search me-1"
                      />
                      Buscar demandas
                    </span>
                  </label>
                  <input
                    class="pac-input"
                    id="busca-demandas"
                    placeholder="Buscar por ID, ano ou observacao..."
                    type="search"
                    value="termo_inexistente"
                  />
                </div>
              </div>
            </div>
            <div
              aria-label="Filtro de demandas por status"
              class="d-flex flex-wrap gap-2 align-items-center"
              role="tablist"
            >
              <button
                aria-selected="true"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Todas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Rascunhos
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Aguardando validacao
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Devolvidas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Concluidas
                </span>
              </button>
              <button
                class="pac-button pac-button--ghost pac-button--sm ms-auto"
                type="button"
              >
                <i
                  aria-hidden="true"
                  class="bi bi-x-circle"
                />
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        aria-live="polite"
        class="d-flex justify-content-between align-items-center mb-3"
      >
        <span
          class="text-muted small"
        >
          Exibindo 
          1
           de 
          1
           
          demanda filtrada
        </span>
      </div>
      <div
        class="pac-table-wrap"
        data-scroll-direction="horizontal"
      >
        <table
          class="pac-table"
        >
          <caption
            class="visually-hidden"
          >
            Demandas cadastradas pelo usuario
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
              >
                Demanda
              </th>
              <th
                scope="col"
              >
                Unidade
              </th>
              <th
                scope="col"
              >
                Ano
              </th>
              <th
                scope="col"
              >
                Status
              </th>
              <th
                scope="col"
              >
                Valor total
              </th>
              <th
                scope="col"
              >
                Proxima acao
              </th>
              <th
                class="text-end"
                scope="col"
              >
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  1
                </a>
              </td>
              <td>
                STI
              </td>
              <td>
                2027
              </td>
              <td>
                <span
                  aria-label="Status: Rascunho"
                  class="pac-badge pac-badge--neutral"
                  data-status="rascunho"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-pencil"
                  />
                  Rascunho
                </span>
              </td>
              <td>
                R$ 1.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--required pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-exclamation-circle"
                    />
                    <span>
                      Editar rascunho
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
          </p>
        </div>
        <div
          class="d-flex flex-wrap gap-2"
        >
          <a
            class="pac-button pac-button--primary"
            href="/demandas/nova"
          >
            <i
              aria-hidden="true"
              class="bi bi-plus-lg"
            />
            Nova demanda
          </a>
        </div>
      </header>
      <section
        class="pac-card mb-4"
      >
        <div
          class="pac-card__body"
        >
          <div
            class="d-flex flex-column gap-3"
          >
            <div
              class="row g-3 align-items-center"
            >
              <div
                class="col-12 col-md-6"
              >
                <div
                  class="pac-field"
                >
                  <label
                    class="pac-field__label"
                    for="busca-demandas"
                  >
                    <span>
                      <i
                        aria-hidden="true"
                        class="bi bi-search me-1"
                      />
                      Buscar demandas
                    </span>
                  </label>
                  <input
                    class="pac-input"
                    id="busca-demandas"
                    placeholder="Buscar por ID, ano ou observacao..."
                    type="search"
                    value="termo_inexistente"
                  />
                </div>
              </div>
            </div>
            <div
              aria-label="Filtro de demandas por status"
              class="d-flex flex-wrap gap-2 align-items-center"
              role="tablist"
            >
              <button
                aria-selected="true"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Todas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Rascunhos
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Aguardando validacao
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Devolvidas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Concluidas
                </span>
              </button>
              <button
                class="pac-button pac-button--ghost pac-button--sm ms-auto"
                type="button"
              >
                <i
                  aria-hidden="true"
                  class="bi bi-x-circle"
                />
                Limpar filtros
              </button>
            </div>
          </div>
        </div>
      </section>
      <div
        aria-live="polite"
        class="d-flex justify-content-between align-items-center mb-3"
      >
        <span
          class="text-muted small"
        >
          Exibindo 
          1
           de 
          1
           
          demanda filtrada
        </span>
      </div>
      <div
        class="pac-table-wrap"
        data-scroll-direction="horizontal"
      >
        <table
          class="pac-table"
        >
          <caption
            class="visually-hidden"
          >
            Demandas cadastradas pelo usuario
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
              >
                Demanda
              </th>
              <th
                scope="col"
              >
                Unidade
              </th>
              <th
                scope="col"
              >
                Ano
              </th>
              <th
                scope="col"
              >
                Status
              </th>
              <th
                scope="col"
              >
                Valor total
              </th>
              <th
                scope="col"
              >
                Proxima acao
              </th>
              <th
                class="text-end"
                scope="col"
              >
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              class="pac-table__row-link"
            >
              <td
                class="fw-semibold"
              >
                <a
                  href="/demandas/"
                >
                  #
                  1
                </a>
              </td>
              <td>
                STI
              </td>
              <td>
                2027
              </td>
              <td>
                <span
                  aria-label="Status: Rascunho"
                  class="pac-badge pac-badge--neutral"
                  data-status="rascunho"
                >
                  <i
                    aria-hidden="true"
                    class="bi bi-pencil"
                  />
                  Rascunho
                </span>
              </td>
              <td>
                R$ 1.000,00
              </td>
              <td>
                <div
                  class="pac-next-action pac-next-action--required pac-next-action--compact"
                >
                  <div
                    class="pac-next-action__label"
                  >
                    <i
                      aria-hidden="true"
                      class="bi bi-exclamation-circle"
                    />
                    <span>
                      Editar rascunho
                    </span>
                  </div>
                </div>
              </td>
              <td
                class="text-end"
              >
                <a
                  aria-label="Acompanhar demanda "
                  class="pac-button pac-button--secondary pac-button--sm"
                  href="/demandas/"
                >
                  Acompanhar
                  <i
                    aria-hidden="true"
                    class="bi bi-chevron-right"
                  />
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
 ❯ waitForWrapper node_modules/@testing-library/dom/dist/wait-for.js:163:27
 ❯ node_modules/@testing-library/dom/dist/query-helpers.js:86:33
 ❯ src/pages/DemandaList.test.jsx:230:25
    228|     await testUser.type(searchInput, "termo_inexistente");
    229|
    230|     expect(await screen.findByText(/nenhuma demanda encontrada/i)).toB…
       |                         ^
    231|     expect(screen.queryByText("STI")).not.toBeInTheDocument();
    232|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯


 Test Files  1 failed | 38 passed (39)
      Tests  4 failed | 232 passed (236)
   Start at  23:14:13
   Duration  25.82s (transform 1.83s, setup 9.46s, import 6.83s, tests 27.01s, environment 24.81s)


Error: TestingLibraryElementError: Unable to find an accessible element with the role "link" and name `/acompanhar demanda 1/i`

Here are the accessible roles:

  banner:

  Name "":
  <header
    class="page-header"
  />

  --------------------------------------------------
  heading:

  Name "Minhas demandas":
  <h1
    class="page-header__title"
  />

  --------------------------------------------------
  paragraph:

  Name "":
  <p
    class="page-header__description"
  />

  --------------------------------------------------
  link:

  Name "Nova demanda":
  <a
    class="pac-button pac-button--primary"
    href="/demandas/nova"
  />

  Name "#1":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  --------------------------------------------------
  searchbox:

  Name "Buscar demandas":
  <input
    class="pac-input"
    id="busca-demandas"
    placeholder="Buscar por ID, ano ou observacao..."
    type="search"
    value=""
  />

  --------------------------------------------------
  tablist:

  Name "Filtro de demandas por status":
  <div
    aria-label="Filtro de demandas por status"
    class="d-flex flex-wrap gap-2 align-items-center"
    role="tablist"
  />

  --------------------------------------------------
  tab:

  Name "Todas":
  <button
    aria-selected="true"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Rascunhos":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Aguardando validacao":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Devolvidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Concluidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  --------------------------------------------------
  table:

  Name "Demandas cadastradas pelo usuario":
  <table
    class="pac-table"
  />

  --------------------------------------------------
  caption:

  Name "Demandas cadastradas pelo usuario":
  <caption
    class="visually-hidden"
  />

  --------------------------------------------------
  rowgroup:

  Name "":
  <thead />

  Name "":
  <tbody />

  --------------------------------------------------
  row:

  Name "Demanda Unidade Ano Status Valor total Proxima acao Acoes":
  <tr />

  Name "#1 STI 2027 Status: Rascunho R$ 3.000,00 Editar rascunho Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  --------------------------------------------------
  columnheader:

  Name "Demanda":
  <th
    scope="col"
  />

  Name "Unidade":
  <th
    scope="col"
  />

  Name "Ano":
  <th
    scope="col"
  />

  Name "Status":
  <th
    scope="col"
  />

  Name "Valor total":
  <th
    scope="col"
  />

  Name "Proxima acao":
  <th
    scope="col"
  />

  Name "Acoes":
  <th
    class="text-end"
    scope="col"
  />

  --------------------------------------------------
  cell:

  Name "#1":
  <td
    class="fw-semibold"
  />

  Name "STI":
  <td />

  Name "2027":
  <td />

  Name "Status: Rascunho":
  <td />

  Name "R$ 3.000,00":
  <td />

  Name "Editar rascunho":
  <td />

  Name "Acompanhar demanda":
  <td
    class="text-end"
  />

  --------------------------------------------------

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
       

Error: TestingLibraryElementError: Unable to find an accessible element with the role "tab" and name `/aguardando validação/i`

Here are the accessible roles:

  banner:

  Name "":
  <header
    class="page-header"
  />

  --------------------------------------------------
  heading:

  Name "Minhas demandas":
  <h1
    class="page-header__title"
  />

  --------------------------------------------------
  paragraph:

  Name "":
  <p
    class="page-header__description"
  />

  --------------------------------------------------
  link:

  Name "Nova demanda":
  <a
    class="pac-button pac-button--primary"
    href="/demandas/nova"
  />

  Name "#1":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#2":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#3":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  Name "#4":
  <a
    href="/demandas/"
  />

  Name "Acompanhar demanda":
  <a
    aria-label="Acompanhar demanda "
    class="pac-button pac-button--secondary pac-button--sm"
    href="/demandas/"
  />

  --------------------------------------------------
  searchbox:

  Name "Buscar demandas":
  <input
    class="pac-input"
    id="busca-demandas"
    placeholder="Buscar por ID, ano ou observacao..."
    type="search"
    value=""
  />

  --------------------------------------------------
  tablist:

  Name "Filtro de demandas por status":
  <div
    aria-label="Filtro de demandas por status"
    class="d-flex flex-wrap gap-2 align-items-center"
    role="tablist"
  />

  --------------------------------------------------
  tab:

  Name "Todas":
  <button
    aria-selected="true"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Rascunhos":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Aguardando validacao":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Devolvidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  Name "Concluidas":
  <button
    aria-selected="false"
    class="pac-button pac-button--sm "
    role="tab"
    type="button"
  />

  --------------------------------------------------
  table:

  Name "Demandas cadastradas pelo usuario":
  <table
    class="pac-table"
  />

  --------------------------------------------------
  caption:

  Name "Demandas cadastradas pelo usuario":
  <caption
    class="visually-hidden"
  />

  --------------------------------------------------
  rowgroup:

  Name "":
  <thead />

  Name "":
  <tbody />

  --------------------------------------------------
  row:

  Name "Demanda Unidade Ano Status Valor total Proxima acao Acoes":
  <tr />

  Name "#1 STI 2027 Status: Rascunho R$ 1.000,00 Editar rascunho Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#2 PROPLAN 2027 Status: Aguardando validação R$ 2.000,00 Aguardar validação Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#3 CCE 2026 Status: Em andamento R$ 3.000,00 Corrigir itens devolvidos Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  Name "#4 PREG 2026 Status: Concluída R$ 4.000,00 Consultar histórico Acompanhar demanda":
  <tr
    class="pac-table__row-link"
  />

  --------------------------------------------------
  columnheader:

  Name "Demanda":
  <th
    scope="col"
  />

  Name "Unidade":
  <th
    scope="col"
  />

  Name "Ano":
  <th
    scope="col"
  />

  Name "Status":
  <th
    scope="col"
  />

  Name "Valor total":
  <th
    scope="col"
  />

  Name "Pro

Error: Error: expect(element).not.toBeInTheDocument()

expected document not to contain element, found <td>
  CCS
</td> instead
 ❯ src/pages/DemandaList.test.jsx:191:43



Error: TestingLibraryElementError: Unable to find an element with the text: /nenhuma demanda encontrada/i. This could be because the text is broken up by multiple elements. In this case, you can provide a function for your text matcher to make your matcher more flexible.

Ignored nodes: comments, script, style
<body>
  <div>
    <div>
      <header
        class="page-header"
      >
        <div>
          <div
            class="text-uppercase small text-muted fw-semibold mb-1"
          >
            Planejamento e contratacoes
          </div>
          <h1
            class="page-header__title"
          >
            Minhas demandas
          </h1>
          <p
            class="page-header__description"
          >
            Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma.
          </p>
        </div>
        <div
          class="d-flex flex-wrap gap-2"
        >
          <a
            class="pac-button pac-button--primary"
            href="/demandas/nova"
          >
            <i
              aria-hidden="true"
              class="bi bi-plus-lg"
            />
            Nova demanda
          </a>
        </div>
      </header>
      <section
        class="pac-card mb-4"
      >
        <div
          class="pac-card__body"
        >
          <div
            class="d-flex flex-column gap-3"
          >
            <div
              class="row g-3 align-items-center"
            >
              <div
                class="col-12 col-md-6"
              >
                <div
                  class="pac-field"
                >
                  <label
                    class="pac-field__label"
                    for="busca-demandas"
                  >
                    <span>
                      <i
                        aria-hidden="true"
                        class="bi bi-search me-1"
                      />
                      Buscar demandas
                    </span>
                  </label>
                  <input
                    class="pac-input"
                    id="busca-demandas"
                    placeholder="Buscar por ID, ano ou observacao..."
                    type="search"
                    value="termo_inexistente"
                  />
                </div>
              </div>
            </div>
            <div
              aria-label="Filtro de demandas por status"
              class="d-flex flex-wrap gap-2 align-items-center"
              role="tablist"
            >
              <button
                aria-selected="true"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Todas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Rascunhos
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Aguardando validacao
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Devolvidas
                </span>
              </button>
              <button
                aria-selected="false"
                class="pac-button pac-button--sm "
                role="tab"
                type="button"
              >
                <span>
                  Concluidas
                </span>
              </button>
              <button
                class="pac-button pac-button--ghost pac-button--sm ms-auto"
                type="button"
              >
                
Error: Process completed with exit code 1.

Run python manage.py test --verbosity 2
Found 248 test(s).
Creating test database for alias 'default' ('test_pac_db')...
Operations to perform:
  Synchronize unmigrated apps: api, core, corsheaders, django_filters, messages, rest_framework, staticfiles
  Apply all migrations: admin, auditoria, auth, catalogo, contenttypes, demandas, dfd, grupos_contratacao, sessions, unidades, usuarios, validacoes
Synchronizing apps without migrations:
  Creating tables...
    Running deferred SQL...
Running migrations:
  Applying unidades.0001_initial... OK
  Applying contenttypes.0001_initial... OK
  Applying contenttypes.0002_remove_content_type_name... OK
  Applying auth.0001_initial... OK
  Applying auth.0002_alter_permission_name_max_length... OK
  Applying auth.0003_alter_user_email_max_length... OK
  Applying auth.0004_alter_user_username_opts... OK
  Applying auth.0005_alter_user_last_login_null... OK
  Applying auth.0006_require_contenttypes_0002... OK
  Applying auth.0007_alter_validators_add_error_messages... OK
  Applying auth.0008_alter_user_username_max_length... OK
  Applying auth.0009_alter_user_last_name_max_length... OK
  Applying auth.0010_alter_group_name_max_length... OK
  Applying auth.0011_update_proxy_permissions... OK
  Applying auth.0012_alter_user_first_name_max_length... OK
  Applying usuarios.0001_initial... OK
  Applying admin.0001_initial... OK
  Applying admin.0002_logentry_remove_auto_add... OK
  Applying admin.0003_logentry_add_action_flag_choices... OK
  Applying auditoria.0001_initial... OK
  Applying auditoria.0002_initial... OK
  Applying grupos_contratacao.0001_initial... OK
  Applying catalogo.0001_initial... OK
  Applying dfd.0001_initial... OK
  Applying demandas.0001_initial... OK
  Applying demandas.0002_initial... OK
  Applying dfd.0002_initial... OK
  Applying demandas.0003_alter_demanda_status_alter_itemdemanda_status... OK
  Applying demandas.0004_sincronizar_dados_status... OK
  Applying demandas.0005_itemdemanda_observacoes... OK
  Applying demandas.0006_ciclopac_demanda_ciclo_pac... OK
  Applying dfd.0003_dfd_ciclo_pac_numero_por_ciclo... OK
  Applying demandas.0007_itemdemanda_dfd... OK
  Applying demandas.0008_itemdemanda_regras_catalogo_prioridade_status... OK
  Applying sessions.0001_initial... OK
  Applying usuarios.0002_usuario_precisa_trocar_senha_alter_usuario_siape_and_more... OK
  Applying usuarios.0003_usuario_grupos_administrados... OK
  Applying validacoes.0001_initial... OK
System check identified no issues (0 silenced).
test_modelos_da_semana_1_do_miguel_registrados_no_admin (apps.api.tests.AdminRegistrationTests.test_modelos_da_semana_1_do_miguel_registrados_no_admin) ... ok
test_login_com_credenciais_invalidas (apps.api.tests.AutenticacaoTests.test_login_com_credenciais_invalidas) ... ok
test_login_com_credenciais_validas (apps.api.tests.AutenticacaoTests.test_login_com_credenciais_validas) ... ok
test_me_exige_autenticacao (apps.api.tests.AutenticacaoTests.test_me_exige_autenticacao) ... ok
test_me_expoe_capacidades_do_perfil_sem_depender_de_is_staff (apps.api.tests.AutenticacaoTests.test_me_expoe_capacidades_do_perfil_sem_depender_de_is_staff) ... ok
test_me_retorna_usuario_logado (apps.api.tests.AutenticacaoTests.test_me_retorna_usuario_logado) ... ok
test_admin_gerencia_catalogo_e_ativa_desativa (apps.api.tests.CatalogoDashboardTests.test_admin_gerencia_catalogo_e_ativa_desativa) ... ok
test_catalogo_busca_por_nome_ou_codigo (apps.api.tests.CatalogoDashboardTests.test_catalogo_busca_por_nome_ou_codigo) ... ok
test_catalogo_escrita_exige_admin (apps.api.tests.CatalogoDashboardTests.test_catalogo_escrita_exige_admin) ... ok
test_catalogo_filtra_por_grupo_e_ativo (apps.api.tests.CatalogoDashboardTests.test_catalogo_filtra_por_grupo_e_ativo) ... ok
test_dashboard_stats (apps.api.tests.CatalogoDashboardTests.test_dashboard_stats) ... ok
test_listar_catalogo (apps.api.tests.CatalogoDashboardTests.test_listar_catalogo) ... ok
test_consolidacao_reverte_todas_as_escritas_em_falha_intermediaria (apps.api.tests.DFDTests.test_consolidacao_reverte_todas_as_escritas_em_falha_intermediaria) ... ok
test_consolidar_cria_dfd_e_marca_itens_vinculados (apps.api.tests.DFDTests.test_consolidar_cria_dfd_e_marca_itens_vinculados) ... ok
test_consolidar_desduplica_ids_repetidos (apps.api.tests.DFDTests.test_consolidar_desduplica_ids_repetidos) ... ok
test_consolidar_item_nao_validado_rejeita (apps.api.tests.DFDTests.test_consolidar_item_nao_validado_rejeita) ... ok
test_consolidar_itens_de_multiplas_demandas_sincroniza_todas (apps.api.tests.DFDTests.test_consolidar_itens_de_multiplas_demandas_sincroniza_todas) ... ok
test_consolidar_rejeita_id_inexistente (apps.api.tests.DFDTests.test_consolidar_rejeita_id_inexistente) ... ok
test_consolidar_rejeita_item_de_demanda_concluida (apps.api.tests.DFDTests.test_consolidar_rejeita_item_de_demanda_concluida) ... ok
test_consolidar_rejeita_item_ja_vinculado (apps.api.tests.DFDTests.test_consolidar_rejeita_item_ja_vinculado) ... ok
test_fluxo_completo_ciclo_de_vida (apps.api.tests.DFDTests.test_fluxo_completo_ciclo_de_vida) ... ok
test_itens_disponiveis (apps.api.tests.DFDTests.test_itens_disponiveis) ... ok
test_adicionar_item_a_demanda (apps.api.tests.DemandaTests.test_adicionar_item_a_demanda) ... ok
test_cancelar_demanda_em_rascunho_pelo_dono (apps.api.tests.DemandaTests.test_cancelar_demanda_em_rascunho_pelo_dono) ... ok
test_criar_demanda (apps.api.tests.DemandaTests.test_criar_demanda) ... ok
test_enviar_demanda_com_itens_sucesso (apps.api.tests.DemandaTests.test_enviar_demanda_com_itens_sucesso) ... ok
test_enviar_demanda_sem_itens_rejeita (apps.api.tests.DemandaTests.test_enviar_demanda_sem_itens_rejeita) ... ok
test_excluir_demanda_em_rascunho_pelo_dono_sucesso_204 (apps.api.tests.DemandaTests.test_excluir_demanda_em_rascunho_pelo_dono_sucesso_204) ... ok
test_excluir_demanda_nao_rascunho_bloqueado_400 (apps.api.tests.DemandaTests.test_excluir_demanda_nao_rascunho_bloqueado_400) ... ok
test_excluir_demanda_por_outro_usuario_bloqueado_403 (apps.api.tests.DemandaTests.test_excluir_demanda_por_outro_usuario_bloqueado_403) ... ok
test_serializacao_historico_na_demanda_e_item (apps.api.tests.DemandaTests.test_serializacao_historico_na_demanda_e_item) ... ok
test_admin_comum_nao_visualiza_item_manual (apps.api.tests.ItemDevolvidoCorrecaoTests.test_admin_comum_nao_visualiza_item_manual) ... ok
test_demanda_detail_query_count_does_not_grow_per_item (apps.api.tests.ItemDevolvidoCorrecaoTests.test_demanda_detail_query_count_does_not_grow_per_item) ... ok
test_editar_item_devolvido_salva_observacoes_e_mantem_status (apps.api.tests.ItemDevolvidoCorrecaoTests.test_editar_item_devolvido_salva_observacoes_e_mantem_status) ... ok
test_get_item_inexistente_retorna_404 (apps.api.tests.ItemDevolvidoCorrecaoTests.test_get_item_inexistente_retorna_404) ... ok
test_get_item_outro_usuario_bloqueado (apps.api.tests.ItemDevolvidoCorrecaoTests.test_get_item_outro_usuario_bloqueado) ... ok
test_get_item_proprietario_acessa (apps.api.tests.ItemDevolvidoCorrecaoTests.test_get_item_proprietario_acessa) ... ok
test_item_devolvido_exibe_justificativa_mais_recente (apps.api.tests.ItemDevolvidoCorrecaoTests.test_item_devolvido_exibe_justificativa_mais_recente) ... ok
test_item_devolvido_exibe_ultima_justificativa (apps.api.tests.ItemDevolvidoCorrecaoTests.test_item_devolvido_exibe_ultima_justificativa) ... ok
test_observacao_do_solicitante_nao_substitui_justificativa_admin (apps.api.tests.ItemDevolvidoCorrecaoTests.test_observacao_do_solicitante_nao_substitui_justificativa_admin) ... ok
test_outro_usuario_nao_edita_nem_reenvia_item (apps.api.tests.ItemDevolvidoCorrecaoTests.test_outro_usuario_nao_edita_nem_reenvia_item) ... ok
test_prefetch_multiplos_itens_devolvidos (apps.api.tests.ItemDevolvidoCorrecaoTests.test_prefetch_multiplos_itens_devolvidos) ... ok
test_reenviar_item_de_demanda_concluida_rejeita (apps.api.tests.ItemDevolvidoCorrecaoTests.test_reenviar_item_de_demanda_concluida_rejeita) ... ok
test_reenviar_item_devolvido_sucesso (apps.api.tests.ItemDevolvidoCorrecaoTests.test_reenviar_item_devolvido_sucesso) ... ok
test_reenviar_item_nao_devolvido_rejeita (apps.api.tests.ItemDevolvidoCorrecaoTests.test_reenviar_item_nao_devolvido_rejeita) ... ok
test_segundo_reenvio_do_mesmo_item_eh_rejeitado (apps.api.tests.ItemDevolvidoCorrecaoTests.test_segundo_reenvio_do_mesmo_item_eh_rejeitado) ... ok
test_api_admin_comum_nao_visualiza_item_manual (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_admin_comum_nao_visualiza_item_manual) ... ok
test_api_admin_de_outro_grupo_recebe_404 (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_admin_de_outro_grupo_recebe_404) ... ok
test_api_admin_do_grupo_visualiza_mas_nao_corrige_nem_reenvia (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_admin_do_grupo_visualiza_mas_nao_corrige_nem_reenvia) ... ok
test_api_admin_master_visualiza_mas_nao_edita_nem_reenvia (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_admin_master_visualiza_mas_nao_edita_nem_reenvia) ... ok
test_api_outro_solicitante_recebe_404_ao_visualizar_editar_e_reenviar (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_outro_solicitante_recebe_404_ao_visualizar_editar_e_reenviar) ... ok
test_api_proprietario_consegue_reenviar_item_devolvido_valido (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_api_proprietario_consegue_reenviar_item_devolvido_valido) ... ok
test_politica_de_acesso_por_operacao_e_grupo_real (apps.api.tests.ItemDevolvidoRedPoliticaAcessoTests.test_politica_de_acesso_por_operacao_e_grupo_real) ... ok
test_patch_item_catalogado_bloqueia_campos_herdados (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_patch_item_catalogado_bloqueia_campos_herdados) ... ok
test_patch_item_manual_permite_campos_manuais (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_patch_item_manual_permite_campos_manuais) ... ok
test_patch_serializer_rejeita_campos_protegidos_desconhecidos_e_recalcula_total (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_patch_serializer_rejeita_campos_protegidos_desconhecidos_e_recalcula_total) ... ok
test_put_item_demanda_retorna_405_para_todo_status (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_put_item_demanda_retorna_405_para_todo_status) ... ok
test_reenviar_api_demanda_concluida_e_cancelada_retorna_409 (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_reenviar_api_demanda_concluida_e_cancelada_retorna_409) ... ok
test_reenviar_api_item_incompleto_retorna_erros_estruturados_por_campo (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_reenviar_api_item_incompleto_retorna_erros_estruturados_por_campo) ... ok
test_reenviar_api_item_status_incompativel_retorna_400 (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_reenviar_api_item_status_incompativel_retorna_400) ... ok
test_reenviar_item_devolvido_servico_rollback_falha_sincronizacao (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_reenviar_item_devolvido_servico_rollback_falha_sincronizacao) ... ok
test_reenviar_item_devolvido_servico_sucesso_e_repeticao (apps.api.tests.ItemDevolvidoRedServicoSerializerTests.test_reenviar_item_devolvido_servico_sucesso_e_repeticao) ... ok
test_ausencia_de_devolucao_retorna_ultima_devolucao_nula (apps.api.tests.ParecerQueriesRedTests.test_ausencia_de_devolucao_retorna_ultima_devolucao_nula) ... ok
test_detail_queries_estaveis_com_1_e_10_itens (apps.api.tests.ParecerQueriesRedTests.test_detail_queries_estaveis_com_1_e_10_itens) ... ok
test_list_queries_estaveis_com_1_e_10_demandas (apps.api.tests.ParecerQueriesRedTests.test_list_queries_estaveis_com_1_e_10_demandas) ... ok
test_ultima_devolucao_usa_acao_devolvido_ordenada_por_criado_em_e_id (apps.api.tests.ParecerQueriesRedTests.test_ultima_devolucao_usa_acao_devolvido_ordenada_por_criado_em_e_id) ... ok
test_validacoes_diferentes_de_devolvido_sao_ignoradas (apps.api.tests.ParecerQueriesRedTests.test_validacoes_diferentes_de_devolvido_sao_ignoradas) ... ok
test_server_side_envio_e_validacao (apps.api.tests.ServerSideIntegrationTests.test_server_side_envio_e_validacao) ... ok
test_server_side_item_reenviar (apps.api.tests.ServerSideIntegrationTests.test_server_side_item_reenviar) ... ok
test_server_side_item_reenviar_com_csrf_sucesso (apps.api.tests.ServerSideIntegrationTests.test_server_side_item_reenviar_com_csrf_sucesso) ... ok
test_server_side_item_reenviar_sem_csrf_rejeita (apps.api.tests.ServerSideIntegrationTests.test_server_side_item_reenviar_sem_csrf_rejeita) ... ok
test_matriz_macro_com_cancelados_e_terminais (apps.api.tests.SincronizacaoMacroRedMatrizTests.test_matriz_macro_com_cancelados_e_terminais) ... ok
test_alterar_demanda_concluida_rejeita (apps.api.tests.SincronizacaoMacroTests.test_alterar_demanda_concluida_rejeita) ... ok
test_cancelados_com_ativos_ignora_cancelados (apps.api.tests.SincronizacaoMacroTests.test_cancelados_com_ativos_ignora_cancelados) ... ok
test_demanda_cancelada_nao_reativa_com_sincronizacao (apps.api.tests.SincronizacaoMacroTests.test_demanda_cancelada_nao_reativa_com_sincronizacao) ... ok
test_demanda_sem_itens_eh_rascunho (apps.api.tests.SincronizacaoMacroTests.test_demanda_sem_itens_eh_rascunho) ... ok
test_idempotencia_da_sincronizacao (apps.api.tests.SincronizacaoMacroTests.test_idempotencia_da_sincronizacao) ... ok
test_itens_mistos_com_devolvido_eh_em_andamento (apps.api.tests.SincronizacaoMacroTests.test_itens_mistos_com_devolvido_eh_em_andamento) ... ok
test_patch_direto_nao_altera_status_da_demanda (apps.api.tests.SincronizacaoMacroTests.test_patch_direto_nao_altera_status_da_demanda) ... ok
test_patch_direto_nao_altera_status_do_item (apps.api.tests.SincronizacaoMacroTests.test_patch_direto_nao_altera_status_do_item) ... ok
test_todos_itens_aguardando_eh_aguardando_validacao (apps.api.tests.SincronizacaoMacroTests.test_todos_itens_aguardando_eh_aguardando_validacao) ... ok
test_todos_itens_cancelados_preserva_status_macro_anterior (apps.api.tests.SincronizacaoMacroTests.test_todos_itens_cancelados_preserva_status_macro_anterior) ... ok
test_todos_itens_rascunho_eh_rascunho (apps.api.tests.SincronizacaoMacroTests.test_todos_itens_rascunho_eh_rascunho) ... ok
test_todos_vinculados_eh_concluida (apps.api.tests.SincronizacaoMacroTests.test_todos_vinculados_eh_concluida) ... ok
test_devolver_com_comentario (apps.api.tests.ValidacaoTests.test_devolver_com_comentario) ... ok
test_devolver_exige_comentario (apps.api.tests.ValidacaoTests.test_devolver_exige_comentario) ... ok
test_listar_pendentes_exige_admin (apps.api.tests.ValidacaoTests.test_listar_pendentes_exige_admin) ... ok
test_listar_pendentes_retorna_itens_aguardando (apps.api.tests.ValidacaoTests.test_listar_pendentes_retorna_itens_aguardando) ... ok
test_reenviar_item_devolvido (apps.api.tests.ValidacaoTests.test_reenviar_item_devolvido) ... ok
test_validar_item (apps.api.tests.ValidacaoTests.test_validar_item) ... ok
test_admin_master_aprova_com_perfil_e_grupo_escolhidos (apps.api.tests_access_approval_contract.AccessApprovalContractTests.test_admin_master_aprova_com_perfil_e_grupo_escolhidos) ... ok
test_lista_de_solicitacoes_nao_expoe_hash_da_senha (apps.api.tests_access_approval_contract.AccessApprovalContractTests.test_lista_de_solicitacoes_nao_expoe_hash_da_senha) ... ok
test_admin_master_gerencia_catalogo_globalmente (apps.api.tests_autorizacao_escopo.CatalogoEscopoEscritaTests.test_admin_master_gerencia_catalogo_globalmente) ... ok
test_admin_nao_altera_move_desativa_ou_exclui_item_fora_do_escopo (apps.api.tests_autorizacao_escopo.CatalogoEscopoEscritaTests.test_admin_nao_altera_move_desativa_ou_exclui_item_fora_do_escopo) ... ok
test_admin_so_cria_no_grupo_explicitamente_administrado (apps.api.tests_autorizacao_escopo.CatalogoEscopoEscritaTests.test_admin_so_cria_no_grupo_explicitamente_administrado) ... ok
test_exclusao_de_catalogo_referenciado_retorna_conflito_orientado (apps.api.tests_autorizacao_escopo.CatalogoEscopoEscritaTests.test_exclusao_de_catalogo_referenciado_retorna_conflito_orientado) ... ok
test_admin_master_ve_indicadores_globais (apps.api.tests_autorizacao_escopo.DashboardEscopoTests.test_admin_master_ve_indicadores_globais) ... ok
test_admin_ve_grupos_administrados_mais_os_proprios_dados (apps.api.tests_autorizacao_escopo.DashboardEscopoTests.test_admin_ve_grupos_administrados_mais_os_proprios_dados) ... ok
test_usuario_ve_somente_indicadores_dos_proprios_dados (apps.api.tests_autorizacao_escopo.DashboardEscopoTests.test_usuario_ve_somente_indicadores_dos_proprios_dados) ... ok
test_admin_lista_proprias_e_demandas_com_ao_menos_um_item_do_seu_grupo (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_lista_proprias_e_demandas_com_ao_menos_um_item_do_seu_grupo) ... ok
test_admin_master_lista_e_detalha_todas_as_demandas (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_master_lista_e_detalha_todas_as_demandas) ... ok
test_admin_nao_cancela_demanda_mista_com_itens_fora_do_escopo (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_nao_cancela_demanda_mista_com_itens_fora_do_escopo) ... ok
test_admin_nao_cancela_demanda_totalmente_fora_do_escopo (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_nao_cancela_demanda_totalmente_fora_do_escopo) ... ok
test_admin_pode_cancelar_demanda_composta_so_por_seu_grupo (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_pode_cancelar_demanda_composta_so_por_seu_grupo) ... ok
test_admin_sem_grupo_nao_herda_escopo_da_unidade_para_demanda_manual (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_admin_sem_grupo_nao_herda_escopo_da_unidade_para_demanda_manual) ... ok
test_usuario_comum_lista_e_detalha_somente_as_proprias_demandas (apps.api.tests_autorizacao_escopo.DemandaEscopoAdministrativoTests.test_usuario_comum_lista_e_detalha_somente_as_proprias_demandas) ... ok
test_exclusao_de_grupo_referenciado_retorna_conflito_orientado (apps.api.tests_autorizacao_escopo.RecursosReferenciaAutorizacaoTests.test_exclusao_de_grupo_referenciado_retorna_conflito_orientado) ... ok
test_exclusao_de_unidade_referenciada_retorna_conflito_orientado (apps.api.tests_autorizacao_escopo.RecursosReferenciaAutorizacaoTests.test_exclusao_de_unidade_referenciada_retorna_conflito_orientado) ... ok
test_grupo_tem_leitura_autenticada_e_escrita_exclusiva_do_master (apps.api.tests_autorizacao_escopo.RecursosReferenciaAutorizacaoTests.test_grupo_tem_leitura_autenticada_e_escrita_exclusiva_do_master) ... ok
test_unidade_tem_leitura_autenticada_e_escrita_exclusiva_do_master (apps.api.tests_autorizacao_escopo.RecursosReferenciaAutorizacaoTests.test_unidade_tem_leitura_autenticada_e_escrita_exclusiva_do_master) ... ok
test_filter_by_status (apps.api.tests_demandas_filters.DemandaFiltersTestCase.test_filter_by_status) ... ok
test_filter_by_valor_min (apps.api.tests_demandas_filters.DemandaFiltersTestCase.test_filter_by_valor_min) ... ok
test_search_by_observacao (apps.api.tests_demandas_filters.DemandaFiltersTestCase.test_search_by_observacao) ... ok
test_admin_de_outro_grupo_nao_recebe_nem_decide_item_tic (apps.api.tests_fluxo_usuario_admin.FluxoUsuarioAdminValidacaoTests.test_admin_de_outro_grupo_nao_recebe_nem_decide_item_tic) ... ok
test_item_enviado_aparece_somente_para_admin_do_grupo_e_pode_ser_validado (apps.api.tests_fluxo_usuario_admin.FluxoUsuarioAdminValidacaoTests.test_item_enviado_aparece_somente_para_admin_do_grupo_e_pode_ser_validado) ... ok
test_item_manual_nao_e_roteado_por_mera_coincidencia_de_unidade (apps.api.tests_fluxo_usuario_admin.FluxoUsuarioAdminValidacaoTests.test_item_manual_nao_e_roteado_por_mera_coincidencia_de_unidade) ... ok
test_admin_master_nao_pode_excluir_a_si_mesmo (apps.api.tests_gestao_contas.GestaoContasTestCase.test_admin_master_nao_pode_excluir_a_si_mesmo) ... ok
test_admin_solicitacoes_list_e_filtros (apps.api.tests_gestao_contas.GestaoContasTestCase.test_admin_solicitacoes_list_e_filtros) ... ok
test_admin_usuarios_list_e_filtros (apps.api.tests_gestao_contas.GestaoContasTestCase.test_admin_usuarios_list_e_filtros) ... ok
test_aprovar_solicitacao (apps.api.tests_gestao_contas.GestaoContasTestCase.test_aprovar_solicitacao) ... ok
test_aprovar_solicitacao_ja_processada_rejeita (apps.api.tests_gestao_contas.GestaoContasTestCase.test_aprovar_solicitacao_ja_processada_rejeita) ... ok
test_ativar_e_desativar_usuario_comum (apps.api.tests_gestao_contas.GestaoContasTestCase.test_ativar_e_desativar_usuario_comum) ... ok
test_auth_me_e_logout (apps.api.tests_gestao_contas.GestaoContasTestCase.test_auth_me_e_logout) ... ok
test_autorizacao_acesso_admin (apps.api.tests_gestao_contas.GestaoContasTestCase.test_autorizacao_acesso_admin) ... ok
test_criar_usuario_admin (apps.api.tests_gestao_contas.GestaoContasTestCase.test_criar_usuario_admin) ... ok
test_criar_usuario_admin_master_e_usuario_comum (apps.api.tests_gestao_contas.GestaoContasTestCase.test_criar_usuario_admin_master_e_usuario_comum) ... ok
test_criar_usuario_admin_sem_grupo_rejeitado_fail_closed (apps.api.tests_gestao_contas.GestaoContasTestCase.test_criar_usuario_admin_sem_grupo_rejeitado_fail_closed) ... ok
test_criar_usuario_com_email_existente_rejeitado (apps.api.tests_gestao_contas.GestaoContasTestCase.test_criar_usuario_com_email_existente_rejeitado) ... ok
test_criar_usuario_perfil_invalido_rejeitado (apps.api.tests_gestao_contas.GestaoContasTestCase.test_criar_usuario_perfil_invalido_rejeitado) ... ok
test_deduplicacao_de_username_colisao_slug (apps.api.tests_gestao_contas.GestaoContasTestCase.test_deduplicacao_de_username_colisao_slug) ... ok
test_duplicidade_solicitacao_pendente (apps.api.tests_gestao_contas.GestaoContasTestCase.test_duplicidade_solicitacao_pendente) ... ok
test_excluir_usuario_com_demandas_vinculadas_retorna_400_com_orientacao (apps.api.tests_gestao_contas.GestaoContasTestCase.test_excluir_usuario_com_demandas_vinculadas_retorna_400_com_orientacao) ... ok
test_excluir_usuario_comum_com_sucesso (apps.api.tests_gestao_contas.GestaoContasTestCase.test_excluir_usuario_comum_com_sucesso) ... ok
test_excluir_usuario_inexistente_retorna_404 (apps.api.tests_gestao_contas.GestaoContasTestCase.test_excluir_usuario_inexistente_retorna_404) ... ok
test_fluxo_completo_solicitacao_aprovacao_e_login_com_email (apps.api.tests_gestao_contas.GestaoContasTestCase.test_fluxo_completo_solicitacao_aprovacao_e_login_com_email) ... ok
test_login_com_email_case_insensitive (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_com_email_case_insensitive) ... ok
test_login_com_payload_campo_email (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_com_payload_campo_email) ... ok
test_login_com_username_e_senha (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_com_username_e_senha) ... ok
test_login_sem_credenciais_retorna_400 (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_sem_credenciais_retorna_400) ... ok
test_login_senha_incorreta_retorna_401 (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_senha_incorreta_retorna_401) ... ok
test_login_usuario_criado_via_admin_com_email_e_username (apps.api.tests_gestao_contas.GestaoContasTestCase.test_login_usuario_criado_via_admin_com_email_e_username) ... ok
test_nao_pode_excluir_unico_admin_master (apps.api.tests_gestao_contas.GestaoContasTestCase.test_nao_pode_excluir_unico_admin_master) ... ok
test_protecao_desativar_ultimo_admin_master (apps.api.tests_gestao_contas.GestaoContasTestCase.test_protecao_desativar_ultimo_admin_master) ... ok
test_rejeitar_solicitacao (apps.api.tests_gestao_contas.GestaoContasTestCase.test_rejeitar_solicitacao) ... ok
test_solicitar_acesso_com_email_usuario_existente_rejeitada (apps.api.tests_gestao_contas.GestaoContasTestCase.test_solicitar_acesso_com_email_usuario_existente_rejeitada) ... ok
test_solicitar_acesso_dominio_invalido (apps.api.tests_gestao_contas.GestaoContasTestCase.test_solicitar_acesso_dominio_invalido) ... ok
test_solicitar_acesso_valido (apps.api.tests_gestao_contas.GestaoContasTestCase.test_solicitar_acesso_valido) ... ok
test_usuario_comum_nao_pode_criar_usuario_admin (apps.api.tests_gestao_contas.GestaoContasTestCase.test_usuario_comum_nao_pode_criar_usuario_admin) ... ok
test_usuario_comum_nao_pode_excluir_usuario (apps.api.tests_gestao_contas.GestaoContasTestCase.test_usuario_comum_nao_pode_excluir_usuario) ... ok
test_verificacao_integridade_hash_senha_sem_double_hashing (apps.api.tests_gestao_contas.GestaoContasTestCase.test_verificacao_integridade_hash_senha_sem_double_hashing) ... ok
test_item_catalogado_aceita_payload_minimo_e_herda_dados (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_item_catalogado_aceita_payload_minimo_e_herda_dados) ... ok
test_item_catalogado_duplicado_na_mesma_demanda_e_rejeitado (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_item_catalogado_duplicado_na_mesma_demanda_e_rejeitado) ... ok
test_item_catalogado_inativo_e_rejeitado (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_item_catalogado_inativo_e_rejeitado) ... ok
test_item_catalogado_mantem_payload_antigo_mas_ignora_campos_herdados (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_item_catalogado_mantem_payload_antigo_mas_ignora_campos_herdados) ... ok
test_mesmo_catalogo_pode_ser_usado_em_demandas_diferentes (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_mesmo_catalogo_pode_ser_usado_em_demandas_diferentes) ... ok
test_prioridade_alta_exige_justificativa (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_prioridade_alta_exige_justificativa) ... ok
test_prioridades_baixa_e_media_aceitam_justificativa_vazia (apps.api.tests_item_rules.ItemDemandaApiRulesTests.test_prioridades_baixa_e_media_aceitam_justificativa_vazia) ... ok
test_constraint_impede_catalogo_duplicado_na_mesma_demanda (apps.api.tests_item_rules.ItemDemandaModelRulesTests.test_constraint_impede_catalogo_duplicado_na_mesma_demanda) ... ok
test_status_usa_choices_especificos_de_item (apps.api.tests_item_rules.ItemDemandaModelRulesTests.test_status_usa_choices_especificos_de_item) ... ok
test_admin_master_recebe_escopo_global_sem_expor_outro_usuario (apps.api.tests_me.UsuarioAutenticadoViewTests.test_admin_master_recebe_escopo_global_sem_expor_outro_usuario) ... ok
test_admin_sem_grupo_nao_herda_grupos_da_unidade (apps.api.tests_me.UsuarioAutenticadoViewTests.test_admin_sem_grupo_nao_herda_grupos_da_unidade) ... ok
test_rejeita_usuario_nao_autenticado (apps.api.tests_me.UsuarioAutenticadoViewTests.test_rejeita_usuario_nao_autenticado) ... ok
test_retorna_apenas_os_dados_do_usuario_autenticado (apps.api.tests_me.UsuarioAutenticadoViewTests.test_retorna_apenas_os_dados_do_usuario_autenticado) ... ok
test_retorna_contexto_de_autorizacao_do_admin_baseado_em_grupo_explicito (apps.api.tests_me.UsuarioAutenticadoViewTests.test_retorna_contexto_de_autorizacao_do_admin_baseado_em_grupo_explicito) ... ok
test_usuario_comum_nao_recebe_grupos_administrados (apps.api.tests_me.UsuarioAutenticadoViewTests.test_usuario_comum_nao_recebe_grupos_administrados) ... ok
test_admin_can_validate_their_own_item_in_mixed_demand (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_can_validate_their_own_item_in_mixed_demand) ... ERROR
test_admin_cannot_access_other_group_item_directly (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_cannot_access_other_group_item_directly) ... ERROR
test_admin_sees_mixed_demand_but_only_their_items (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_sees_mixed_demand_but_only_their_items) ... ERROR
test_dashboard_mantem_agregacoes_em_orcamento_constante (apps.api.tests_performance_realistic.LeiturasComMassaRealistaPerformanceTests.test_dashboard_mantem_agregacoes_em_orcamento_constante) ... ok
test_elegiveis_agrupa_60_itens_sem_n_mais_um (apps.api.tests_performance_realistic.LeiturasComMassaRealistaPerformanceTests.test_elegiveis_agrupa_60_itens_sem_n_mais_um) ... ok
test_fila_pendente_serializa_60_itens_sem_n_mais_um (apps.api.tests_performance_realistic.LeiturasComMassaRealistaPerformanceTests.test_fila_pendente_serializa_60_itens_sem_n_mais_um) ... ok
test_admin_de_outro_grupo_nao_consegue_decidir_item (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_de_outro_grupo_nao_consegue_decidir_item) ... ok
test_admin_de_outro_grupo_recebe_404_ao_consultar_validacao_por_id (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_de_outro_grupo_recebe_404_ao_consultar_validacao_por_id) ... ok
test_admin_do_grupo_consegue_decidir_item (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_do_grupo_consegue_decidir_item) ... ok
test_admin_lista_apenas_itens_do_grupo_explicitamente_administrado (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_lista_apenas_itens_do_grupo_explicitamente_administrado) ... ok
test_admin_lista_historico_de_validacoes_apenas_do_proprio_grupo (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_lista_historico_de_validacoes_apenas_do_proprio_grupo) ... ok
test_admin_master_lista_todos_inclusive_item_manual (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_admin_master_lista_todos_inclusive_item_manual) ... ok
test_devolucao_rejeita_comentario_composto_so_por_espacos (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_devolucao_rejeita_comentario_composto_so_por_espacos) ... ok
test_fila_omite_demanda_nao_enviada_ou_com_status_inconsistente (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_fila_omite_demanda_nao_enviada_ou_com_status_inconsistente) ... ok
test_filtro_com_id_invalido_retorna_400 (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_filtro_com_id_invalido_retorna_400) ... ok
test_item_manual_pode_ser_decidido_por_admin_da_unidade_solicitante (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_item_manual_pode_ser_decidido_por_admin_da_unidade_solicitante) ... ok
test_pendente_preserva_campos_do_item_e_inclui_contexto_para_agrupamento (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_pendente_preserva_campos_do_item_e_inclui_contexto_para_agrupamento) ... ok
test_pendentes_aceita_filtros_de_unidade_e_grupo_sem_ampliar_escopo (apps.api.tests_validacoes_scope.ValidacaoEscopoTests.test_pendentes_aceita_filtros_de_unidade_e_grupo_sem_ampliar_escopo) ... ok
test_admin_com_grupo_explicito_sem_unidade_acessa_item_por_id (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_com_grupo_explicito_sem_unidade_acessa_item_por_id) ... ok
test_admin_com_grupo_explicito_sem_unidade_lista_e_decide (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_com_grupo_explicito_sem_unidade_lista_e_decide) ... ok
test_admin_errado_nao_ve_fila_nem_acessa_ou_decide_por_id (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_errado_nao_ve_fila_nem_acessa_ou_decide_por_id) ... ok
test_admin_master_ve_todos_os_grupos_e_processa_sem_ampliar_patch (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_master_ve_todos_os_grupos_e_processa_sem_ampliar_patch) ... ok
test_admin_sem_grupo_falha_fechado_em_get_e_decisao_diretos (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_sem_grupo_falha_fechado_em_get_e_decisao_diretos) ... ok
test_admin_sem_grupo_falha_fechado_na_fila_mesmo_com_unidade (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_admin_sem_grupo_falha_fechado_na_fila_mesmo_com_unidade) ... ok
test_cancelamento_rejeita_demanda_parcialmente_vinculada_a_dfd (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_cancelamento_rejeita_demanda_parcialmente_vinculada_a_dfd) ... ok
test_decisao_direta_rejeita_demanda_nao_enviada (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_decisao_direta_rejeita_demanda_nao_enviada) ... ok
test_demanda_a_b_a_percorre_devolucao_reenvio_e_dois_dfds (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_demanda_a_b_a_percorre_devolucao_reenvio_e_dois_dfds) ... ok
test_fluxo_usuario_item_catalogado_chega_ao_admin_correto (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_fluxo_usuario_item_catalogado_chega_ao_admin_correto) ... ok
test_grupo_inativo_nao_autoriza_item_manual_da_mesma_unidade (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_grupo_inativo_nao_autoriza_item_manual_da_mesma_unidade) ... ok
test_multiplos_itens_do_mesmo_grupo_entram_e_saem_da_fila (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_multiplos_itens_do_mesmo_grupo_entram_e_saem_da_fila) ... ok
test_rascunho_e_invisivel_ao_admin_responsavel_inclusive_por_id (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_rascunho_e_invisivel_ao_admin_responsavel_inclusive_por_id) ... ok
test_requisitantes_ficam_isolados_em_get_patch_e_decisao_diretos (apps.api.tests_workflow_rbac_regression.WorkflowRbacRegressionTests.test_requisitantes_ficam_isolados_em_get_patch_e_decisao_diretos) ... ok
test_colisao_de_dfd_reservado_e_recusada_atomicamente (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_colisao_de_dfd_reservado_e_recusada_atomicamente) ... ok
test_cria_volume_personas_e_itens_coerentes (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_cria_volume_personas_e_itens_coerentes) ... ok
test_exige_senha_externa_sem_gravar_dados (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_exige_senha_externa_sem_gravar_dados) ... ok
test_nao_altera_unidade_nem_ciclo_institucional_real (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_nao_altera_unidade_nem_ciclo_institucional_real) ... ok
test_recusa_ciclo_2099_com_dados_alheios_sem_efeitos_parciais (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_recusa_ciclo_2099_com_dados_alheios_sem_efeitos_parciais) ... ok
test_reexecucao_preserva_ids_contagens_historicos_dfds_e_senha (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_reexecucao_preserva_ids_contagens_historicos_dfds_e_senha) ... ok
test_reexecucao_preserva_registros_humanos_e_reconcilia_dfds_seed (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_reexecucao_preserva_registros_humanos_e_reconcilia_dfds_seed) ... ok
test_representa_estados_historicos_e_consolidacoes (apps.core.tests_seed_homologacao.SeedHomologacaoTests.test_representa_estados_historicos_e_consolidacoes) ... ok
test_admin_de_outro_grupo_nao_lista_nem_consolida (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_admin_de_outro_grupo_nao_lista_nem_consolida) ... ok
test_consolidacao_cria_vincula_audita_e_reutiliza_dfd (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_consolidacao_cria_vincula_audita_e_reutiliza_dfd) ... ok
test_endpoint_de_ciclos_retorna_apenas_ciclos_com_itens_elegiveis (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_endpoint_de_ciclos_retorna_apenas_ciclos_com_itens_elegiveis) ... ok
test_filtro_invalido_retorna_400_em_vez_de_erro_interno (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_filtro_invalido_retorna_400_em_vez_de_erro_interno) ... ok
test_item_manual_e_omitido_e_rejeitado_sem_erro_500 (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_item_manual_e_omitido_e_rejeitado_sem_erro_500) ... ok
test_lista_agrupada_omite_nao_elegiveis_e_retorna_unidade (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_lista_agrupada_omite_nao_elegiveis_e_retorna_unidade) ... ok
test_lista_expoe_ciclo_grupo_unidades_e_solicitantes (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_lista_expoe_ciclo_grupo_unidades_e_solicitantes) ... ok
test_lista_separa_mesmo_item_por_ciclo_e_permite_filtrar (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_lista_separa_mesmo_item_por_ciclo_e_permite_filtrar) ... ok
test_usuario_comum_nao_consolida (apps.dfd.tests_consolidacao.ConsolidacaoAPITests.test_usuario_comum_nao_consolida) ... ok
test_autentica_com_email_case_insensitive (apps.usuarios.tests.AutenticacaoEmailOuUsernameTests.test_autentica_com_email_case_insensitive) ... ok
test_autentica_com_sucesso_usando_email (apps.usuarios.tests.AutenticacaoEmailOuUsernameTests.test_autentica_com_sucesso_usando_email) ... ok
test_autentica_com_sucesso_usando_username (apps.usuarios.tests.AutenticacaoEmailOuUsernameTests.test_autentica_com_sucesso_usando_username) ... ok
test_rejeita_senha_incorreta (apps.usuarios.tests.AutenticacaoEmailOuUsernameTests.test_rejeita_senha_incorreta) ... ok
test_autenticacao_falha_ambos_retorna_none (apps.usuarios.tests.SipacAuthBackendTests.test_autenticacao_falha_ambos_retorna_none) ... ok
test_autenticacao_sem_credenciais_retorna_none (apps.usuarios.tests.SipacAuthBackendTests.test_autenticacao_sem_credenciais_retorna_none) ... ok
test_autenticacao_sipac_falha_faz_fallback_para_local (apps.usuarios.tests.SipacAuthBackendTests.test_autenticacao_sipac_falha_faz_fallback_para_local) ... ok
test_autenticacao_sipac_sucesso_atualiza_usuario_existente (apps.usuarios.tests.SipacAuthBackendTests.test_autenticacao_sipac_sucesso_atualiza_usuario_existente) ... ok
test_autenticacao_sipac_sucesso_provisiona_usuario_novo (apps.usuarios.tests.SipacAuthBackendTests.test_autenticacao_sipac_sucesso_provisiona_usuario_novo) ... ok
test_fallback_local_com_sipac_desabilitado (apps.usuarios.tests.SipacAuthBackendTests.test_fallback_local_com_sipac_desabilitado) ... ok
test_autenticar_e_obter_dados_falha_http (apps.usuarios.tests.SipacClientTests.test_autenticar_e_obter_dados_falha_http) ... Falha na autenticação via SIPAC para 'joao.silva': HTTP Error 401: Unauthorized
ok
test_autenticar_e_obter_dados_sucesso (apps.usuarios.tests.SipacClientTests.test_autenticar_e_obter_dados_sucesso) ... ok
test_autenticar_sem_dados (apps.usuarios.tests.SipacClientTests.test_autenticar_sem_dados) ... ok
test_init_defaults (apps.usuarios.tests.SipacClientTests.test_init_defaults) ... ok
test_sincronizar_unidade_existente_atualiza (apps.usuarios.tests.SipacClientTests.test_sincronizar_unidade_existente_atualiza) ... ok
test_sincronizar_unidade_nova (apps.usuarios.tests.SipacClientTests.test_sincronizar_unidade_nova) ... ok
test_sincronizar_unidade_sem_codigo (apps.usuarios.tests.SipacClientTests.test_sincronizar_unidade_sem_codigo) ... ok
test_ativacao_legada_exige_post_e_admin_master (apps.usuarios.tests.UsuariosLegacyAccessControlTests.test_ativacao_legada_exige_post_e_admin_master) ... ok
test_lista_legada_exige_admin_master (apps.usuarios.tests.UsuariosLegacyAccessControlTests.test_lista_legada_exige_admin_master) ... ok
test_alias_desconhecido_falha_sem_tentar_conectar (apps.core.tests_seed_safety.SeedSafetyFingerprintTests.test_alias_desconhecido_falha_sem_tentar_conectar) ... ok
test_configuracao_incompleta_falha_fechada (apps.core.tests_seed_safety.SeedSafetyFingerprintTests.test_configuracao_incompleta_falha_fechada) ... /opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/test/utils.py:453: UserWarning: Overriding setting DATABASES can lead to unexpected behavior.
  with self as context:
ok
test_fingerprint_ignora_credenciais_mas_identifica_o_alvo (apps.core.tests_seed_safety.SeedSafetyFingerprintTests.test_fingerprint_ignora_credenciais_mas_identifica_o_alvo) ... ok
test_inspecao_classifica_host_nao_loopback_como_remoto (apps.core.tests_seed_safety.SeedSafetyFingerprintTests.test_inspecao_classifica_host_nao_loopback_como_remoto) ... ok
test_inspecao_e_check_sao_locais_e_nao_expoem_configuracao (apps.core.tests_seed_safety.SeedSafetyFingerprintTests.test_inspecao_e_check_sao_locais_e_nao_expoem_configuracao) ... ok
test_relatorio_tem_campos_fixos_e_omite_segredos (apps.core.tests_seed_safety.SeedSafetyReportTests.test_relatorio_tem_campos_fixos_e_omite_segredos) ... ok
test_autoriza_alvo_local_com_todas_as_travas (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_autoriza_alvo_local_com_todas_as_travas) ... ok
test_autoriza_banco_remoto_presente_na_allowlist (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_autoriza_banco_remoto_presente_na_allowlist) ... ok
test_exige_apply_e_confirmacao_exata (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_exige_apply_e_confirmacao_exata) ... ok
test_opt_in_textual_nao_contorna_a_validacao_fail_closed (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_opt_in_textual_nao_contorna_a_validacao_fail_closed) ... ok
test_recusa_ambiente_ausente (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_recusa_ambiente_ausente) ... ok
test_recusa_banco_remoto_fora_da_allowlist (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_recusa_banco_remoto_fora_da_allowlist) ... ok
test_recusa_producao_mesmo_com_opt_in_e_confirmacao (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_recusa_producao_mesmo_com_opt_in_e_confirmacao) ... ok
test_recusa_sem_opt_in (apps.core.tests_seed_safety.SeedSafetyValidationTests.test_recusa_sem_opt_in) ... ok
test_select_for_update_bloqueia_outra_conexao (apps.demandas.tests_concurrency.DemandaSelectForUpdateConcurrencyTests.test_select_for_update_bloqueia_outra_conexao) ... ok

======================================================================
ERROR: test_admin_can_validate_their_own_item_in_mixed_demand (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_can_validate_their_own_item_in_mixed_demand)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
psycopg.errors.UniqueViolation: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/runner/work/projeto-PAC/projeto-PAC/backend/apps/api/tests_mixed_demand_isolation.py", line 38, in setUp
    self.admin_a = Usuario.objects.create_user(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 175, in create_user
    return self._create_user(username, email, password, **extra_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 163, in _create_user
    user.save(using=self._db)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/base_user.py", line 65, in save
    super().save(*args, **kwargs)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 902, in save
    self.save_base(
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1008, in save_base
    updated = self._save_table(
              ^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1169, in _save_table
    results = self._do_insert(
              ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1210, in _do_insert
    return manager._insert(
           ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/manager.py", line 87, in manager_method
    return getattr(self.get_queryset(), name)(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/query.py", line 1873, in _insert
    return query.get_compiler(using=using).execute_sql(returning_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/sql/compiler.py", line 1882, in execute_sql
    cursor.execute(sql, params)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 79, in execute
    return self._execute_with_wrappers(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 92, in _execute_with_wrappers
    return executor(sql, params, many, context)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 100, in _execute
    with self.db.wrap_database_errors:
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/utils.py", line 91, in __exit__
    raise dj_exc_value.with_traceback(traceback) from exc_value
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
django.db.utils.IntegrityError: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

======================================================================
ERROR: test_admin_cannot_access_other_group_item_directly (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_cannot_access_other_group_item_directly)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
psycopg.errors.UniqueViolation: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/runner/work/projeto-PAC/projeto-PAC/backend/apps/api/tests_mixed_demand_isolation.py", line 38, in setUp
    self.admin_a = Usuario.objects.create_user(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 175, in create_user
    return self._create_user(username, email, password, **extra_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 163, in _create_user
    user.save(using=self._db)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/base_user.py", line 65, in save
    super().save(*args, **kwargs)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 902, in save
    self.save_base(
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1008, in save_base
    updated = self._save_table(
              ^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1169, in _save_table
    results = self._do_insert(
              ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1210, in _do_insert
    return manager._insert(
           ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/manager.py", line 87, in manager_method
    return getattr(self.get_queryset(), name)(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/query.py", line 1873, in _insert
    return query.get_compiler(using=using).execute_sql(returning_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/sql/compiler.py", line 1882, in execute_sql
    cursor.execute(sql, params)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 79, in execute
    return self._execute_with_wrappers(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 92, in _execute_with_wrappers
    return executor(sql, params, many, context)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 100, in _execute
    with self.db.wrap_database_errors:
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/utils.py", line 91, in __exit__
    raise dj_exc_value.with_traceback(traceback) from exc_value
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
django.db.utils.IntegrityError: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

======================================================================
ERROR: test_admin_sees_mixed_demand_but_only_their_items (apps.api.tests_mixed_demand_isolation.MixedDemandIsolationTests.test_admin_sees_mixed_demand_but_only_their_items)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
psycopg.errors.UniqueViolation: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

The above exception was the direct cause of the following exception:

Traceback (most recent call last):
  File "/home/runner/work/projeto-PAC/projeto-PAC/backend/apps/api/tests_mixed_demand_isolation.py", line 38, in setUp
    self.admin_a = Usuario.objects.create_user(
                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 175, in create_user
    return self._create_user(username, email, password, **extra_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/models.py", line 163, in _create_user
    user.save(using=self._db)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/contrib/auth/base_user.py", line 65, in save
    super().save(*args, **kwargs)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 902, in save
    self.save_base(
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1008, in save_base
    updated = self._save_table(
              ^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1169, in _save_table
    results = self._do_insert(
              ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/base.py", line 1210, in _do_insert
    return manager._insert(
           ^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/manager.py", line 87, in manager_method
    return getattr(self.get_queryset(), name)(*args, **kwargs)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/query.py", line 1873, in _insert
    return query.get_compiler(using=using).execute_sql(returning_fields)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/models/sql/compiler.py", line 1882, in execute_sql
    cursor.execute(sql, params)
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 79, in execute
    return self._execute_with_wrappers(
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 92, in _execute_with_wrappers
    return executor(sql, params, many, context)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 100, in _execute
    with self.db.wrap_database_errors:
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/utils.py", line 91, in __exit__
    raise dj_exc_value.with_traceback(traceback) from exc_value
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/django/db/backends/utils.py", line 105, in _execute
    return self.cursor.execute(sql, params)
           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/hostedtoolcache/Python/3.11.16/x64/lib/python3.11/site-packages/psycopg/cursor.py", line 97, in execute
    raise ex.with_traceback(None)
django.db.utils.IntegrityError: duplicate key value violates unique constraint "usuarios_usuario_email_key"
DETAIL:  Key (email)=() already exists.

----------------------------------------------------------------------
Ran 248 tests in 166.387s

FAILED (errors=3)
Destroying test database for alias 'default' ('test_pac_db')...
Error: Process completed with exit code 1.

Erros no CI/CD
