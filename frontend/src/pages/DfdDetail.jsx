import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function DfdDetail() {
  const { id } = useParams();
  const [dfd, setDfd] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    api
      .getDfd(id)
      .then(setDfd)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) return <Spinner />;
  if (!dfd)
    return (
      <div className="alert alert-danger" role="alert">
        {erro || "DFD não encontrado."}
      </div>
    );

  return (
    <div>
      <h1 className="h3 mb-3">DFD {dfd.numero}</h1>

      <dl className="row">
        <dt className="col-sm-3">Grupo</dt>
        <dd className="col-sm-9">{dfd.grupo_nome}</dd>
        <dt className="col-sm-3">Criado por</dt>
        <dd className="col-sm-9">{dfd.criado_por_nome}</dd>
        {dfd.numero_processo && (
          <>
            <dt className="col-sm-3">Processo</dt>
            <dd className="col-sm-9">{dfd.numero_processo}</dd>
          </>
        )}
      </dl>

      <h2 className="h5 mb-2">Itens consolidados</h2>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qtd.</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {dfd.itens.map((item) => (
              <tr key={item.id}>
                <td>{item.nome}</td>
                <td>{item.quantidade}</td>
                <td>{formatCurrency(item.valor_total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2} className="text-end">
                Total
              </th>
              <th>{formatCurrency(dfd.total)}</th>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
