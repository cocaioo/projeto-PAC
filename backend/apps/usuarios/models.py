from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings


class Perfil(models.TextChoices):
    USUARIO = "usuario", "Usuário"
    ADMIN = "admin", "Admin"
    ADMIN_MASTER = "admin_master", "Admin Master"


class StatusSolicitacao(models.TextChoices):
    PENDENTE = "pendente", "Pendente"
    APROVADO = "aprovado", "Aprovado"
    REJEITADO = "rejeitado", "Rejeitado"


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
        unique=True,
        null=True,
        blank=True
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

    precisa_trocar_senha = models.BooleanField(default=False)

    REQUIRED_FIELDS = ["email"]

    @property
    def is_admin_user(self):
        return self.perfil in [Perfil.ADMIN, Perfil.ADMIN_MASTER] or self.is_superuser

    @property
    def is_admin_master_user(self):
        return self.perfil == Perfil.ADMIN_MASTER or self.is_superuser

    def __str__(self):
        return self.first_name


class SolicitacaoAcesso(models.Model):
    nome_completo = models.CharField(max_length=150)
    email = models.EmailField()
    unidade = models.ForeignKey(
        "unidades.Unidade",
        on_delete=models.PROTECT,
        related_name="solicitacoes_acesso"
    )
    senha_hash = models.CharField(max_length=255)
    status = models.CharField(
        max_length=20,
        choices=StatusSolicitacao.choices,
        default=StatusSolicitacao.PENDENTE
    )
    justificativa_rejeicao = models.TextField(blank=True, default="")
    analisado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="solicitacoes_analisadas"
    )
    analisado_em = models.DateTimeField(null=True, blank=True)
    usuario_criado = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="solicitacao_origem"
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)