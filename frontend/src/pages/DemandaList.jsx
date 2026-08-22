import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import { EmptyState, LoadingState, NextAction, Table } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { getDemandNextAction } from "../utils/nextActions";

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
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let montado = true;

    setCarregando(true);
    setErro(null);
    api
      .listDemandas()
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
            {demandas.map((demanda) => {
              const nextAction = getDemandNextAction(demanda);
              return (
                <tr key={demanda.id} className="pac-table__row-link">
                  <td className="fw-semibold">
                    <Link to={`/demandas/${demanda.id}`}>
                      #{demanda.id}
                    </Link>
                  </td>
                  <td>{demanda.unidade_sigla || "-"}</td>
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
      )}
    </div>
  );
}
