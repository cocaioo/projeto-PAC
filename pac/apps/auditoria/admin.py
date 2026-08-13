from django.contrib import admin

from .models import LogAuditoria


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    list_display = ("acao", "modelo", "objeto_id", "usuario", "criado_em")
    list_filter = ("modelo", "acao", "criado_em")
    search_fields = ("acao", "modelo", "objeto_id", "usuario__username")
    readonly_fields = (
        "usuario",
        "acao",
        "modelo",
        "objeto_id",
        "dados_anteriores",
        "dados_novos",
        "criado_em",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
