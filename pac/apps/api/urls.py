"""
Rotas da API REST do PAC UFPI (prefixo /api/).
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("unidades", views.UnidadeViewSet, basename="unidade")
router.register("grupos", views.GrupoContratacaoViewSet, basename="grupo")
router.register("catalogo", views.ItemCatalogoViewSet, basename="catalogo")
router.register("demandas", views.DemandaViewSet, basename="demanda")
router.register("itens", views.ItemDemandaViewSet, basename="item")
router.register("validacoes", views.ValidacaoViewSet, basename="validacao")
router.register("dfds", views.DFDViewSet, basename="dfd")

app_name = "api"

urlpatterns = [
    # Autenticação por sessão.
    path("auth/csrf/", views.csrf, name="csrf"),
    path("auth/login/", views.login_view, name="login"),
    path("auth/logout/", views.logout_view, name="logout"),
    path("auth/me/", views.me_view, name="me"),

    # Dashboard.
    path("dashboard/stats/", views.DashboardStatsView.as_view(), name="dashboard-stats"),
    path("consolidacoes/itens-elegiveis/", views.ItensElegiveisConsolidacaoView.as_view(), name="itens-elegiveis"),
    path("dfds/consolidar/", views.ConsolidarDFDView.as_view(), name="dfd-consolidar"),

    # Recursos REST.
    path("", include(router.urls)),
]
