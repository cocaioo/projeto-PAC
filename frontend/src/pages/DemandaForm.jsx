import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

  return (
    <div className="row justify-content-center">
      <div className="col-md-6">
        <PageHeader eyebrow="Minhas demandas" title={editando ? "Editar demanda" : "Nova demanda"} />

        <ApiErrorMessage error={erro} title="Não foi possível salvar a demanda" />

        <Card><form onSubmit={handleSubmit}>
            <Input
              id="ano"
              type="number"
              label="Ano de referência"
              value={anoReferencia}
              onChange={(e) => setAnoReferencia(e.target.value)}
              required
            />
            <Textarea
              id="obs"
              label="Observação"
              rows={3}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          <Button type="submit" loading={enviando}>Salvar</Button>
        </form></Card>
      </div>
    </div>
  );
}
