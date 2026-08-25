import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Badge, Button, Card, EmptyState, Input, LoadingState, NextAction, Table } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { getDemandNextAction } from "../utils/nextActions";
import { useDebounce } from "../hooks/useDebounce";

function resultsFrom(data) {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.results) ? data.results : [];
}

const newDemandLink = (
  <Link to="/demandas/nova" className="pac-button pac-button--primary">
    <i className="bi bi-plus-lg" aria-hidden="true" />
    Nova demanda
  </Link>
);

export default function DemandaList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [demandas, setDemandas] = useState([]);
  const [count, setCount] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  const currentSearch = searchParams.get("search") || "";
  const currentStatus = searchParams.get("status") || "todas";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [localSearch, setLocalSearch] = useState(currentSearch);
  const debouncedSearch = useDebounce(localSearch, 400);

  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        if (debouncedSearch) {
          newParams.set("search", debouncedSearch);
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1");
        return newParams;
      });
    }
  }, [debouncedSearch, currentSearch, setSearchParams]);

  useEffect(() => {
    let montado = true;
    const controller = new AbortController();

    setCarregando(true);
    setErro(null);

    const query = { page: currentPage, proprias: true };
    if (currentSearch) query.search = currentSearch;
    if (currentStatus !== "todas") query.status = currentStatus;

    api
      .listDemandas(query, { signal: controller.signal })
      .then((data) => {
        if (montado) {
          setDemandas(resultsFrom(data));
          setCount(data?.count ?? resultsFrom(data).length);
        }
      })
      .catch((error) => {
        if (!montado) return;
        if (error.code === "REQUEST_ABORTED") return;
        setDemandas([]);
        setErro(error);
      })
      .finally(() => {
        if (montado) setCarregando(false);
      });

    return () => {
      montado = false;
      controller.abort();
    };
  }, [currentSearch, currentStatus, currentPage, tentativa]);

  const statusOptions = [
    { value: "todas", label: "Todas" },
    { value: "rascunho", label: "Rascunhos" },
    { value: "aguardando_validacao", label: "Aguardando validacao" },
    { value: "devolvida", label: "Devolvidas" },
    { value: "concluida", label: "Concluidas" },
  ];

  const filtrosAplicados = Boolean(currentSearch || (currentStatus !== "todas"));

  function limparFiltros() {
    setLocalSearch("");
    setSearchParams(new URLSearchParams());
  }

  function handleStatusChange(status) {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (status === "todas") {
        newParams.delete("status");
      } else {
        newParams.set("status", status);
      }
      newParams.set("page", "1");
      return newParams;
    });
  }

  const totalPages = Math.ceil(count / 20);

  return (
    <div>
      <PageHeader
        eyebrow="Planejamento e contratacoes"
        title="Minhas demandas"
        description="Acompanhe a situacao das suas solicitacoes e veja a proxima acao de cada uma."
        actions={newDemandLink}
      />

      <Card className="mb-4">
        <div className="d-flex flex-column gap-3">
          <div className="row g-3 align-items-center">
            <div className="col-12 col-md-6">
              <Input
                id="busca-demandas"
                label={
                  <span>
                    <i className="bi bi-search me-1" aria-hidden="true" />
                    Buscar demandas
                  </span>
                }
                type="search"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Buscar por ID, ano ou observacao..."
              />
            </div>
          </div>

          <div
            className="d-flex flex-wrap gap-2 align-items-center"
            role="tablist"
            aria-label="Filtro de demandas por status"
          >
            {statusOptions.map((opt) => {
              const isSelected = currentStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  className={"pac-button pac-button--sm "}
                  onClick={() => handleStatusChange(opt.value)}
                >
                  <span>{opt.label}</span>
                </button>
              );
            })}

            {filtrosAplicados && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limparFiltros}
                className="ms-auto"
              >
                <i className="bi bi-x-circle" aria-hidden="true" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>
      </Card>

      {erro ? (
        <ApiErrorMessage
          error={erro}
          title="Nao foi possivel carregar suas demandas"
          onRetry={() => setTentativa((valor) => valor + 1)}
        />
      ) : carregando ? (
        <LoadingState label="Carregando suas demandas..." />
      ) : demandas.length === 0 ? (
        <EmptyState
          icon={filtrosAplicados ? "bi-search" : "bi-file-earmark-plus"}
          title={filtrosAplicados ? "Nenhuma demanda encontrada" : "Nenhuma demanda cadastrada"}
          description={filtrosAplicados ? "Tente ajustar os termos de busca ou remover os filtros aplicados." : "Crie uma demanda para comecar a registrar os itens necessarios."}
          action={(
            filtrosAplicados ? (
              <Button variant="secondary" onClick={limparFiltros}>
                <i className="bi bi-x-circle" aria-hidden="true" />
                Limpar filtros
              </Button>
            ) : (
              <Link to="/demandas/nova" className="pac-button pac-button--primary">
                <i className="bi bi-plus-lg" aria-hidden="true" />
                Criar primeira demanda
              </Link>
            )
          )}
        />
      ) : (
        <>
          {filtrosAplicados && (
            <div className="d-flex justify-content-between align-items-center mb-3" aria-live="polite">
              <span className="text-muted small">
                Exibindo {demandas.length} de {count} {count === 1 ? "demanda filtrada" : "demandas filtradas"}
              </span>
            </div>
          )}
          <Table caption="Demandas cadastradas pelo usuario">
            <thead>
              <tr>
                <th scope="col">Demanda</th>
                <th scope="col">Unidade</th>
                <th scope="col">Ano</th>
                <th scope="col">Status</th>
                <th scope="col">Valor total</th>
                <th scope="col">Proxima acao</th>
                <th scope="col" className="text-end">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {demandas.map((demanda) => {
                const nextAction = getDemandNextAction(demanda);
                return (
                  <tr key={demanda.id} className="pac-table__row-link">
                    <td className="fw-semibold">
                      <Link to={`/demandas/${demanda.id}`}>
                        #{demanda.id}
                      </Link>
                    </td>
                    <td>{demanda.unidade_nome || demanda.unidade_sigla || "-"}</td>
                    <td>{demanda.ano_referencia}</td>
                    <td>
                      <StatusBadge status={demanda.status} />
                    </td>
                    <td>{formatCurrency(demanda.valor_total)}</td>
                    <td><NextAction action={nextAction} compact /></td>
                    <td className="text-end">
                      <Link
                        to={`/demandas/${demanda.id}`}
                        className="pac-button pac-button--secondary pac-button--sm"
                        aria-label={`Acompanhar demanda ${demanda.id}`}
                      >
                        Acompanhar
                        <i className="bi bi-chevron-right" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-4">
              <span className="text-muted small">
                Pagina {currentPage} de {totalPages}
              </span>
              <div className="d-flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.set("page", currentPage - 1);
                    return p;
                  })}
                >
                  Anterior
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    p.set("page", currentPage + 1);
                    return p;
                  })}
                >
                  Proxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

