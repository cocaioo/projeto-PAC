from django.contrib import admin
from .models import DFD

@admin.register(DFD)
class DFDAdmin(admin.ModelAdmin):
    list_display = ("numero", "grupo", "criado_por", "criado_em")
    list_filter = ("grupo", "criado_em")
    search_fields = ("numero", "numero_processo")
    filter_horizontal = ("itens_demanda",)
