from django.urls import path

from .views import (
    listar_usuarios,
    detalhe_usuario,
    ativar_usuario,
    desativar_usuario,
)

app_name = "usuarios"

urlpatterns = [
    path(
        "",
        listar_usuarios,
        name="lista",
    ),

    path(
        "<int:pk>/",
        detalhe_usuario,
        name="detalhe",
    ),

    path(
        "<int:pk>/ativar/",
        ativar_usuario,
        name="ativar",
    ),

    path(
        "<int:pk>/desativar/",
        desativar_usuario,
        name="desativar",
    ),
]
