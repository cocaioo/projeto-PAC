from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = (
        "username",
        "first_name",
        "email",
        "siape",
        "perfil",
        "unidade",
        "is_active",
    )

    list_filter = (
        "perfil",
        "unidade",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "username",
        "first_name",
        "last_name",
        "email",
        "siape",
    )

    fieldsets = UserAdmin.fieldsets + (
        (
            "Informações Institucionais",
            {
                "fields": (
                    "siape",
                    "perfil",
                    "unidade",
                )
            },
        ),
    )
