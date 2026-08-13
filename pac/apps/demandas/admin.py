from django.contrib import admin

from .models import Demanda, ItemDemanda


class ItemDemandaInline(admin.TabularInline):
    model = ItemDemanda
    extra = 0


@admin.register(Demanda)
class DemandaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "unidade",
        "usuario",
        "ano_referencia",
        "status",
        "criado_em",
    )

    list_filter = (
        "status",
        "ano_referencia",
        "unidade",
    )

    search_fields = (
        "id",
        "unidade__nome",
        "usuario__username",
    )

    readonly_fields = (
        "criado_em",
        "atualizado_em",
        "enviada_em",
    )

    inlines = [ItemDemandaInline]


@admin.register(ItemDemanda)
class ItemDemandaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "demanda",
        "tipo",
        "quantidade",
        "valor_total",
        "status",
    )

    list_filter = (
        "status",
        "tipo",
        "prioridade",
    )

    search_fields = (
        "nome",
        "descricao",
    )

    readonly_fields = (
        "criado_em",
        "atualizado_em",
    )
