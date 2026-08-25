from decimal import Decimal

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.api.views import demandas_no_escopo_do_usuario, itens_no_escopo_do_usuario

from .constants import pode_transicionar_demanda
from .forms import DemandaForm, ItemDemandaForm
from .models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from .services import sincronizar_status_macro_demanda, validar_item_para_envio


@login_required
def demanda_list(request):
    itens_visiveis = itens_no_escopo_do_usuario(ItemDemanda.objects.all(), request.user)
    qs = (
        Demanda.objects.select_related("unidade", "usuario")
        .prefetch_related(Prefetch("itens", queryset=itens_visiveis))
    )
    qs = demandas_no_escopo_do_usuario(qs, request.user)

    return render(request, "demandas/list.html", {"demandas": qs})


@login_required
def demanda_create(request):
    if request.method == "POST":
        form = DemandaForm(request.POST)

        if form.is_valid():
            demanda = form.save(commit=False)
            demanda.usuario = request.user
            demanda.unidade = getattr(request.user, "unidade", None)

            if not demanda.unidade:
                messages.error(
                    request,
                    "Seu usuario nao possui uma unidade vinculada. Contate o administrador.",
                )
                return render(request, "crud/form.html", {"form": form, "titulo": "Nova Demanda"})

            demanda.save()

            messages.success(request, "Demanda criada. Agora adicione os itens.")
            return redirect("demandas:detalhe", pk=demanda.pk)
    else:
        form = DemandaForm(initial={"ano_referencia": timezone.now().year + 1})

    return render(request, "crud/form.html", {"form": form, "titulo": "Nova Demanda"})


@login_required
def demanda_detail(request, pk):
    itens_visiveis = itens_no_escopo_do_usuario(ItemDemanda.objects.all(), request.user)
    demanda = get_object_or_404(
        demandas_no_escopo_do_usuario(
            Demanda.objects.select_related("unidade", "usuario").prefetch_related(
                Prefetch("itens", queryset=itens_visiveis)
            ),
            request.user,
        ),
        pk=pk,
    )

    return render(request, "demandas/detail.html", {"demanda": demanda})


@login_required
def demanda_update(request, pk):
    demanda = get_object_or_404(Demanda, pk=pk)

    if demanda.usuario != request.user:
        messages.error(request, "Voce nao tem permissao para editar esta demanda.")
        return redirect("demandas:lista")

    if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
        messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
        return redirect("demandas:detalhe", pk=pk)

    if demanda.status != StatusDemanda.RASCUNHO:
        messages.error(request, "Somente demandas em rascunho podem ser editadas.")
        return redirect("demandas:detalhe", pk=pk)

    form = DemandaForm(request.POST or None, instance=demanda)

    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Demanda atualizada.")
        return redirect("demandas:detalhe", pk=pk)

    return render(request, "crud/form.html", {"form": form, "titulo": "Editar Demanda"})


@login_required
def item_create(request, demanda_pk):
    demanda = get_object_or_404(Demanda, pk=demanda_pk)

    if demanda.usuario != request.user:
        messages.error(request, "Voce nao tem permissao para adicionar itens nesta demanda.")
        return redirect("demandas:lista")

    if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
        messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
        return redirect("demandas:detalhe", pk=demanda.pk)

    form = ItemDemandaForm(request.POST or None)

    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=demanda.pk)
            item = form.save(commit=False)
            item.demanda = demanda_locked
            item.status = StatusItemDemanda.RASCUNHO
            item.valor_total = Decimal(item.quantidade) * item.valor_estimado
            item.save()
            sincronizar_status_macro_demanda(demanda_locked)

        messages.success(request, "Item adicionado.")
        return redirect("demandas:detalhe", pk=demanda.pk)

    return render(request, "crud/form.html", {"form": form, "titulo": "Adicionar Item"})


