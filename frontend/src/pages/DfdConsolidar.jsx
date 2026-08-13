import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function DfdConsolidar() {
  const navigate = useNavigate();
  const [itens, setItens] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [numero, setNumero] = useState("");
  const [grupo, setGrupo] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    Promise.all([api.itensDisponiveis(), api.listGrupos()])
      .then(([itensData, gruposData]) => {
        setItens(itensData.results || itensData);
        setGrupos(gruposData.results || gruposData);
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, []);

  function alternarItem(id) {
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    if (!numero || !grupo || selecionados.length === 0) {
      setErro("Informe número, grupo e selecione ao menos um item.");
      return;
    }
    setEnviando(true);
    try {
      const dfd = await api.consolidarDfd({
        numero,
        grupo: Number(grupo),
        itens: selecionados,
      });
      navigate(`/dfds/${dfd.id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Spinner />;

  return (
    <div>
      <h1 className="h3 mb-3">
        <i className="bi bi-collection me-2"></i>Consolidar DFD
      </h1>

      {erro && (
        <div className="alert alert-danger" role="alert">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label htmlFor="numero" className="form-label">
              Número do DFD
            </label>
            <input
              id="numero"
              className="form-control"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label htmlFor="grupo" className="form-label">
              Grupo de contratação
            </label>
            <select
              id="grupo"
              className="form-select"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
            >
              <option value="">Selecione...</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <h2 className="h5 mb-2">Itens validados disponíveis</h2>
        {itens.length === 0 ? (
          <p className="text-muted">Nenhum item validado disponível.</p>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th></th>
                  <th>Item</th>
                  <th>Qtd.</th>
                  <th>Valor total</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        aria-label={`Selecionar ${item.nome}`}
                        checked={selecionados.includes(item.id)}
                        onChange={() => alternarItem(item.id)}
                      />
                    </td>
                    <td>{item.nome}</td>
                    <td>{item.quantidade}</td>
                    <td>{formatCurrency(item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button className="btn btn-primary mt-2" disabled={enviando}>
          {enviando ? "Consolidando..." : "Consolidar DFD"}
        </button>
      </form>
    </div>
  );
}
