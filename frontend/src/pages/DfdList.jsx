import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function DfdList() {
  const [dfds, setDfds] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .listDfds()
      .then((data) => setDfds(data.results || data))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Spinner />;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h3 mb-0">
          <i className="bi bi-file-earmark-ruled me-2"></i>DFDs
        </h1>
        <Link to="/dfds/consolidar" className="btn btn-primary">
          <i className="bi bi-collection me-1"></i>Consolidar
        </Link>
      </div>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {dfds.length === 0 ? (
        <p className="text-muted">Nenhum DFD cadastrado.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Número</th>
                <th>Grupo</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dfds.map((dfd) => (
                <tr key={dfd.id}>
                  <td>{dfd.numero}</td>
                  <td>{dfd.grupo_nome}</td>
                  <td>{formatCurrency(dfd.total)}</td>
                  <td className="text-end">
                    <Link
                      to={`/dfds/${dfd.id}`}
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
