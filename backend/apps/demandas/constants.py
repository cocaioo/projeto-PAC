from apps.demandas.models import StatusDemanda, StatusItemDemanda


TRANSICOES_STATUS_DEMANDA = {
    StatusDemanda.RASCUNHO: {
        StatusDemanda.AGUARDANDO_VALIDACAO,
        StatusDemanda.CANCELADA,
    },
    StatusDemanda.AGUARDANDO_VALIDACAO: {
        StatusDemanda.EM_ANDAMENTO,
        StatusDemanda.CONCLUIDA,
        StatusDemanda.CANCELADA,
    },
    StatusDemanda.EM_ANDAMENTO: {
        StatusDemanda.CONCLUIDA,
        StatusDemanda.CANCELADA,
    },
    StatusDemanda.CONCLUIDA: set(),
    StatusDemanda.CANCELADA: set(),
}


TRANSICOES_STATUS_ITEM = {
    StatusItemDemanda.RASCUNHO: {
        StatusItemDemanda.AGUARDANDO_VALIDACAO,
        StatusItemDemanda.CANCELADA,
    },
    StatusItemDemanda.AGUARDANDO_VALIDACAO: {
        StatusItemDemanda.DEVOLVIDA,
        StatusItemDemanda.VALIDADA,
        StatusItemDemanda.CANCELADA,
    },
    StatusItemDemanda.DEVOLVIDA: {
        StatusItemDemanda.RASCUNHO,
        StatusItemDemanda.AGUARDANDO_VALIDACAO,
        StatusItemDemanda.CANCELADA,
    },
    StatusItemDemanda.VALIDADA: {
        StatusItemDemanda.VINCULADA_DFD,
        StatusItemDemanda.CANCELADA,
    },
    StatusItemDemanda.VINCULADA_DFD: set(),
    StatusItemDemanda.CANCELADA: set(),
}


def pode_transicionar_demanda(status_atual, novo_status):
    """
    Verifica genericamente se a transição entre status_atual e novo_status é válida para Demanda.
    """
    return novo_status in TRANSICOES_STATUS_DEMANDA.get(status_atual, set())


def pode_transicionar_item(status_atual, novo_status):
    """
    Verifica genericamente se a transição entre status_atual e novo_status é válida para ItemDemanda.
    """
    return novo_status in TRANSICOES_STATUS_ITEM.get(status_atual, set())
