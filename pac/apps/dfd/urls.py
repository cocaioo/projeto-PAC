from django.urls import path
from . import views

app_name = "dfds"

urlpatterns = [
    path("", views.dfd_list, name="lista"),
    path("<int:pk>/", views.dfd_detail, name="detalhe"),
    path("consolidar/", views.dfd_consolidar, name="consolidar"),
]