@login_required
def item_update(request, pk):
    item = get_object_or_404(ItemDemanda, pk=pk)

    if item.demanda.usuario != request.user:
        messages.error(request, "Voce nao tem permissao para editar este item.")
        return redirect("demandas:lista")

    if item.demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
        messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
        return redirect("demandas:detalhe", pk=item.demanda_id)

    if item.demanda.status != StatusDemanda.RASCUNHO and item.status != StatusItemDemanda.DEVOLVIDA:
        messages.error(request, "Itens so podem ser editados enquanto a demanda estiver em rascunho ou devolvidos.")
        return redirect("demandas:detalhe", pk=item.demanda_id)

    form = ItemDemandaForm(request.POST or None, instance=item)

    if request.method == "POST" and form.is_valid():
        with transaction.atomic():
            demanda_locked = Demanda.objects.select_for_update().get(pk=item.demanda_id)
            item = form.save(commit=False)
            item.demanda = demanda_locked
            item.valor_total = Decimal(item.quantidade) * item.valor_estimado
            item.save()
            sincronizar_status_macro_demanda(demanda_locked)

        messages.success(request, "Item atualizado.")
        return redirect("demandas:detalhe", pk=item.demanda_id)

    return render(request, "crud/form.html", {"form": form, "titulo": "Editar Item"})


@require_POST
@login_required
def item_reenviar(request, pk):
    with transaction.atomic():
        item = (
            ItemDemanda.objects.select_for_update(of=("self",))
            .select_related("demanda")
            .filter(pk=pk)
            .first()
        )
        if item is None:
            messages.error(request, "Item nao encontrado.")
            return redirect("demandas:lista")

        demanda = Demanda.objects.select_for_update().get(pk=item.demanda_id)

        if item.demanda.usuario != request.user:
            messages.error(request, "Voce nao tem permissao para reenviar este item.")
            return redirect("demandas:detalhe", pk=item.demanda_id)

        if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
            return redirect("demandas:detalhe", pk=item.demanda_id)

        if item.status != StatusItemDemanda.DEVOLVIDA:
            messages.error(request, "Somente itens devolvidos podem ser reenviados para validacao.")
            return redirect("demandas:detalhe", pk=item.demanda_id)

        try:
            validar_item_para_envio(item)
        except ValidationError as ve:
            msg = ve.message if hasattr(ve, "message") else str(ve)
            messages.error(request, f"Erro ao reenviar item: {msg}")
            return redirect("demandas:detalhe", pk=item.demanda_id)

        item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
        item.save(update_fields=["status", "atualizado_em"])
        sincronizar_status_macro_demanda(demanda)

    messages.success(request, "Item reenviado para validacao com sucesso.")
    return redirect("demandas:detalhe", pk=item.demanda_id)


@require_POST
@login_required
def demanda_enviar(request, pk):
    with transaction.atomic():
        demanda = Demanda.objects.select_for_update().get(pk=pk)

        if demanda.usuario != request.user:
            messages.error(request, "Voce nao tem permissao para enviar esta demanda.")
            return redirect("demandas:lista")

        if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            messages.error(request, "Nao e permitido alterar solicitacoes encerradas ou canceladas.")
            return redirect("demandas:detalhe", pk=pk)

        if not demanda.itens.exists():
            messages.error(request, "Adicione pelo menos um item antes de enviar.")
            return redirect("demandas:detalhe", pk=pk)

        if not pode_transicionar_demanda(demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO):
            messages.error(
                request,
                f"Transicao invalida de {demanda.status} para {StatusDemanda.AGUARDANDO_VALIDACAO}.",
            )
            return redirect("demandas:detalhe", pk=pk)

        for item in demanda.itens.all():
            try:
                validar_item_para_envio(item)
            except ValidationError as ve:
                msg = ve.message if hasattr(ve, "message") else str(ve)
                messages.error(request, f"Erro no item '{item.nome}': {msg}")
                return redirect("demandas:detalhe", pk=pk)

        demanda.enviada_em = timezone.now()
        demanda.save(update_fields=["enviada_em", "atualizado_em"])
        demanda.itens.update(status=StatusItemDemanda.AGUARDANDO_VALIDACAO)
        sincronizar_status_macro_demanda(demanda)

    messages.success(request, "Demanda enviada para validacao.")
    return redirect("demandas:detalhe", pk=pk)
