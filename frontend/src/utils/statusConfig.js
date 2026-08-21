export const STATUS_CONFIG = Object.freeze({
  rascunho: { label: "Rascunho", variant: "neutral", icon: "bi-pencil" },
  aguardando_validacao: { label: "Aguardando validação", variant: "warning", icon: "bi-hourglass-split" },
  em_andamento: { label: "Em andamento", variant: "info", icon: "bi-arrow-repeat" },
  devolvida: { label: "Devolvida", variant: "danger", icon: "bi-arrow-return-left" },
  validada: { label: "Validada", variant: "success", icon: "bi-check-circle" },
  consolidada: { label: "Consolidada", variant: "primary", icon: "bi-collection" },
  vinculada_dfd: { label: "Vinculada ao DFD", variant: "primary", icon: "bi-link-45deg" },
  concluida: { label: "Concluída", variant: "success", icon: "bi-check2-all" },
  cancelada: { label: "Cancelada", variant: "neutral", icon: "bi-x-circle" },
});

export const UNKNOWN_STATUS = Object.freeze({
  label: "Status desconhecido",
  variant: "neutral",
  icon: "bi-question-circle",
});

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || UNKNOWN_STATUS;
}

export function getStatusLabel(status) {
  return getStatusConfig(status).label;
}
