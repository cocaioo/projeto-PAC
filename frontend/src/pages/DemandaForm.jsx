import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage from "../components/ApiErrorMessage";
import PageHeader from "../components/PageHeader";
import { Button, Card, Input, LoadingState, Textarea } from "../components/ui";

export default function DemandaForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const navigate = useNavigate();

  const [anoReferencia, setAnoReferencia] = useState(
    new Date().getFullYear() + 1
  );
  const [observacao, setObservacao] = useState("");
  const [carregando, setCarregando] = useState(editando);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!editando) return;
    api
      .getDemanda(id)
      .then((d) => {
        setAnoReferencia(d.ano_referencia);
        setObservacao(d.observacao || "");
      })
      .catch(setErro)
      .finally(() => setCarregando(false));
  }, [id, editando]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
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
      setErro(err);
    } finally {
      setEnviando(false);
    }
  }

  if (carregando) return <LoadingState label="Carregando dados da demanda..." />;

  const backUrl = editando ? `/demandas/${id}` : "/demandas";

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <PageHeader
          eyebrow="Minhas demandas"
          title={editando ? "Editar demanda" : "Nova demanda"}
          description="Informe o exercício de execução e observações gerais sobre a demanda da sua unidade."
          actions={(
            <Link to={backUrl} className="pac-button pac-button--secondary">
              <i className="bi bi-arrow-left me-1" aria-hidden="true" />
              Voltar
            </Link>
          )}
        />

        <ApiErrorMessage error={erro} title="Não foi possível salvar a demanda" />

        <Card>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <Input
                id="ano"
                type="number"
                label="Ano de referência"
                value={anoReferencia}
                onChange={(e) => setAnoReferencia(e.target.value)}
                required
              />
              <div className="form-text mt-1">
                Exercício financeiro em que as aquisições e contratações serão executadas pela instituição.
              </div>
            </div>
            <div className="mb-3">
              <Textarea
                id="obs"
                label="Observação (opcional)"
                rows={3}
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações complementares sobre a demanda da unidade"
              />
            </div>
            <div className="d-flex gap-2">
              <Button type="submit" loading={enviando}>Salvar</Button>
              <Link to={backUrl} className="pac-button pac-button--secondary">
                Cancelar
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
