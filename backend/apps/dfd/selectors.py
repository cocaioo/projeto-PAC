"""Consultas de leitura para a consolida\u00e7\u00e3o de DFDs."""

from collections import OrderedDict

from django.db.models import Count

from apps.demandas.models import ItemDemanda, StatusItemDemanda


def listar_itens_elegiveis(*, usuario, ciclo_pac_id=None, item_catalogo_id=None,
                            grupo_contratacao_id=None):
    """Retorna somente itens que o administrador informado pode consolidar."""
    queryset = ItemDemanda.objects.filter(
        status=StatusItemDemanda.VALIDADA,
        dfd__isnull=True,
        item_catalogo__isnull=False,
        demanda__ciclo_pac__ativo=True,
    ).select_related(
        "item_catalogo",
        "item_catalogo__grupo",
        "demanda",
        "demanda__ciclo_pac",
        "demanda__unidade",
        "demanda__usuario",
    )
    if ciclo_pac_id:
        queryset = queryset.filter(demanda__ciclo_pac_id=ciclo_pac_id)
    if item_catalogo_id:
        queryset = queryset.filter(item_catalogo_id=item_catalogo_id)
    if grupo_contratacao_id:
        queryset = queryset.filter(item_catalogo__grupo_id=grupo_contratacao_id)
    if not getattr(usuario, "is_admin_master_user", False):
        if not getattr(usuario, "unidade_id", None):
            return queryset.none()
        queryset = queryset.filter(
            item_catalogo__grupo__unidade_admin_id=usuario.unidade_id
        )
    return queryset.order_by(
        "-demanda__ciclo_pac__ano",
        "item_catalogo__grupo__nome",
        "item_catalogo__nome",
        "demanda__unidade__nome",
        "demanda_id",
        "id",
    )


def listar_ciclos_elegiveis(*, usuario):
    """Lista ciclos ativos que possuem ao menos um item no escopo do admin."""
    return list(
        listar_itens_elegiveis(usuario=usuario)
        .values(
            "demanda__ciclo_pac_id",
            "demanda__ciclo_pac__ano",
            "demanda__ciclo_pac__ativo",
        )
        .annotate(total_itens_elegiveis=Count("id"))
        .order_by("-demanda__ciclo_pac__ano")
    )


def agrupar_itens_elegiveis(queryset):
    """Agrupa por ciclo, grupo e cat\u00e1logo, preservando cada solicita\u00e7\u00e3o.

    O agrupamento em Python evita perder os dados de solicitante necess\u00e1rios ao
    detalhamento da tela. Todas as rela\u00e7\u00f5es usadas aqui s\u00e3o carregadas pelo
    ``select_related`` de :func:`listar_itens_elegiveis`.
    """
    grupos = OrderedDict()
    for item in queryset:
        catalogo = item.item_catalogo
        grupo = catalogo.grupo
        demanda = item.demanda
        ciclo = demanda.ciclo_pac
        unidade = demanda.unidade
        solicitante = demanda.usuario
        chave = (ciclo.id, grupo.id, catalogo.id)

        if chave not in grupos:
            grupos[chave] = {
                "ciclo_pac": {
                    "id": ciclo.id,
                    "ano": ciclo.ano,
                    "ativo": ciclo.ativo,
                },
                "grupo_contratacao": {
                    "id": grupo.id,
                    "nome": grupo.nome,
                },
                "item_catalogo": {
                    "id": catalogo.id,
                    "nome": catalogo.nome,
                    "codigo_catmat_catser": catalogo.codigo_catmat_catser,
                    "unidade_medida": catalogo.unidade_medida,
                    "valor_estimado": catalogo.valor_estimado,
                },
                "quantidade_total": 0,
                "valor_total_estimado": 0,
                "total_solicitacoes": 0,
                "item_ids": [],
                "detalhamento_por_unidade": OrderedDict(),
            }

        consolidado = grupos[chave]
        consolidado["quantidade_total"] += item.quantidade
        consolidado["valor_total_estimado"] += item.valor_total
        consolidado["total_solicitacoes"] += 1
        consolidado["item_ids"].append(item.id)

        if unidade.id not in consolidado["detalhamento_por_unidade"]:
            consolidado["detalhamento_por_unidade"][unidade.id] = {
                "unidade": {
                    "id": unidade.id,
                    "nome": unidade.nome,
                    "sigla": unidade.sigla,
                },
                "quantidade_total": 0,
                "total_solicitacoes": 0,
                "solicitacoes": [],
            }
        detalhe_unidade = consolidado["detalhamento_por_unidade"][unidade.id]
        detalhe_unidade["quantidade_total"] += item.quantidade
        detalhe_unidade["total_solicitacoes"] += 1
        nome_solicitante = solicitante.get_full_name().strip() or solicitante.username
        detalhe_unidade["solicitacoes"].append({
            "item_id": item.id,
            "demanda_id": demanda.id,
            "solicitante": {
                "id": solicitante.id,
                "nome": nome_solicitante,
            },
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_estimado,
            "valor_total": item.valor_total,
            "data_prevista": item.data_prevista,
            "prioridade": item.prioridade,
        })

    resultado = []
    for consolidado in grupos.values():
        detalhes = list(consolidado["detalhamento_por_unidade"].values())
        consolidado["detalhamento_por_unidade"] = detalhes
        # Campo mantido para clientes do primeiro contrato do endpoint.
        consolidado["quantidades_por_unidade"] = [
            {
                "unidade_id": detalhe["unidade"]["id"],
                "unidade_nome": detalhe["unidade"]["nome"],
                "quantidade": detalhe["quantidade_total"],
            }
            for detalhe in detalhes
        ]
        resultado.append(consolidado)
    return resultado
