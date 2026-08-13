"""
Configuração de URLs do projeto PAC UFPI.

Rotas principais conforme documentação:
- /admin/       → Django Admin
- /             → Página inicial (dashboard)
- /dashboard/   → Dashboard gerencial
- /demandas/    → Gestão de demandas
- /validacoes/  → Validação de itens
- /catalogo/    → Catálogo de itens
- /dfds/        → Gestão de DFDs
- /login/       → Autenticação
- /logout/      → Logout
"""

from django.contrib import admin
from django.urls import include, path
from django.contrib.auth import views as auth_views

from apps.dashboard.views import home

# Personalização do Django Admin
admin.site.site_header = 'PAC UFPI — Administração'
admin.site.site_title = 'PAC UFPI Admin'
admin.site.index_title = 'Painel de Administração'

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # API REST (consumida pelo front-end React)
    path('api/', include('apps.api.urls')),

    # Página inicial
    path('', home, name='home'),

    # Autenticação
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),

    # Apps do PAC
    path('dashboard/', include('apps.dashboard.urls')),
    path('demandas/', include('apps.demandas.urls')),
    path('validacoes/', include('apps.validacoes.urls')),
    path('catalogo/', include('apps.catalogo.urls')),
    path('dfds/', include('apps.dfd.urls')),
    path('unidades/', include('apps.unidades.urls')),
    path('grupos/', include('apps.grupos_contratacao.urls')),
    path('usuarios/', include('apps.usuarios.urls')),
    path('auditoria/', include('apps.auditoria.urls')),
]
