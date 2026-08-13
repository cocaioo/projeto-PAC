from django.contrib import admin

from .models import GrupoContratacao


@admin.register(GrupoContratacao)
class GrupoContratacaoAdmin(admin.ModelAdmin):
    list_display = ("nome", "unidade_admin", "ativo")
    list_filter = ("ativo", "unidade_admin")
    search_fields = ("nome", "descricao", "unidade_admin__sigla", "unidade_admin__nome")
    autocomplete_fields = ("unidade_admin",)
