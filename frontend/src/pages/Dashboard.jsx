import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import { Badge, Card, EmptyState, LoadingState } from "../components/ui";
import { formatCurrency } from "../utils/format";
import { getStatusLabel } from "../utils/statusConfig";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    api
      .dashboardStats()
      .then(setStats)
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => carregar(), [carregar]);

  if (carregando) return <LoadingState label="Carregando indicadores do PAC..." />;
  if (erro) return <ApiErrorMessage error={erro} title="Não foi possível carregar o dashboard" onRetry={carregar} />;
  if (!stats) return <EmptyState icon="bi-speedometer2" title="Indicadores indisponíveis" description="Não há dados consolidados para exibir." />;

  const cards = [
    { label: "Demandas", valor: stats.total_demandas, icone: "bi-file-earmark-text" },
    { label: "Itens", valor: stats.total_itens, icone: "bi-list-ul" },
    { label: "Aguardando validação", valor: stats.aguardando_validacao, icone: "bi-hourglass-split" },
    { label: "Validados", valor: stats.validados, icone: "bi-check2-circle" },
    { label: "Consolidados", valor: stats.consolidados, icone: "bi-collection" },
    { label: "DFDs", valor: stats.total_dfds, icone: "bi-file-earmark-ruled" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Visão geral" title="Dashboard" description="Acompanhe os principais indicadores do PAC." />

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-md-4 col-lg-2" key={c.label}>
            <Card className="text-center h-100">
                <i className={`bi ${c.icone} fs-3 text-primary`}></i>
                <div className="fs-4 fw-bold">{c.valor}</div>
                <div className="text-muted small">{c.label}</div>
            </Card>
          </div>
        ))}
      </div>

      <Card className="mb-4">
          <h2 className="h6 text-muted">Valor total estimado</h2>
          <div className="fs-3 fw-bold text-success">
            {formatCurrency(stats.valor_total_estimado)}
          </div>
      </Card>

      <Card title="Itens por status">
        <ul className="list-group list-group-flush">
          {Object.entries(stats.itens_por_status).map(([status, total]) => (
            <li
              key={status}
              className="list-group-item d-flex justify-content-between"
            >
              <span>{getStatusLabel(status)}</span>
              <Badge variant="info">{total}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
