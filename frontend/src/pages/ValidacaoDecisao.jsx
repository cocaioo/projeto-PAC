import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import Spinner from "../components/Spinner";
import { formatCurrency } from "../utils/format";

export default function ValidacaoDecisao() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [comentario, setComentario] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api
      .getItem(itemId)
      .then(setItem)
      .catch((e) => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [itemId]);

  async function decidir(acao) {
    setErro("");
    if (acao === "devolvido" && !comentario.trim()) {
      setErro("Comentário é obrigatório para devolução.");
      return;
    }
    setEnviando(true);
    try {
      await api.decidirValidacao({
        item_demanda: Number(itemId),
        acao,
        comentario,
      });
      navigate("/validacoes");
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <Spinner />;
  if (!item)
    return (
      <div className="alert alert-danger" role="alert">
        {erro || "Item não encontrado."}
      </div>
    );

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <h1 className="h4 mb-3">Analisar item</h1>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}

        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h2 className="h5">{item.nome}</h2>
            <p className="text-muted mb-1">{item.descricao}</p>
            <dl className="row mb-0">
              <dt className="col-sm-4">Quantidade</dt>
              <dd className="col-sm-8">{item.quantidade}</dd>
              <dt className="col-sm-4">Valor total</dt>
              <dd className="col-sm-8">{formatCurrency(item.valor_total)}</dd>
              <dt className="col-sm-4">Justificativa</dt>
              <dd className="col-sm-8">{item.justificativa_necessidade}</dd>
            </dl>
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="comentario" className="form-label">
            Comentário{" "}
            <span className="text-muted">(obrigatório para devolução)</span>
          </label>
          <textarea
            id="comentario"
            className="form-control"
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-success"
            onClick={() => decidir("validado")}
            disabled={enviando}
          >
            <i className="bi bi-check-lg me-1"></i>Validar
          </button>
          <button
            className="btn btn-danger"
            onClick={() => decidir("devolvido")}
            disabled={enviando}
          >
            <i className="bi bi-arrow-return-left me-1"></i>Devolver
          </button>
        </div>
      </div>
    </div>
  );
}
