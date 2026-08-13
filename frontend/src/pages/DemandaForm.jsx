import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";

export default function DemandaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [anoReferencia, setAnoReferencia] = useState(
    new Date().getFullYear() + 1
  );
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    api
      .getDemanda(id)
      .then((d) => {
        setAnoReferencia(d.ano_referencia);
        setObservacao(d.observacao || "");
      })
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [id, editando]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const payload = {
      ano_referencia: Number(anoReferencia),
      observacao,
    };
    try {
      const demanda = editando
        ? await api.updateDemanda(id, payload)
        : await api.createDemanda(payload);
      navigate(`/demandas/${demanda.id}`);
    } catch (err) {
      setErro(err.message || "Não foi possível salvar a demanda.");
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Spinner />;

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <h1 className="h4 mb-3">
          {editando ? "Editar Demanda" : "Nova Demanda"}
        </h1>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="ano" className="form-label">
              Ano de referência
            </label>
            <input
              id="ano"
              type="number"
              className="form-control"
              value={anoReferencia}
              onChange={(e) => setAnoReferencia(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="obs" className="form-label">
              Observação
            </label>
            <textarea
              id="obs"
              className="form-control"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
