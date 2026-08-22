import { getStatusConfig } from "./statusConfig";

const DEFAULT_ROUTE = "";

function routeOrDefault(route) {
  return route || DEFAULT_ROUTE;
}

export function hasReturnedItems(demand) {
  return (demand?.itens || []).some((item) => item.status === "devolvida");
}

export function getDemandNextAction(demand = {}) {
  const id = demand.id;
  const returned = hasReturnedItems(demand);

  if (returned) {
    return {
      label: "Corrigir itens devolvidos",
      description: "Há itens que precisam de ajuste antes de nova validação.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "required",
    };
  }

  const actions = {
    rascunho: {
      label: "Editar rascunho",
      description: "Revise os itens e envie a demanda para validação.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "required",
    },
    aguardando_validacao: {
      label: "Aguardar validação",
      description: "A demanda está com a equipe administrativa.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "waiting",
      disabled: true,
    },
    devolvida: {
      label: "Corrigir demanda",
      description: "Revise os apontamentos e reenvie para validação.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "required",
    },
    validada: {
      label: "Acompanhar",
      description: "Os itens validados aguardam consolidação em DFD.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "follow",
    },
    consolidada: {
      label: "Ver DFD",
      description: "A demanda já foi consolidada em documento DFD.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "view",
    },
    vinculada_dfd: {
      label: "Ver DFD",
      description: "Consulte o vínculo do documento DFD.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "view",
    },
    concluida: {
      label: "Consultar histórico",
      description: "A demanda foi concluída.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "view",
    },
    cancelada: {
      label: "Consultar histórico",
      description: "A demanda foi cancelada.",
      route: routeOrDefault(id ? `/demandas/${id}` : ""),
      actionType: "view",
      disabled: true,
    },
  };

  return actions[demand.status] || {
    label: "Acompanhar",
    description: getStatusConfig(demand.status).label,
    route: routeOrDefault(id ? `/demandas/${id}` : ""),
    actionType: "follow",
  };
}

export function getItemNextAction(item = {}, demand = {}) {
  const demandId = demand.id || item.demanda || item.demanda_id;
  const itemId = item.id;
  const route = routeOrDefault(demandId && itemId ? `/demandas/${demandId}/itens/${itemId}/editar` : "");

  const actions = {
    rascunho: {
      label: "Editar item",
      description: "Complete os dados antes de enviar a demanda.",
      route,
      actionType: "required",
    },
    aguardando_validacao: {
      label: "Aguardar análise",
      description: "O item está com a equipe administrativa.",
      route: routeOrDefault(demandId ? `/demandas/${demandId}` : ""),
      actionType: "waiting",
      disabled: true,
    },
    devolvida: {
      label: "Corrigir item",
      description: "Ajuste o item conforme o parecer recebido.",
      route,
      actionType: "required",
    },
    validada: {
      label: "Acompanhar DFD",
      description: "Item validado e aguardando consolidação.",
      route: routeOrDefault(demandId ? `/demandas/${demandId}` : ""),
      actionType: "follow",
    },
    consolidada: {
      label: "Ver DFD",
      description: "Item consolidado em documento DFD.",
      route: routeOrDefault(demandId ? `/demandas/${demandId}` : ""),
      actionType: "view",
    },
    vinculada_dfd: {
      label: "Ver DFD",
      description: "Item vinculado a documento DFD.",
      route: routeOrDefault(demandId ? `/demandas/${demandId}` : ""),
      actionType: "view",
    },
  };

  return actions[item.status] || {
    label: "Acompanhar",
    description: getStatusConfig(item.status).label,
    route: routeOrDefault(demandId ? `/demandas/${demandId}` : ""),
    actionType: "follow",
  };
}
