from django.conf import settings
from django.db import models


class LogAuditoria(models.Model):
    """
    Registro de auditoria para rastreabilidade do sistema.

    Utiliza modelo + objeto_id como referência genérica explícita
    ao invés de ContentType/GenericForeignKey do Django, mantendo
    o código simples e sem dependência de framework implícito.

    Registros de auditoria são imutáveis — uma vez criados, não
    devem ser alterados nem excluídos.
    """

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Usuário",
        on_delete=models.SET_NULL,
        related_name="logs_auditoria",
        null=True,
        blank=True,
        help_text="Nulo para ações automáticas do sistema."
    )

    acao = models.CharField(
        verbose_name="Ação",
        max_length=100
    )

    modelo = models.CharField(
        verbose_name="Modelo",
        max_length=100,
        help_text="Nome do modelo afetado. Ex: 'Demanda', 'ItemDemanda'."
    )

    objeto_id = models.PositiveIntegerField(
        verbose_name="ID do Objeto"
    )

    dados_anteriores = models.JSONField(
        verbose_name="Dados Anteriores",
        null=True,
        blank=True
    )

    dados_novos = models.JSONField(
        verbose_name="Dados Novos",
        null=True,
        blank=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        verbose_name = "Log de Auditoria"
        verbose_name_plural = "Logs de Auditoria"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.acao} — {self.modelo} #{self.objeto_id}"
