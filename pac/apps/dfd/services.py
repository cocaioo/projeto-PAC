"""Servi\u00e7o transacional de consolida\u00e7\u00e3o de DFD."""

from django.db import transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from apps.auditoria.models import LogAuditoria
from apps.demandas.models import (
    CicloPAC,
    Demanda,
    ItemDemanda,
    StatusDemanda,
    StatusItemDemanda,
)
from apps.demandas.services import sincronizar_status_macro_demanda
from .models import DFD


class ConflitoConsolidacao(Exception):
    def __init__(self, message, item_ids=None):
        self.message = message
        self.item_ids = item_ids or []
        super().__init__(message)


def _pode_administrar_grupo(usuario, grupo):
    return usuario.is_admin_master_user or (
        usuario.is_admin_user and usuario.unidade_id == grupo.unidade_admin_id
    )


@transaction.atomic
def consolidar_itens_em_dfd(*, usuario, numero_dfd, item_ids, ciclo_pac_id):
    if not getattr(usuario, "is_admin_user", False):
        raise PermissionDenied("O usu\u00e1rio n\u00e3o possui permiss\u00e3o para consolidar itens.")
    ciclo = CicloPAC.objects.filter(pk=ciclo_pac_id).first()
    if ciclo is None:
        raise ValidationError({"ciclo_pac_id": "Ciclo PAC inexistente."})
    if not ciclo.ativo:
        raise ValidationError({"ciclo_pac_id": "O ciclo PAC informado est\u00e1 inativo."})
    ids = set(item_ids)
    itens = list(ItemDemanda.objects.select_for_update().select_related(
        "demanda", "demanda__ciclo_pac", "item_catalogo__grupo"
    ).filter(id__in=ids).order_by("id"))
    if len(itens) != len(ids):
        encontrados = {item.id for item in itens}
        raise ValidationError({"item_ids": f"Itens inexistentes: {sorted(ids - encontrados)}"})

    invalidos = []
    grupos = set()
    for item in itens:
        # Item manual n\u00e3o possui grupo de contrata\u00e7\u00e3o verific\u00e1vel e,
        # portanto, n\u00e3o participa do contrato novo de consolida\u00e7\u00e3o.
        if item.item_catalogo_id is None:
            invalidos.append(item.id)
            continue
        if (
            item.status != StatusItemDemanda.VALIDADA
            or item.dfd_id
            or item.demanda.ciclo_pac_id != ciclo_pac_id
            or item.demanda.status
            in (StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA)
            or not _pode_administrar_grupo(usuario, item.item_catalogo.grupo)
        ):
            invalidos.append(item.id)
        grupos.add(item.item_catalogo.grupo_id)
    if invalidos:
        raise ConflitoConsolidacao("Um ou mais itens n\u00e3o est\u00e3o eleg\u00edveis para consolida\u00e7\u00e3o.", invalidos)
    if len(grupos) != 1:
        raise ConflitoConsolidacao("Todos os itens de um DFD devem pertencer ao mesmo grupo.", [item.id for item in itens])

    grupo_id = grupos.pop()
    dfd, criado = DFD.objects.get_or_create(
        numero=numero_dfd, ciclo_pac_id=ciclo_pac_id,
        defaults={"grupo_id": grupo_id, "criado_por": usuario},
    )
    if dfd.grupo_id != grupo_id:
        raise ConflitoConsolidacao("O n\u00famero de DFD j\u00e1 pertence a outro grupo neste ciclo.", [item.id for item in itens])

    for item in itens:
        item.dfd = dfd
        item.status = StatusItemDemanda.VINCULADA_DFD
    ItemDemanda.objects.bulk_update(itens, ["dfd", "status"])
    # Mant\u00e9m a rela\u00e7\u00e3o legada sincronizada durante a transi\u00e7\u00e3o do schema.
    dfd.itens_demanda.add(*itens)
    LogAuditoria.objects.create(
        usuario=usuario, acao="consolidacao_dfd", modelo="DFD", objeto_id=dfd.id,
        dados_novos={"numero": dfd.numero, "item_ids": [item.id for item in itens], "criado": criado},
    )
    demanda_ids = sorted({item.demanda_id for item in itens})
    for demanda in Demanda.objects.select_for_update().filter(id__in=demanda_ids).order_by("id"):
        sincronizar_status_macro_demanda(demanda)
    return {"dfd": dfd, "itens": itens, "criado": criado, "demandas_afetadas": demanda_ids}
