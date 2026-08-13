"""Consultas de leitura para a consolida\u00e7\u00e3o de DFDs."""

from collections import defaultdict

from django.db.models import Count, Sum

from apps.demandas.models import ItemDemanda, StatusItemDemanda


def listar_itens_elegiveis(*, usuario, ciclo_pac_id=None, item_catalogo_id=None,
                            grupo_contratacao_id=None):
    """Retorna somente itens que o administrador informado pode consolidar."""
    queryset = ItemDemanda.objects.filter(
        status=StatusItemDemanda.VALIDADA,
        dfd__isnull=True,
        item_catalogo__isnull=False,
    ).select_related(
        "item_catalogo", "item_catalogo__grupo", "demanda", "demanda__unidade"
    )
    if ciclo_pac_id:
        queryset = queryset.filter(demanda__ciclo_pac_id=ciclo_pac_id)
    if item_catalogo_id:
        queryset = queryset.filter(item_catalogo_id=item_catalogo_id)
    if grupo_contratacao_id:
        queryset = queryset.filter(item_catalogo__grupo_id=grupo_contratacao_id)
    if not getattr(usuario, "is_admin_master_user", False):
        queryset = queryset.filter(item_catalogo__grupo__unidade_admin_id=usuario.unidade_id)
    return queryset


def agrupar_itens_elegiveis(queryset):
    """Agrupa itens eleg\u00edveis com totais num\u00e9ricos, prontos para a API."""
    grupos = list(queryset.values(
        "item_catalogo_id", "item_catalogo__nome", "item_catalogo__unidade_medida"
    ).annotate(
        quantidade_total=Sum("quantidade"), total_solicitacoes=Count("id")
    ).order_by("item_catalogo__nome"))
    ids_por_catalogo = defaultdict(list)
    unidades_por_catalogo = defaultdict(list)
    for row in queryset.values("id", "item_catalogo_id"):
        ids_por_catalogo[row["item_catalogo_id"]].append(row["id"])
    for row in queryset.values("item_catalogo_id", "demanda__unidade_id", "demanda__unidade__nome").annotate(
        quantidade=Sum("quantidade")
    ).order_by("demanda__unidade__nome"):
        unidades_por_catalogo[row["item_catalogo_id"]].append({
            "unidade_id": row["demanda__unidade_id"],
            "unidade_nome": row["demanda__unidade__nome"],
            "quantidade": row["quantidade"],
        })
    return [{
        "item_catalogo": {
            "id": row["item_catalogo_id"],
            "nome": row["item_catalogo__nome"],
            "unidade_medida": row["item_catalogo__unidade_medida"],
        },
        "quantidade_total": row["quantidade_total"],
        "total_solicitacoes": row["total_solicitacoes"],
        "quantidades_por_unidade": unidades_por_catalogo[row["item_catalogo_id"]],
        "item_ids": ids_por_catalogo[row["item_catalogo_id"]],
    } for row in grupos]
