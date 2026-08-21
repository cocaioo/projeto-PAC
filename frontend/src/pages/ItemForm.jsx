import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import ApiErrorMessage, { InlineMessage } from "../components/ApiErrorMessage";
import CatalogItemAutocomplete from "../components/CatalogItemAutocomplete";
import PageHeader from "../components/PageHeader";
import { Button, ConfirmDialog, LoadingState } from "../components/ui";
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

export function validateItemForm(form, { origem = "manual", catalogIds = [] } = {}) {
  const errors = {};
  if (origem === "catalogo" && !form.item_catalogo) {
    errors.item_catalogo = "Selecione um item do catálogo.";
  }
  if (form.item_catalogo && catalogIds.includes(Number(form.item_catalogo))) {
    errors.item_catalogo = "Este item do catálogo já foi adicionado à demanda.";
  }
  if (origem === "manual") {
    if (!form.nome.trim()) errors.nome = "Informe o nome do item.";
    if (!form.descricao.trim()) errors.descricao = "Informe a descrição do item.";
    if (!form.unidade_medida.trim()) errors.unidade_medida = "Informe a unidade de medida.";
  }
  if (!form.quantidade || Number(form.quantidade) <= 0) errors.quantidade = "A quantidade deve ser maior que zero.";
  if (!form.valor_estimado || Number(form.valor_estimado) <= 0) errors.valor_estimado = "O valor estimado deve ser maior que zero.";
  if (!form.data_prevista) errors.data_prevista = "Informe a data prevista.";
  if (!form.indicacao_orcamentaria.trim()) errors.indicacao_orcamentaria = "Informe a indicação orçamentária.";
  if (!form.justificativa_necessidade.trim()) errors.justificativa_necessidade = "Informe a justificativa da necessidade.";
  if (form.prioridade === "alta" && !form.justificativa_prioridade.trim()) {
    errors.justificativa_prioridade = "A justificativa é obrigatória para prioridade alta.";
  }
  return errors;
}

