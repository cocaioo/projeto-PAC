from django.urls import path
from . import views

app_name = "demandas"

urlpatterns = [
    path("", views.demanda_list, name="lista"),
    path("nova/", views.demanda_create, name="criar"),
    path("<int:pk>/", views.demanda_detail, name="detalhe"),
    path("<int:pk>/editar/", views.demanda_update, name="editar"),
    path("<int:pk>/enviar/", views.demanda_enviar, name="enviar"),
    path("<int:demanda_pk>/itens/novo/", views.item_create, name="item_criar"),
    path("itens/<int:pk>/editar/", views.item_update, name="item_editar"),
    path("itens/<int:pk>/reenviar/", views.item_reenviar, name="item_reenviar"),
]
