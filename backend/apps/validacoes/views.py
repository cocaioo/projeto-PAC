from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import redirect, render
from apps.demandas.constants import pode_transicionar_item
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import sincronizar_status_macro_demanda
from .models import TipoAcao, Validacao

@login_required
def validacao_list(request):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    itens = ItemDemanda.objects.filter(
        status=StatusItemDemanda.AGUARDANDO_VALIDACAO
    ).select_related("demanda", "demanda__unidade", "demanda__usuario")

    return render(request, "validacoes/list.html", {"itens": itens})

lista_pendentes = validacao_list

@login_required
def validar_item(request, item_pk):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    with transaction.atomic():
        item = ItemDemanda.objects.select_for_update().filter(pk=item_pk).first()
        if item is None:
            messages.error(request, "Item não encontrado.")
            return redirect("validacoes:lista")

        demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
        if demanda_locked.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            messages.error(request, "Não é permitido alterar solicitações encerradas ou canceladas.")
            return redirect("validacoes:lista")

        acao = request.POST.get("acao")
        comentario = request.POST.get("comentario", "").strip()

        if acao == "aprovar":
            novo_status = StatusItemDemanda.VALIDADA
            tipo_acao = TipoAcao.VALIDADO
        elif acao == "devolver":
            if not comentario:
                messages.error(request, "Ao devolver um item, o comentário é obrigatório.")
                return redirect("validacoes:lista")
            novo_status = StatusItemDemanda.DEVOLVIDA
            tipo_acao = TipoAcao.DEVOLVIDO
        else:
            messages.error(request, "Ação inválida.")
            return redirect("validacoes:lista")

        if not pode_transicionar_item(item.status, novo_status):
            messages.error(request, f"Transição de status inválida de {item.status} para {novo_status}.")
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
