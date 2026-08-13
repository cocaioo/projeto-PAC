// Utilidades de formatação para o front-end.

// Formata um valor numérico como moeda brasileira (R$).
export function formatCurrency(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Rótulos legíveis para os status de demanda/item.
export const STATUS_LABELS = {
  rascunho: "Rascunho",
  aguardando_validacao: "Aguardando Validação",
  em_andamento: "Em Andamento",
  concluida: "Concluída",
  devolvida: "Devolvida",
  validada: "Validada",
  consolidada: "Consolidada no DFD",
  vinculada_dfd: "Vinculada ao DFD",
  cancelada: "Cancelada",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Classe de badge Bootstrap por status.
export function statusBadge(status) {
  const mapa = {
    rascunho: "bg-secondary",
    aguardando_validacao: "bg-warning text-dark",
    em_andamento: "bg-info text-dark",
    concluida: "bg-success",
    devolvida: "bg-danger",
    validada: "bg-success",
    consolidada: "bg-primary",
    vinculada_dfd: "bg-primary",
    cancelada: "bg-dark",
  };
  return mapa[status] || "bg-secondary";
}
