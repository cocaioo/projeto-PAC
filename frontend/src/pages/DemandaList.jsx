import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { Badge, Button, Card, EmptyState, Input, LoadingState, NextAction, Table } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { getDemandNextAction, hasReturnedItems } from "../utils/nextActions";

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
  const [demandas, setDemandas] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let montado = true;

    setCarregando(true);
    setErro(null);
    api
      .listDemandas({ proprias: true })
      .then((data) => {
        if (montado) setDemandas(resultsFrom(data));
      })
      .catch((error) => {
        if (!montado) return;
        setDemandas([]);
        setErro(error);
      })
      .finally(() => {
        if (montado) setCarregando(false);
      });

    return () => {
      montado = false;
    };
  }, [tentativa]);

  const counts = useMemo(() => {
    return {
      todas: demandas.length,
      rascunhos: demandas.filter((d) => d.status === "rascunho").length,
      aguardando_validacao: demandas.filter((d) => d.status === "aguardando_validacao").length,
      acao_necessaria: demandas.filter((d) => d.status === "devolvida" || hasReturnedItems(d)).length,
      concluidas: demandas.filter(
        (d) => d.status === "concluida" || d.status === "consolidada" || d.status === "vinculada_dfd"
      ).length,
    };
  }, [demandas]);

  const statusOptions = [
    { value: "todas", label: "Todas", count: counts.todas },
    { value: "rascunhos", label: "Rascunhos", count: counts.rascunhos },
    { value: "aguardando_validacao", label: "Aguardando validação", count: counts.aguardando_validacao },
    { value: "acao_necessaria", label: "Ação necessária / Devolvidas", count: counts.acao_necessaria },
    { value: "concluidas", label: "Concluídas", count: counts.concluidas },
  ];

  const termo = busca.trim().toLowerCase();

  const demandasFiltradas = useMemo(() => {
    return demandas.filter((demanda) => {
      let matchStatus = true;
      if (filtroStatus === "rascunhos" || filtroStatus === "rascunho") {
        matchStatus = demanda.status === "rascunho";
      } else if (filtroStatus === "aguardando_validacao") {
        matchStatus = demanda.status === "aguardando_validacao";
      } else if (
        filtroStatus === "acao_necessaria" ||
        filtroStatus === "devolvida" ||
        filtroStatus === "devolvidas"
      ) {
        matchStatus = demanda.status === "devolvida" || hasReturnedItems(demanda);
      } else if (filtroStatus === "concluidas" || filtroStatus === "concluida") {
        matchStatus =
          demanda.status === "concluida" ||
          demanda.status === "consolidada" ||
          demanda.status === "vinculada_dfd";
      }

      if (!matchStatus) return false;

      if (!termo) return true;

      const idMatch =
        String(demanda.id).toLowerCase().includes(termo) ||
        `#${demanda.id}`.toLowerCase().includes(termo);
      const anoMatch = String(demanda.ano_referencia || "")
        .toLowerCase()
        .includes(termo);
      const obsMatch = (demanda.observacao || "").toLowerCase().includes(termo);
      const unidadeMatch = (demanda.unidade_sigla || "").toLowerCase().includes(termo);

      return idMatch || anoMatch || obsMatch || unidadeMatch;
    });
  }, [demandas, filtroStatus, termo]);

  const filtrosAplicados = Boolean(busca.trim() || (filtroStatus && filtroStatus !== "todas"));

  function limparFiltros() {
    setBusca("");
    setFiltroStatus("todas");
  }

  return (
    <div>
      <PageHeader
        eyebrow="Planejamento e contratações"
        title="Minhas demandas"
        description="Acompanhe a situação das suas solicitações e veja a próxima ação de cada uma."
        actions={newDemandLink}
      />

      {erro ? (
        <ApiErrorMessage
          error={erro}
          title="Não foi possível carregar suas demandas"
          onRetry={() => setTentativa((valor) => valor + 1)}
        />
      ) : carregando ? (
        <LoadingState label="Carregando suas demandas..." />
      ) : demandas.length === 0 ? (
        <EmptyState
          icon="bi-file-earmark-plus"
          title="Nenhuma demanda cadastrada"
          description="Crie uma demanda para começar a registrar os itens necessários."
          action={(
            <Link to="/demandas/nova" className="pac-button pac-button--primary">
              <i className="bi bi-plus-lg" aria-hidden="true" />
              Criar primeira demanda
            </Link>
          )}
        />
      ) : (
        <>
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
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar por ID, ano ou observação..."
                  />
                </div>
              </div>

              <div
                className="d-flex flex-wrap gap-2 align-items-center"
                role="tablist"
                aria-label="Filtro de demandas por status"
              >
                {statusOptions.map((opt) => {
                  const isSelected = filtroStatus === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`pac-button pac-button--sm ${
                        isSelected ? "pac-button--primary" : "pac-button--secondary"
                      }`}
                      onClick={() => setFiltroStatus(opt.value)}
                    >
                      <span>{opt.label}</span>
                      <Badge
                        variant={isSelected ? "primary" : "neutral"}
                        className="ms-1"
                      >
                        {opt.count}
                      </Badge>
                    </button>
                  );
                })}

                {filtrosAplicados && demandasFiltradas.length > 0 && (
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

          {demandasFiltradas.length === 0 ? (
            <EmptyState
              icon="bi-search"
              title="Nenhuma demanda encontrada"
              description="Tente ajustar os termos de busca ou remover os filtros aplicados."
              action={(
                <Button variant="secondary" onClick={limparFiltros}>
                  <i className="bi bi-x-circle" aria-hidden="true" />
                  Limpar filtros
                </Button>
              )}
            />
          ) : (
            <>
              {filtrosAplicados && (
                <div className="d-flex justify-content-between align-items-center mb-3" aria-live="polite">
                  <span className="text-muted small">
                    Exibindo {demandasFiltradas.length}{" "}
                    {demandasFiltradas.length === 1 ? "demanda filtrada" : "demandas filtradas"}
                  </span>
                </div>
              )}
              <Table caption="Demandas cadastradas pelo usuário">
                <thead>
                  <tr>
                    <th scope="col">Demanda</th>
                    <th scope="col">Unidade</th>
                    <th scope="col">Ano</th>
                    <th scope="col">Status</th>
                    <th scope="col">Valor total</th>
                    <th scope="col">Próxima ação</th>
                    <th scope="col" className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {demandasFiltradas.map((demanda) => {
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
            </>
          )}
        </>
      )}
    </div>
  );
}
