from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.db.models import Q
from django.shortcuts import redirect, render

from apps.demandas.constants import pode_transicionar_item
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import sincronizar_status_macro_demanda

from .models import TipoAcao, Validacao


def _itens_no_escopo_do_admin(queryset, user):
    if user.is_admin_master_user:
        return queryset
    if not user.is_admin_user:
        return queryset.none()
    return queryset.filter(
        user.filtro_grupos_administrados("item_catalogo__grupo")
        | Q(item_catalogo__isnull=True, demanda__unidade_id=user.unidade_id)
    )


def _usuario_pode_decidir_item(user, item):
    if user.is_admin_master_user:
        return True
    if item.item_catalogo_id:
        return user.pode_administrar_grupo(item.item_catalogo.grupo)
    return bool(user.unidade_id and item.demanda.unidade_id == user.unidade_id)


@login_required
def validacao_list(request):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    itens = ItemDemanda.objects.filter(
        status=StatusItemDemanda.AGUARDANDO_VALIDACAO
    ).select_related(
        "demanda",
        "demanda__unidade",
        "demanda__usuario",
        "item_catalogo__grupo",
    )
    itens = _itens_no_escopo_do_admin(itens, request.user)

    return render(request, "validacoes/list.html", {"itens": itens})


lista_pendentes = validacao_list


@login_required
def validar_item(request, item_pk):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    with transaction.atomic():
        item_ref = ItemDemanda.objects.filter(pk=item_pk).values("demanda_id").first()
        if item_ref is None:
            messages.error(request, "Item nao encontrado.")
            return redirect("validacoes:lista")
        demanda_locked = Demanda.objects.select_for_update().get(pk=item_ref["demanda_id"])
        item = (
            ItemDemanda.objects.select_for_update(of=("self",))
            .select_related("demanda", "item_catalogo__grupo")
            .get(pk=item_pk, demanda_id=demanda_locked.pk)
        )
        if not _usuario_pode_decidir_item(request.user, item):
            messages.error(request, "Voce nao tem permissao para validar itens deste grupo.")
            return redirect("validacoes:lista")

        if demanda_locked.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
            return redirect("validacoes:lista")

        acao = request.POST.get("acao")
        comentario = request.POST.get("comentario", "").strip()

        if acao == "aprovar":
            novo_status = StatusItemDemanda.VALIDADA
            tipo_acao = TipoAcao.VALIDADO
        elif acao == "devolver":
            if not comentario:
                messages.error(request, "Ao devolver um item, o comentario e obrigatorio.")
                return redirect("validacoes:lista")
            novo_status = StatusItemDemanda.DEVOLVIDA
            tipo_acao = TipoAcao.DEVOLVIDO
        else:
            messages.error(request, "Acao invalida.")
            return redirect("validacoes:lista")

        if not pode_transicionar_item(item.status, novo_status):
            messages.error(request, f"Transicao de status invalida de {item.status} para {novo_status}.")
            return redirect("validacoes:lista")

        item.status = novo_status
        item.save(update_fields=["status", "atualizado_em"])

        Validacao.objects.create(
            item_demanda=item,
            usuario=request.user,
            acao=tipo_acao,
            comentario=comentario,
        )

        sincronizar_status_macro_demanda(demanda_locked)

    messages.success(request, f"Item '{item.nome}' processado com sucesso.")
    return redirect("validacoes:lista")
