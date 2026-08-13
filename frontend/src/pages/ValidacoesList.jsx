import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function ValidacoesList() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .listPendentes()
      .then((data) => setItens(data.results || data))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Spinner />;

  return (
    <div>
      <h1 className="h3 mb-3">
        <i className="bi bi-check2-square me-2"></i>Itens aguardando validação
      </h1>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-muted">Nenhum item pendente de validação.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qtd.</th>
                <th>Valor total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td>{item.quantidade}</td>
                  <td>{formatCurrency(item.valor_total)}</td>
                  <td className="text-end">
                    <Link
                      to={`/validacoes/${item.id}`}
                      className="btn btn-sm btn-primary"
                    >
                      Analisar
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
