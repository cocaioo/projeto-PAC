from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from .models import Usuario


def listar_usuarios(request):
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


def detalhe_usuario(request, pk):
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


def ativar_usuario(request, pk):
    usuario = get_object_or_404(
        Usuario,
        pk=pk,
    )

    usuario.is_active = True
    usuario.save()

    return JsonResponse({
        "sucesso": True,
        "mensagem": "Usuário ativado com sucesso.",
    })


def desativar_usuario(request, pk):
    usuario = get_object_or_404(
        Usuario,
        pk=pk,
    )

    usuario.is_active = False
    usuario.save()

    return JsonResponse({
        "sucesso": True,
        "mensagem": "Usuário desativado com sucesso.",
    })
