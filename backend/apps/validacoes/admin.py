from django.contrib import admin

from .models import Validacao


@admin.register(Validacao)
class ValidacaoAdmin(admin.ModelAdmin):
    list_display = ("item_demanda", "usuario", "acao", "criado_em")
    list_filter = ("acao", "criado_em")
    search_fields = (
        "item_demanda__nome",
        "usuario__username",
        "usuario__first_name",
        "usuario__last_name",
        "comentario",
    )
    autocomplete_fields = ("item_demanda", "usuario")
    readonly_fields = ("criado_em",)
