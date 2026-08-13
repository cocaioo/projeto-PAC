import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";

const CAMPOS_INICIAIS = {
  tipo: "material",
  nome: "",
  descricao: "",
  unidade_medida: "",
  quantidade: 1,
  valor_estimado: "",
  data_prevista: "",
  prioridade: "media",
  justificativa_prioridade: "",
  justificativa_necessidade: "",
  indicacao_orcamentaria: "",
  observacoes: "",
};

function formFromItem(data) {
  return {
    tipo: data.tipo || "material",
    nome: data.nome || "",
    descricao: data.descricao || "",
    unidade_medida: data.unidade_medida || "",
    quantidade: data.quantidade || 1,
    valor_estimado: data.valor_estimado || "",
    data_prevista: data.data_prevista || "",
    prioridade: data.prioridade || "media",
    justificativa_prioridade: data.justificativa_prioridade || "",
    justificativa_necessidade: data.justificativa_necessidade || "",
    indicacao_orcamentaria: data.indicacao_orcamentaria || "",
    observacoes: data.observacoes || "",
  };
}

export default function ItemForm() {
  const { id, itemId } = useParams();
  const isEditing = Boolean(itemId);
  const navigate = useNavigate();
  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [itemAtual, setItemAtual] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregandoItem, setCarregandoItem] = useState(isEditing);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isEditing) return;
    setCarregandoItem(true);
    api
      .getItem(itemId)
      .then((data) => {
        if (String(data.demanda) !== String(id)) {
          setErro("Este item não pertence à demanda informada.");
          return;
        }
        setItemAtual(data);
        setForm(formFromItem(data));
        setIsDirty(false);
      })
      .catch((err) => setErro(err.message || "Erro ao carregar item."))
      .finally(() => setCarregandoItem(false));
  }, [id, itemId, isEditing]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setIsDirty(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    setEnviando(true);
    const payload = {
      ...form,
      quantidade: Number(form.quantidade),
    };
    try {
      if (isEditing) {
        const atualizado = await api.updateItem(itemId, payload);
        setItemAtual((atual) => ({ ...atual, ...atualizado }));
        setForm(formFromItem({ ...itemAtual, ...atualizado }));
        setIsDirty(false);
      } else {
        await api.addItem(id, payload);
        navigate(`/demandas/${id}`);
      }
    } catch (err) {
      setErro(err.message || "Não foi possível salvar o item.");
    } finally {
      setEnviando(false);
    }
  }

  async function handleReenviar() {
    if (!isEditing || !itemAtual || isDirty || reenviando) return;
    setErro("");
    setMensagem("");
    setReenviando(true);
    try {
      const res = await api.reenviarItem(itemId);
      setMensagem(res.detail || "Item reenviado para validação com sucesso.");
      setItemAtual((atual) => ({
        ...atual,
        ...(res.item || {}),
        status: res.item?.status || "aguardando_validacao",
      }));
    } catch (err) {
      setErro(err.message || "Não foi possível reenviar o item.");
    } finally {
      setReenviando(false);
    }
  }

  if (carregandoItem) {
    return <div className="text-center py-5">Carregando dados do item...</div>;
  }

  const parecer =
    itemAtual?.ultima_devolucao?.comentario || itemAtual?.justificativa_devolucao || "";

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <h1 className="h4 mb-3">{isEditing ? "Editar item" : "Adicionar item"}</h1>

        {erro && (
          <div className="alert alert-danger" role="alert">
            {erro}
          </div>
        )}
        {mensagem && (
          <div className="alert alert-success" role="alert">
            {mensagem}
          </div>
        )}
        {itemAtual?.status === "devolvida" && parecer && (
          <div className="alert alert-warning" role="alert">
            <strong>Parecer da Devolução:</strong> {parecer}
            {itemAtual.ultima_devolucao?.responsavel?.nome && (
              <span className="ms-2 text-muted">
                {itemAtual.ultima_devolucao.responsavel.nome}
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="tipo" className="form-label">Tipo</label>
              <select id="tipo" className="form-select" value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)}>
                <option value="material">Material</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div className="col-md-8">
              <label htmlFor="nome" className="form-label">Nome</label>
              <input id="nome" className="form-control" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required />
            </div>
            <div className="col-12">
              <label htmlFor="descricao" className="form-label">Descrição</label>
              <textarea id="descricao" className="form-control" rows={2} value={form.descricao} onChange={(e) => atualizar("descricao", e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="unidade_medida" className="form-label">Unidade de medida</label>
              <input id="unidade_medida" className="form-control" value={form.unidade_medida} onChange={(e) => atualizar("unidade_medida", e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="quantidade" className="form-label">Quantidade</label>
              <input id="quantidade" type="number" min="0" className="form-control" value={form.quantidade} onChange={(e) => atualizar("quantidade", e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="valor_estimado" className="form-label">Valor estimado unitário</label>
              <input id="valor_estimado" type="number" step="0.01" className="form-control" value={form.valor_estimado} onChange={(e) => atualizar("valor_estimado", e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="data_prevista" className="form-label">Data prevista</label>
              <input id="data_prevista" type="date" className="form-control" value={form.data_prevista} onChange={(e) => atualizar("data_prevista", e.target.value)} required />
            </div>
            <div className="col-md-4">
              <label htmlFor="prioridade" className="form-label">Prioridade</label>
              <select id="prioridade" className="form-select" value={form.prioridade} onChange={(e) => atualizar("prioridade", e.target.value)}>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
            </div>
            <div className="col-md-4">
              <label htmlFor="indicacao_orcamentaria" className="form-label">Indicação orçamentária</label>
              <input id="indicacao_orcamentaria" className="form-control" value={form.indicacao_orcamentaria} onChange={(e) => atualizar("indicacao_orcamentaria", e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label htmlFor="justificativa_prioridade" className="form-label">Justificativa da prioridade</label>
              <textarea id="justificativa_prioridade" className="form-control" rows={2} value={form.justificativa_prioridade} onChange={(e) => atualizar("justificativa_prioridade", e.target.value)} required />
            </div>
            <div className="col-md-6">
              <label htmlFor="justificativa_necessidade" className="form-label">Justificativa da necessidade</label>
              <textarea id="justificativa_necessidade" className="form-control" rows={2} value={form.justificativa_necessidade} onChange={(e) => atualizar("justificativa_necessidade", e.target.value)} required />
            </div>
            <div className="col-12">
              <label htmlFor="observacoes" className="form-label">Observações do solicitante (opcional)</label>
              <textarea id="observacoes" className="form-control" rows={2} value={form.observacoes} onChange={(e) => atualizar("observacoes", e.target.value)} placeholder="Insira detalhes sobre correções efetuadas ou observações adicionais" />
            </div>
          </div>

          <button className="btn btn-primary mt-3" disabled={enviando || reenviando}>
            {enviando ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar item"}
          </button>
          {isEditing && itemAtual?.status === "devolvida" && (
            <>
              <button type="button" className="btn btn-success mt-3 ms-2" disabled={enviando || reenviando || isDirty} onClick={handleReenviar}>
                {reenviando ? "Reenviando..." : "Reenviar"}
              </button>
              {isDirty && <div className="form-text">Salve as alterações antes de reenviar.</div>}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
