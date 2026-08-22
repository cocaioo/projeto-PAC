from django.contrib import admin

from .models import ItemCatalogo


@admin.register(ItemCatalogo)
class ItemCatalogoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "tipo",
        "grupo",
        "codigo_catmat_catser",
        "unidade_medida",
        "valor_estimado",
        "ativo",
    )
    list_filter = ("ativo", "tipo", "grupo")
    search_fields = ("nome", "descricao", "codigo_catmat_catser", "grupo__nome")
    autocomplete_fields = ("grupo",)
