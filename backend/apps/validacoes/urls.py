from django.urls import path
from . import views

app_name = "validacoes"

urlpatterns = [
    path("", views.lista_pendentes, name="lista"),
    path("pendentes/", views.lista_pendentes, name="lista_pendentes"),
    path("item/<int:item_pk>/decidir/", views.validar_item, name="validar_item"),
]
