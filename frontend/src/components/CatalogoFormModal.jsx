import { useEffect, useState } from "react";
import ApiErrorMessage from "./ApiErrorMessage";
import { Button, Input, Modal, Select, Textarea } from "./ui";

const EMPTY_FORM = {
  tipo: "material",
  nome: "",
  descricao: "",
  codigo_catmat_catser: "",
  grupo: "",
  unidade_medida: "",
  valor_estimado: "",
};

export function validateCatalogoItem(values) {
  const errors = {};
  if (!values.nome.trim()) errors.nome = "Informe o nome do item.";
  if (!values.descricao.trim()) errors.descricao = "Informe a descrição do item.";
  if (!values.grupo) errors.grupo = "Selecione o grupo de contratação.";
  if (!values.unidade_medida.trim()) errors.unidade_medida = "Informe a unidade de medida.";
  if (!values.valor_estimado || Number(values.valor_estimado) <= 0) {
    errors.valor_estimado = "Informe um valor estimado maior que zero.";
  }
  return errors;
}

export default function CatalogoFormModal({
  open,
  item,
  grupos,
  onClose,
  onSubmit,
  busy = false,
  requestError,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    setForm(item ? {
      tipo: item.tipo || "material",
      nome: item.nome || "",
      descricao: item.descricao || "",
      codigo_catmat_catser: item.codigo_catmat_catser || "",
      grupo: item.grupo ? String(item.grupo) : "",
      unidade_medida: item.unidade_medida || "",
      valor_estimado: item.valor_estimado || "",
    } : EMPTY_FORM);
    setErrors({});
  }, [item, open]);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event) {
    event.preventDefault();
    const validationErrors = validateCatalogoItem(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    await onSubmit({
      ...form,
      grupo: Number(form.grupo),
      valor_estimado: Number(form.valor_estimado),
    });
  }

  return (
    <Modal
      open={open}
      title={item ? "Editar item do catálogo" : "Cadastrar item no catálogo"}
      onClose={busy ? undefined : onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" form="catalogo-item-form" loading={busy}>
            {item ? "Salvar alterações" : "Cadastrar item"}
          </Button>
        </>
      )}
    >
      <ApiErrorMessage error={requestError} title="Não foi possível salvar o item" />
      <form id="catalogo-item-form" onSubmit={submit} noValidate>
        <Select label="Tipo" value={form.tipo} onChange={(event) => update("tipo", event.target.value)}>
          <option value="material">Material</option>
          <option value="servico">Serviço</option>
        </Select>
        <Input label="Nome" value={form.nome} onChange={(event) => update("nome", event.target.value)} error={errors.nome} required />
        <Textarea label="Descrição" rows={3} value={form.descricao} onChange={(event) => update("descricao", event.target.value)} error={errors.descricao} required />
        <Input label="Código CATMAT/CATSER" value={form.codigo_catmat_catser} onChange={(event) => update("codigo_catmat_catser", event.target.value)} hint="Opcional." />
        <Select label="Grupo de contratação" value={form.grupo} onChange={(event) => update("grupo", event.target.value)} error={errors.grupo} required>
          <option value="">Selecione...</option>
          {grupos.map((grupo) => <option key={grupo.id} value={grupo.id}>{grupo.nome}</option>)}
        </Select>
        <Input label="Unidade de medida" value={form.unidade_medida} onChange={(event) => update("unidade_medida", event.target.value)} error={errors.unidade_medida} required />
        <Input label="Valor estimado" type="number" min="0.01" step="0.01" value={form.valor_estimado} onChange={(event) => update("valor_estimado", event.target.value)} error={errors.valor_estimado} required />
      </form>
    </Modal>
  );
}