export default function ItemForm() {
  const { id, itemId } = useParams();
  const isEditing = Boolean(itemId);
  const navigate = useNavigate();
  const [form, setForm] = useState(CAMPOS_INICIAIS);
  const [origem, setOrigem] = useState("manual");
  const [itemCatalogo, setItemCatalogo] = useState(null);
  const [catalogIdsExistentes, setCatalogIdsExistentes] = useState([]);
  const [errosCampos, setErrosCampos] = useState({});
  const [itemAtual, setItemAtual] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregandoItem, setCarregandoItem] = useState(isEditing);
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [confirmarReenvio, setConfirmarReenvio] = useState(false);
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

  useEffect(() => {
    if (isEditing || typeof api.getDemanda !== "function") return;
    let mounted = true;
    api.getDemanda(id)
      .then((demanda) => {
        if (!mounted) return;
        setCatalogIdsExistentes(
          (demanda.itens || []).map((item) => Number(item.item_catalogo)).filter(Boolean)
        );
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [id, isEditing]);

  function atualizar(campo, valor) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
    setErrosCampos((atuais) => ({ ...atuais, [campo]: undefined }));
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
    setErrosCampos({});
  }

  function selecionarItemCatalogo(item) {
    if (item && catalogIdsExistentes.includes(Number(item.id))) {
      setErrosCampos((atuais) => ({
        ...atuais,
        item_catalogo: "Este item do catálogo já foi adicionado à demanda.",
      }));
      return;
    }
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
    setErrosCampos((atuais) => ({ ...atuais, item_catalogo: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setMensagem("");
    const validationErrors = validateItemForm(form, {
      origem,
      catalogIds: isEditing ? [] : catalogIdsExistentes,
    });
    if (Object.keys(validationErrors).length > 0) {
      setErrosCampos(validationErrors);
      document.getElementById(Object.keys(validationErrors)[0])?.focus();
      return;
    }
    setErrosCampos({});
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
      if (err.fieldErrors) {
        setErrosCampos(Object.fromEntries(
          Object.entries(err.fieldErrors).map(([field, messages]) => [field, messages.join(" ")])
        ));
      }
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
      setConfirmarReenvio(false);
    }
  }

  function errorProps(field) {
    return errosCampos[field]
      ? { "aria-invalid": "true", "aria-describedby": `${field}-error` }
      : {};
  }

  function fieldError(field) {
    return errosCampos[field]
      ? <div id={`${field}-error`} className="invalid-feedback d-block" role="alert">{errosCampos[field]}</div>
      : null;
  }

  if (carregandoItem) {
    return <LoadingState label="Carregando dados do item..." />;
  }

  const parecer =
    itemAtual?.ultima_devolucao?.comentario || itemAtual?.justificativa_devolucao || "";
  const totalVisual = Number(form.quantidade || 0) * Number(form.valor_estimado || 0);
  const camposCatalogoBloqueados = origem === "catalogo" && Boolean(form.item_catalogo);

  return (
    <div className="row justify-content-center">
      <div className="col-md-8">
        <PageHeader eyebrow="Minhas demandas" title={isEditing ? "Editar item" : "Adicionar item"} />

        <ApiErrorMessage error={erro} title="Não foi possível salvar o item" />
        {mensagem && (
          <InlineMessage variant="success" title="Operação concluída">
            {mensagem}
          </InlineMessage>
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

        <form onSubmit={handleSubmit} noValidate>
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
              id="item_catalogo"
              selectedItem={itemCatalogo}
              onSelect={selecionarItemCatalogo}
              error={errosCampos.item_catalogo}
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
              <input id="nome" className="form-control" value={form.nome} onChange={(e) => atualizar("nome", e.target.value)} required disabled={camposCatalogoBloqueados} {...errorProps("nome")} />
              {fieldError("nome")}
            </div>
            <div className="col-12">
              <label htmlFor="descricao" className="form-label">Descrição</label>
              <textarea id="descricao" className="form-control" rows={2} value={form.descricao} onChange={(e) => atualizar("descricao", e.target.value)} required disabled={camposCatalogoBloqueados} {...errorProps("descricao")} />
              {fieldError("descricao")}
            </div>
            <div className="col-md-4">
              <label htmlFor="unidade_medida" className="form-label">Unidade de medida</label>
              <input id="unidade_medida" className="form-control" value={form.unidade_medida} onChange={(e) => atualizar("unidade_medida", e.target.value)} required disabled={camposCatalogoBloqueados} {...errorProps("unidade_medida")} />
              {fieldError("unidade_medida")}
            </div>
            <div className="col-md-4">
              <label htmlFor="quantidade" className="form-label">Quantidade</label>
              <input id="quantidade" type="number" min="1" className="form-control" value={form.quantidade} onChange={(e) => atualizar("quantidade", e.target.value)} required {...errorProps("quantidade")} />
              {fieldError("quantidade")}
            </div>
            <div className="col-md-4">
              <label htmlFor="valor_estimado" className="form-label">Valor estimado unitário</label>
              <input id="valor_estimado" type="number" min="0.01" step="0.01" className="form-control" value={form.valor_estimado} onChange={(e) => atualizar("valor_estimado", e.target.value)} required {...errorProps("valor_estimado")} />
              {fieldError("valor_estimado")}
            </div>
            <div className="col-md-4">
              <label htmlFor="data_prevista" className="form-label">Data prevista</label>
              <input id="data_prevista" type="date" className="form-control" value={form.data_prevista} onChange={(e) => atualizar("data_prevista", e.target.value)} required {...errorProps("data_prevista")} />
              {fieldError("data_prevista")}
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
              <input id="indicacao_orcamentaria" className="form-control" value={form.indicacao_orcamentaria} onChange={(e) => atualizar("indicacao_orcamentaria", e.target.value)} required {...errorProps("indicacao_orcamentaria")} />
              {fieldError("indicacao_orcamentaria")}
            </div>
            <div className="col-md-6">
              <label htmlFor="justificativa_prioridade" className="form-label">Justificativa da prioridade</label>
              <textarea id="justificativa_prioridade" className="form-control" rows={2} value={form.justificativa_prioridade} onChange={(e) => atualizar("justificativa_prioridade", e.target.value)} required={form.prioridade === "alta"} aria-required={form.prioridade === "alta"} {...errorProps("justificativa_prioridade")} />
              <div className="form-text">Obrigatória apenas quando a prioridade for alta.</div>
              {fieldError("justificativa_prioridade")}
            </div>
            <div className="col-md-6">
              <label htmlFor="justificativa_necessidade" className="form-label">Justificativa da necessidade</label>
              <textarea id="justificativa_necessidade" className="form-control" rows={2} value={form.justificativa_necessidade} onChange={(e) => atualizar("justificativa_necessidade", e.target.value)} required {...errorProps("justificativa_necessidade")} />
              {fieldError("justificativa_necessidade")}
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

          <Button type="submit" className="mt-3" loading={enviando} disabled={reenviando}>
            {enviando ? "Salvando..." : isEditing ? "Salvar alterações" : "Adicionar item"}
          </Button>
          {isEditing && itemAtual?.status === "devolvida" && (
            <>
              <Button variant="success" className="mt-3 ms-2" loading={reenviando} disabled={enviando || isDirty} onClick={() => setConfirmarReenvio(true)}>
                {reenviando ? "Reenviando..." : "Reenviar"}
              </Button>
              {isDirty && <div className="form-text">Salve as alterações antes de reenviar.</div>}
            </>
          )}
        </form>
      </div>
      <ConfirmDialog
        open={confirmarReenvio}
        title="Reenviar item"
        confirmLabel="Confirmar reenvio"
        confirmVariant="success"
        loading={reenviando}
        onClose={() => setConfirmarReenvio(false)}
        onConfirm={handleReenviar}
      >
        <p className="mb-0">Confirma o reenvio deste item corrigido para validação?</p>
      </ConfirmDialog>
    </div>
  );
}
