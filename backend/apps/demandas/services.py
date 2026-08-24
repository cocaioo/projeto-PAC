from enum import StrEnum

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.demandas.models import (
    Demanda,
    ItemDemanda,
    Prioridade,
    StatusDemanda,
    StatusItemDemanda,
)


class ErroDominio(Exception):
    status_code = 400
    default_detail = "Operacao invalida."

    def __init__(self, detail=None):
        self.detail = detail if detail is not None else self.default_detail
        super().__init__(self.detail)


class ItemNaoEncontrado(ErroDominio):
    status_code = 404
    default_detail = "Item nao encontrado."


class OperacaoNaoPermitida(ErroDominio):
    status_code = 403
    default_detail = "Operacao nao permitida."


class DemandaEncerrada(ErroDominio):
    status_code = 409
    default_detail = "Nao e permitido alterar solicitacoes encerradas ou canceladas."


class TransicaoInvalida(ErroDominio):
    status_code = 400
    default_detail = "Somente itens devolvidos podem ser reenviados para validacao."


class ItemInvalidoParaEnvio(ErroDominio):
    status_code = 400


class OperacaoItemDemanda(StrEnum):
    VISUALIZAR = "visualizar"
    EDITAR = "editar"
    REENVIAR = "reenviar"
    VALIDAR = "validar"
    CONSOLIDAR = "consolidar"


OPERACOES_SOLICITANTE = {
    OperacaoItemDemanda.EDITAR,
    OperacaoItemDemanda.REENVIAR,
}
OPERACOES_ADMINISTRATIVAS = {
    OperacaoItemDemanda.VALIDAR,
    OperacaoItemDemanda.CONSOLIDAR,
}
STATUS_DEMANDA_TERMINAIS = {
    StatusDemanda.CANCELADA,
    StatusDemanda.CONCLUIDA,
}


def _usuario_autenticado(usuario) -> bool:
    return bool(usuario and getattr(usuario, "is_authenticated", False))


def _usuario_e_proprietario(usuario, item) -> bool:
    return item.demanda.usuario_id == usuario.id


def _usuario_admin_do_grupo(usuario, item) -> bool:
    if not getattr(usuario, "is_admin_user", False):
        return False
    if getattr(usuario, "is_admin_master_user", False):
        return False
    if not usuario.unidade_id:
        return False
    if item.item_catalogo_id is None:
        return item.demanda.unidade_id == usuario.unidade_id
    grupo = getattr(getattr(item, "item_catalogo", None), "grupo", None)
    return bool(grupo and grupo.unidade_admin_id == usuario.unidade_id)


def verificar_acesso_item_demanda(*, usuario, item, operacao: OperacaoItemDemanda) -> None:
    if not _usuario_autenticado(usuario):
        raise ItemNaoEncontrado()

    is_proprietario = _usuario_e_proprietario(usuario, item)
    is_admin_master = getattr(usuario, "is_admin_master_user", False)
    is_admin_grupo = _usuario_admin_do_grupo(usuario, item)
    is_admin = getattr(usuario, "is_admin_user", False)

    if operacao == OperacaoItemDemanda.VISUALIZAR:
        if is_proprietario or is_admin_master or is_admin_grupo:
            return
        raise ItemNaoEncontrado()

    if operacao in OPERACOES_SOLICITANTE:
        if is_proprietario:
            return
        if is_admin_master or is_admin_grupo:
            raise OperacaoNaoPermitida()
        raise ItemNaoEncontrado()

    if operacao in OPERACOES_ADMINISTRATIVAS:
        if is_admin_master or is_admin_grupo:
            return
        if is_proprietario or is_admin:
            raise OperacaoNaoPermitida()
        raise ItemNaoEncontrado()

    raise OperacaoNaoPermitida()


