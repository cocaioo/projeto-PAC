from django.contrib import admin

from .models import Unidade


@admin.register(Unidade)
class UnidadeAdmin(admin.ModelAdmin):
    list_display = ("sigla", "nome", "codigo", "ativo")
    list_filter = ("ativo",)
    search_fields = ("sigla", "nome", "codigo")
