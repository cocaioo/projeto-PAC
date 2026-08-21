from django.contrib.auth.models import AbstractUser
from django.db import models


class Perfil(models.TextChoices):
    USUARIO = "usuario", "Usuário"
    ADMIN = "admin", "Admin"
    ADMIN_MASTER = "admin_master", "Admin Master"


class Usuario(AbstractUser):
    """
    Usuário do sistema PAC.

    Estende o AbstractUser do Django para incluir campos institucionais
    como SIAPE, perfil e vínculo com a unidade organizacional.

    O Django já fornece automaticamente: username, password, is_active,
    is_staff, is_superuser, date_joined, last_login.
    """

    first_name = models.CharField(
        verbose_name="Nome",
        max_length=150
    )

    last_name = models.CharField(
        verbose_name="Sobrenome",
        max_length=150,
        blank=True
    )

    email = models.EmailField(
        unique=True
    )

    siape = models.CharField(
        max_length=20,
        unique=True
    )

    perfil = models.CharField(
        max_length=20,
        choices=Perfil.choices,
        default=Perfil.USUARIO
    )

    unidade = models.ForeignKey(
        "unidades.Unidade",
        verbose_name="Unidade",
        on_delete=models.PROTECT,
        related_name="usuarios",
        null=True,
        blank=True
    )

    REQUIRED_FIELDS = ["email", "siape"]

    @property
    def is_admin_user(self):
        return self.perfil in [Perfil.ADMIN, Perfil.ADMIN_MASTER] or self.is_superuser

    @property
    def is_admin_master_user(self):
        return self.perfil == Perfil.ADMIN_MASTER or self.is_superuser

    def __str__(self):
        return self.first_name