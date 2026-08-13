from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render
from apps.demandas.constants import pode_transicionar_item
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import sincronizar_status_macro_demanda
from apps.grupos_contratacao.models import GrupoContratacao
from .models import DFD

@login_required
def dfd_list(request):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    dfds = DFD.objects.select_related("grupo", "criado_por").prefetch_related("itens_demanda")
    return render(request, "dfd/list.html", {"dfds": dfds})

@login_required
def dfd_detail(request, pk):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")
    dfd = get_object_or_404(
        DFD.objects.select_related("grupo", "criado_por").prefetch_related("itens_demanda"),
        pk=pk,
    )
    return render(request, "dfd/detail.html", {"dfd": dfd})

@login_required
def dfd_consolidar(request):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    if request.method == "POST":
        numero = request.POST.get("numero")
        grupo_id = request.POST.get("grupo")
        raw_item_ids = request.POST.getlist("itens")
        item_ids = list(dict.fromkeys(raw_item_ids))

        if not numero or not grupo_id or not item_ids:
            messages.error(request, "Informe o número do DFD, o grupo e selecione pelo menos um item.")
            return redirect("dfd:consolidar")

        with transaction.atomic():
            itens = list(ItemDemanda.objects.select_for_update().filter(id__in=item_ids))
            if len(itens) != len(item_ids):
                messages.error(request, "Um ou mais itens selecionados não foram encontrados.")
                return redirect("dfd:consolidar")

            demanda_ids = sorted(set(item.demanda_id for item in itens))
            demandas_locked = list(
                Demanda.objects.select_for_update().filter(id__in=demanda_ids).order_by("id")
            )

            for demanda in demandas_locked:
                if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                    messages.error(request, f"A solicitação #{demanda.id} está encerrada ou cancelada.")
                    return redirect("dfd:consolidar")

            for item in itens:
                if not pode_transicionar_item(item.status, StatusItemDemanda.VINCULADA_DFD):
                    messages.error(request, f"O item '{item.nome}' não pode ser consolidado/vinculado.")
                    return redirect("dfd:consolidar")

            dfd = DFD.objects.create(
                numero=numero,
                grupo_id=grupo_id,
                criado_por=request.user,
                numero_processo=request.POST.get("numero_processo", ""),
                observacao=request.POST.get("observacao", ""),
            )
            dfd.itens_demanda.set(itens)
            ItemDemanda.objects.filter(id__in=item_ids).update(
                status=StatusItemDemanda.VINCULADA_DFD
            )

            for demanda in demandas_locked:
                sincronizar_status_macro_demanda(demanda)

        messages.success(request, f"DFD #{dfd.numero} criado com sucesso.")
        return redirect("dfd:lista")

    itens_validados = ItemDemanda.objects.filter(
        status=StatusItemDemanda.VALIDADA
    ).exclude(dfds__isnull=False).select_related("demanda", "demanda__unidade")

    grupos = GrupoContratacao.objects.filter(ativo=True)

    return render(request, "dfd/form_consolidar.html", {
        "itens": itens_validados,
        "grupos": grupos,
    })