def sincronizar_status_macro_demanda(demanda: Demanda) -> str:
    """
    Recalcula o status macro da demanda de forma deterministica e idempotente.

    Itens cancelados sao ignorados no progresso. Quando todos os itens estao
    cancelados, o MVP preserva o status macro anterior nao terminal ate
    definicao formal da regra de dominio.
    """
    with transaction.atomic():
        demanda_locked = Demanda.objects.select_for_update().get(pk=demanda.pk)
        if demanda_locked.status in STATUS_DEMANDA_TERMINAIS:
            demanda.status = demanda_locked.status
            return demanda.status

        todos_status = list(demanda_locked.itens.values_list("status", flat=True))
        if not todos_status:
            novo_status = StatusDemanda.RASCUNHO
        else:
            ativos = [s for s in todos_status if s != StatusItemDemanda.CANCELADA]
            if not ativos:
                novo_status = demanda_locked.status
            elif all(s == StatusItemDemanda.RASCUNHO for s in ativos):
                novo_status = StatusDemanda.RASCUNHO
            elif all(s == StatusItemDemanda.AGUARDANDO_VALIDACAO for s in ativos):
                novo_status = StatusDemanda.AGUARDANDO_VALIDACAO
            elif all(s == StatusItemDemanda.VINCULADA_DFD for s in ativos):
                novo_status = StatusDemanda.CONCLUIDA
            else:
                novo_status = StatusDemanda.EM_ANDAMENTO

        if demanda_locked.status != novo_status:
            demanda_locked.status = novo_status
            demanda_locked.save(update_fields=["status", "atualizado_em"])

        demanda.status = demanda_locked.status
        return demanda.status


def validar_item_para_envio(item) -> dict:
    errors = {}

    if not item.nome or not item.nome.strip():
        errors["nome"] = ["O nome do item e obrigatorio."]
    if not item.quantidade or item.quantidade <= 0:
        errors["quantidade"] = ["A quantidade deve ser maior que zero."]
    if not item.valor_estimado or item.valor_estimado <= 0:
        errors["valor_estimado"] = ["O valor estimado unitario deve ser maior que zero."]
    if not item.data_prevista:
        errors["data_prevista"] = ["A data prevista e obrigatoria."]
    if not item.justificativa_necessidade or not item.justificativa_necessidade.strip():
        errors["justificativa_necessidade"] = ["A justificativa da necessidade e obrigatoria."]
    if (
        item.prioridade == Prioridade.ALTA
        and not (item.justificativa_prioridade or "").strip()
    ):
        errors["justificativa_prioridade"] = [
            "Informe a justificativa para prioridade alta."
        ]

    if errors:
        raise ValidationError(errors)
    return {}


def _validation_error_to_dict(exc: ValidationError) -> dict:
    if hasattr(exc, "message_dict"):
        return exc.message_dict
    if hasattr(exc, "messages"):
        return {"detail": exc.messages}
    return {"detail": [str(exc)]}


def validar_demanda_ativa_para_alteracao(demanda: Demanda) -> None:
    if demanda.status in STATUS_DEMANDA_TERMINAIS:
        raise DemandaEncerrada()


def validar_item_devolvido_para_reenvio(item: ItemDemanda) -> None:
    if item.status != StatusItemDemanda.DEVOLVIDA:
        raise TransicaoInvalida()


def reenviar_item_devolvido(*, item_id: int, usuario) -> ItemDemanda:
    if not _usuario_autenticado(usuario):
        raise ItemNaoEncontrado()

    with transaction.atomic():
        demanda_id = (
            ItemDemanda.objects.filter(pk=item_id)
            .values_list("demanda_id", flat=True)
            .first()
        )
        if demanda_id is None:
            raise ItemNaoEncontrado()

        try:
            demanda = Demanda.objects.select_for_update().get(pk=demanda_id)
        except Demanda.DoesNotExist as exc:
            raise ItemNaoEncontrado() from exc

        try:
            item = (
                ItemDemanda.objects.select_for_update(of=("self",))
                .select_related("demanda", "item_catalogo__grupo__unidade_admin")
                .get(pk=item_id, demanda_id=demanda.id)
            )
        except ItemDemanda.DoesNotExist as exc:
            raise ItemNaoEncontrado() from exc

        verificar_acesso_item_demanda(
            usuario=usuario,
            item=item,
            operacao=OperacaoItemDemanda.REENVIAR,
        )

        validar_demanda_ativa_para_alteracao(demanda)
        validar_item_devolvido_para_reenvio(item)

        try:
            validar_item_para_envio(item)
        except ValidationError as exc:
            raise ItemInvalidoParaEnvio(_validation_error_to_dict(exc)) from exc

        item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
        item.save(update_fields=["status", "atualizado_em"])
        sincronizar_status_macro_demanda(demanda)
        return item
