import { useEffect, useState } from "react";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function Catalogo() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .listCatalogo()
      .then((data) => setItens(data.results || data))
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) return <Spinner />;

  return (
    <div>
      <h1 className="h3 mb-3">
        <i className="bi bi-box-seam me-2"></i>Catálogo de itens
      </h1>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      {itens.length === 0 ? (
        <p className="text-muted">Nenhum item no catálogo.</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Grupo</th>
                <th>Unidade</th>
                <th>Valor estimado</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => (
                <tr key={item.id}>
                  <td>{item.nome}</td>
                  <td className="text-capitalize">{item.tipo}</td>
                  <td>{item.grupo_nome}</td>
                  <td>{item.unidade_medida}</td>
                  <td>{formatCurrency(item.valor_estimado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
