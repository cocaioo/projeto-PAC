from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import get_object_or_404, redirect, render

from apps.demandas.constants import pode_transicionar_item
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import sincronizar_status_macro_demanda
from apps.grupos_contratacao.models import GrupoContratacao

from .models import DFD


def _dfds_no_escopo_do_admin(queryset, user):
    if user.is_admin_master_user:
        return queryset
    if not user.is_admin_user:
        return queryset.none()
    return queryset.filter(user.filtro_grupos_administrados("grupo"))


def _itens_e_grupos_no_escopo_do_admin(user):
    itens = ItemDemanda.objects.filter(
        status=StatusItemDemanda.VALIDADA,
        dfd__isnull=True,
        item_catalogo__isnull=False,
    ).select_related(
        "demanda",
        "demanda__unidade",
        "item_catalogo__grupo",
    )
    grupos = GrupoContratacao.objects.filter(ativo=True)
    if user.is_admin_master_user:
        return itens, grupos
    if not user.is_admin_user:
        return itens.none(), grupos.none()
    return (
        itens.filter(user.filtro_grupos_administrados("item_catalogo__grupo")),
        grupos.filter(user.filtro_grupos_administrados("")),
    )


@login_required
def dfd_list(request):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")

    dfds = _dfds_no_escopo_do_admin(
        DFD.objects.select_related("grupo", "criado_por").prefetch_related("itens_demanda"),
        request.user,
    )
    return render(request, "dfd/list.html", {"dfds": dfds})


@login_required
def dfd_detail(request, pk):
    if not request.user.is_admin_user:
        messages.error(request, "Acesso restrito ao administrador.")
        return redirect("demandas:lista")
    dfd = get_object_or_404(
        _dfds_no_escopo_do_admin(
            DFD.objects.select_related("grupo", "criado_por").prefetch_related("itens_demanda"),
            request.user,
        ),
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
        try:
            grupo_id = int(request.POST.get("grupo"))
            item_ids = list(dict.fromkeys(int(item_id) for item_id in request.POST.getlist("itens")))
        except (TypeError, ValueError):
            messages.error(request, "Grupo e itens devem possuir identificadores inteiros validos.")
            return redirect("dfds:consolidar")

        if not numero or not grupo_id or not item_ids:
            messages.error(request, "Informe o numero do DFD, o grupo e selecione pelo menos um item.")
            return redirect("dfds:consolidar")

        grupo = GrupoContratacao.objects.filter(pk=grupo_id).first()
        if grupo is None:
            messages.error(request, "Grupo de contratacao nao encontrado.")
            return redirect("dfds:consolidar")
        if not request.user.is_admin_master_user and not request.user.pode_administrar_grupo(grupo):
            messages.error(request, "Voce nao tem permissao para consolidar itens deste grupo.")
            return redirect("dfds:consolidar")

        with transaction.atomic():
            item_refs = list(ItemDemanda.objects.filter(id__in=item_ids).values("id", "demanda_id"))
            if len(item_refs) != len(item_ids):
                messages.error(request, "Um ou mais itens selecionados nao foram encontrados.")
                return redirect("dfds:consolidar")

            demanda_ids = sorted({item["demanda_id"] for item in item_refs})
            demandas_locked = list(
                Demanda.objects.select_for_update().filter(id__in=demanda_ids).order_by("id")
            )
            itens = list(
                ItemDemanda.objects.select_for_update(of=("self",))
                .select_related("item_catalogo__grupo", "demanda__ciclo_pac")
                .filter(id__in=item_ids).order_by("id")
            )

            for demanda in demandas_locked:
                if demanda.status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
                    messages.error(request, f"A solicitacao #{demanda.id} esta encerrada ou cancelada.")
                    return redirect("dfds:consolidar")

            for item in itens:
                if item.item_catalogo_id is None or item.item_catalogo.grupo_id != grupo.id:
                    messages.error(request, "Todos os itens precisam pertencer ao grupo informado.")
                    return redirect("dfds:consolidar")
                if not pode_transicionar_item(item.status, StatusItemDemanda.VINCULADA_DFD):
                    messages.error(request, f"O item '{item.nome}' nao pode ser consolidado/vinculado.")
                    return redirect("dfds:consolidar")

            dfd = DFD.objects.create(
                numero=numero,
                grupo_id=grupo_id,
                criado_por=request.user,
                numero_processo=request.POST.get("numero_processo", ""),
                observacao=request.POST.get("observacao", ""),
                ciclo_pac=itens[0].demanda.ciclo_pac,
            )
            dfd.itens_demanda.set(itens)
            ItemDemanda.objects.filter(id__in=item_ids).update(
                status=StatusItemDemanda.VINCULADA_DFD
            )

            for demanda in demandas_locked:
                sincronizar_status_macro_demanda(demanda)

        messages.success(request, f"DFD #{dfd.numero} criado com sucesso.")
        return redirect("dfds:lista")

    itens_validados, grupos = _itens_e_grupos_no_escopo_do_admin(request.user)

    return render(
        request,
        "dfd/form_consolidar.html",
        {
            "itens": itens_validados,
            "grupos": grupos,
        },
    )
