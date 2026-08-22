from django.conf import settings
from django.db import models


class TipoAcao(models.TextChoices):
    VALIDADO = "validado", "Validado"
    DEVOLVIDO = "devolvido", "Devolvido"


class Validacao(models.Model):
    """
    Registro de validação ou devolução de um item de demanda.

    Cada ação de um administrador sobre um ItemDemanda gera um
    registro de validação, garantindo rastreabilidade completa.

    A validação é feita por item (RF17), não por demanda inteira.
    Devoluções exigem justificativa obrigatória (RN05).
    """

    item_demanda = models.ForeignKey(
        "demandas.ItemDemanda",
        verbose_name="Item de Demanda",
        on_delete=models.CASCADE,
        related_name="validacoes"
    )

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Validador",
        on_delete=models.PROTECT,
        related_name="validacoes_realizadas"
    )

    acao = models.CharField(
        verbose_name="Ação",
        max_length=20,
        choices=TipoAcao.choices
    )

    comentario = models.TextField(
        verbose_name="Comentário",
        blank=True,
        help_text="Obrigatório em caso de devolução."
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        verbose_name = "Validação"
        verbose_name_plural = "Validações"
        ordering = ["-criado_em"]

    def __str__(self):
        return f"{self.get_acao_display()} — Item #{self.item_demanda_id}"
