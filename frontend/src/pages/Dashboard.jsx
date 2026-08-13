import { useEffect, useState } from "react";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency, statusLabel } from "../utils/format";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api
      .dashboardStats()
      .then(setStats)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Spinner />;
  if (erro)
    return (
      <div className="alert alert-danger" role="alert">
        {erro}
      </div>
    );

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
      <h1 className="h3 mb-4">
        <i className="bi bi-speedometer2 me-2"></i>Dashboard
      </h1>

      <div className="row g-3 mb-4">
        {cards.map((c) => (
          <div className="col-6 col-md-4 col-lg-2" key={c.label}>
            <div className="card text-center shadow-sm h-100">
              <div className="card-body">
                <i className={`bi ${c.icone} fs-3 text-primary`}></i>
                <div className="fs-4 fw-bold">{c.valor}</div>
                <div className="text-muted small">{c.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <h2 className="h6 text-muted">Valor total estimado</h2>
          <div className="fs-3 fw-bold text-success">
            {formatCurrency(stats.valor_total_estimado)}
          </div>
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-header">Itens por status</div>
        <ul className="list-group list-group-flush">
          {Object.entries(stats.itens_por_status).map(([status, total]) => (
            <li
              key={status}
              className="list-group-item d-flex justify-content-between"
            >
              <span>{statusLabel(status)}</span>
              <span className="badge bg-primary rounded-pill">{total}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
