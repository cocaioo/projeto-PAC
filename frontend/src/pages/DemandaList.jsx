import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StatusBadge";
import { formatCurrency } from "../utils/format";

export default function DemandaList() {
  const [demandas, setDemandas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .listDemandas()
      .then((data) => setDemandas(data.results || data))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Spinner />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">
          <i className="bi bi-file-earmark-text me-2"></i>Demandas
        </h1>
        <Link to="/demandas/nova" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>Nova Demanda
        </Link>
      </div>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {demandas.length === 0 ? (
        <p className="text-muted">Nenhuma demanda cadastrada.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>#</th>
                <th>Unidade</th>
                <th>Ano</th>
                <th>Status</th>
                <th>Valor total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {demandas.map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{d.unidade_sigla}</td>
                  <td>{d.ano_referencia}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td>{formatCurrency(d.valor_total)}</td>
                  <td className="text-end">
                    <Link
                      to={`/demandas/${d.id}`}
                      className="btn btn-sm btn-outline-primary"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
