import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import CatalogItemAutocomplete from "../components/CatalogItemAutocomplete";
import { formatCurrency } from "../utils/format";

const CAMPOS_INICIAIS = {
  item_catalogo: null,
  grupo_nome: "",
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
    item_catalogo: data.item_catalogo || null,
    grupo_nome: data.grupo_nome || data.item_catalogo_detalhe?.grupo_nome || "",
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
  const [origem, setOrigem] = useState("manual");
  const [itemCatalogo, setItemCatalogo] = useState(null);
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
        if (data.item_catalogo) {
          setOrigem("catalogo");
          setItemCatalogo({
            id: data.item_catalogo,
            nome: data.nome,
            grupo_nome: data.grupo_nome || data.item_catalogo_detalhe?.grupo_nome || "",
            valor_estimado: data.valor_estimado,
          });
        }
        setIsDirty(false);
      })
      .catch((err) => setErro(err.message || "Erro ao carregar item."))
      .finally(() => setCarregandoItem(false));
  }, [id, itemId, isEditing]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setIsDirty(true);
  }

  function mudarOrigem(novaOrigem) {
    setOrigem(novaOrigem);
    setItemCatalogo(null);
    setForm((atual) => ({
      ...atual,
      item_catalogo: null,
      grupo_nome: "",
      ...(novaOrigem === "catalogo"
        ? { nome: "", descricao: "", unidade_medida: "", valor_estimado: "" }
        : {}),
    }));
    setIsDirty(true);
  }

  function selecionarItemCatalogo(item) {
    setItemCatalogo(item);
    setForm((atual) => item ? ({
      ...atual,
      item_catalogo: item.id,
      grupo_nome: item.grupo_nome || "",
      tipo: item.tipo,
      nome: item.nome,
      descricao: item.descricao,
      unidade_medida: item.unidade_medida,
      valor_estimado: item.valor_estimado,
    }) : ({
      ...atual,
      item_catalogo: null,
      grupo_nome: "",
      nome: "",
      descricao: "",
      unidade_medida: "",
      valor_estimado: "",
    }));
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
    delete payload.grupo_nome;
    if (!payload.item_catalogo) delete payload.item_catalogo;
    if (isEditing && itemAtual?.item_catalogo) {
      ["item_catalogo", "tipo", "nome", "descricao", "unidade_medida"].forEach(
        (campo) => delete payload[campo]
      );
    }
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
  const totalVisual = Number(form.quantidade || 0) * Number(form.valor_estimado || 0);
  const camposCatalogoBloqueados = origem === "catalogo" && Boolean(form.item_catalogo);

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
          {!isEditing && (
            <fieldset className="mb-3">
              <legend className="form-label fw-semibold">Origem do item</legend>
              <div className="d-flex flex-wrap gap-3">
                <label className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="origem-item"
                    value="manual"
                    checked={origem === "manual"}
                    onChange={() => mudarOrigem("manual")}
                  />
                  <span className="form-check-label">Preenchimento manual</span>
                </label>
                <label className="form-check">
                  <input
                    className="form-check-input"
                    type="radio"
                    name="origem-item"
                    value="catalogo"
                    checked={origem === "catalogo"}
                    onChange={() => mudarOrigem("catalogo")}
                  />
                  <span className="form-check-label">Selecionar do catálogo</span>
                </label>
              </div>
            </fieldset>
          )}

          {origem === "catalogo" && !isEditing && (
            <CatalogItemAutocomplete
              selectedItem={itemCatalogo}
              onSelect={selecionarItemCatalogo}
            />
          )}

          {origem === "catalogo" && form.grupo_nome && (
            <div className="alert alert-info py-2" role="status">
              <i className="bi bi-diagram-3 me-2" aria-hidden="true" />
              Grupo de contratação: <strong>{form.grupo_nome}</strong>
            </div>
          )}

          <div className="row g-3">
            <div className="col-md-4">
              <label htmlFor="tipo" className="form-label">Tipo</label>
              <select id="tipo" className="form-select" value={form.tipo} onChange={(e) => atualizar("tipo", e.target.value)} disabled={camposCatalogoBloqueados}>
                <option value="material">Material</option>
                <option value="servico">Serviço</option>
              </select>
            </div>
            <div className="col-md-8">
              <label htmlFor="nome" className="form-label">Nome</label>
              <input id="nome" className="form-control" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required disabled={camposCatalogoBloqueados} />
            </div>
            <div className="col-12">
              <label htmlFor="descricao" className="form-label">Descrição</label>
              <textarea id="descricao" className="form-control" rows={2} value={form.descricao} onChange={(e) => atualizar("descricao", e.target.value)} required disabled={camposCatalogoBloqueados} />
            </div>
            <div className="col-md-4">
              <label htmlFor="unidade_medida" className="form-label">Unidade de medida</label>
              <input id="unidade_medida" className="form-control" value={form.unidade_medida} onChange={(e) => atualizar("unidade_medida", e.target.value)} required disabled={camposCatalogoBloqueados} />
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

          <div className="pac-card mt-3" aria-live="polite">
            <div className="pac-card__body d-flex flex-wrap justify-content-between gap-2">
              <div>
                <strong>Total estimado</strong>
                <div className="small text-muted">Cálculo visual; o valor oficial é confirmado pelo servidor.</div>
              </div>
              <strong className="fs-5">{formatCurrency(totalVisual)}</strong>
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
