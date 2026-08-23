from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.http import require_POST

from .models import Usuario


def _forbidden():
    return JsonResponse({"detail": "Acesso restrito ao ADMIN MASTER."}, status=403)


def _garantir_admin_master(request):
    if not request.user.is_authenticated:
        return _forbidden()
    if not request.user.is_admin_master_user:
        return _forbidden()
    return None


@login_required
def listar_usuarios(request):
    forbidden = _garantir_admin_master(request)
    if forbidden:
        return forbidden

    usuarios = list(
        Usuario.objects.values(
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "siape",
            "perfil",
            "is_active",
        )
    )

    return JsonResponse({
        "total": len(usuarios),
        "usuarios": usuarios,
    })


@login_required
def detalhe_usuario(request, pk):
    forbidden = _garantir_admin_master(request)
    if forbidden:
        return forbidden

    usuario = get_object_or_404(
        Usuario,
        pk=pk,
    )

    return JsonResponse({
        "id": usuario.id,
        "username": usuario.username,
        "nome": usuario.first_name,
        "sobrenome": usuario.last_name,
        "email": usuario.email,
        "siape": usuario.siape,
        "perfil": usuario.perfil,
        "unidade": (
            str(usuario.unidade)
            if usuario.unidade
            else None
        ),
        "ativo": usuario.is_active,
    })


@login_required
@require_POST
def ativar_usuario(request, pk):
    forbidden = _garantir_admin_master(request)
    if forbidden:
        return forbidden

    usuario = get_object_or_404(
        Usuario,
        pk=pk,
    )

    usuario.is_active = True
    usuario.save()

    return JsonResponse({
        "sucesso": True,
        "mensagem": "Usuario ativado com sucesso.",
    })


@login_required
@require_POST
def desativar_usuario(request, pk):
    forbidden = _garantir_admin_master(request)
    if forbidden:
        return forbidden

    usuario = get_object_or_404(
        Usuario,
        pk=pk,
    )

    usuario.is_active = False
    usuario.save()

    return JsonResponse({
        "sucesso": True,
        "mensagem": "Usuario desativado com sucesso.",
    })
