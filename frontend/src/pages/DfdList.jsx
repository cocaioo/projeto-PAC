import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import { EmptyState, LoadingState, Table } from "../components/ui";
import { formatCurrency } from "../utils/format";

export default function DfdList() {
  const [dfds, setDfds] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(() => {
    setCarregando(true);
    setErro(null);
    api
      .listDfds()
      .then((data) => setDfds(data.results || data))
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, []);

  useEffect(() => carregar(), [carregar]);

  return (
    <div>
      <PageHeader
        eyebrow="Consolidação"
        title="DFDs"
        description="Consulte os documentos formalizados a partir das demandas validadas."
        actions={<Link to="/dfds/consolidar" className="pac-button pac-button--primary">
          <i className="bi bi-collection me-1"></i>Consolidar
        </Link>}
      />

      {erro ? (
        <ApiErrorMessage error={erro} title="Não foi possível carregar os DFDs" onRetry={carregar} />
      ) : carregando ? (
        <LoadingState label="Carregando DFDs..." />
      ) : dfds.length === 0 ? (
        <EmptyState icon="bi-file-earmark-ruled" title="Nenhum DFD cadastrado" description="Os DFDs aparecerão aqui após a consolidação dos itens validados." />
      ) : (
          <Table caption="Documentos de formalização de demanda">
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
          </Table>
      )}
    </div>
  );
}
