from django.conf import settings
from django.db import models


class DFD(models.Model):
    """
    Documento de Formalização da Demanda.

    O DFD consolida itens de demanda validados em um documento
    formal para registro no PGC (Plano de Gerenciamento de Contratações).

    Relaciona-se diretamente com os itens de demanda via M2M,
    sem intermediários de consolidação. A lógica de agrupamento
    e soma será tratada na camada de serviços/queries.
    """

    numero = models.CharField(
        verbose_name="Número do DFD",
        max_length=100,
    )

    grupo = models.ForeignKey(
        "grupos_contratacao.GrupoContratacao",
        verbose_name="Grupo de Contratação",
        on_delete=models.PROTECT,
        related_name="dfds"
    )

    ciclo_pac = models.ForeignKey(
        "demandas.CicloPAC", on_delete=models.PROTECT, related_name="dfds"
    )

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Criado por",
        on_delete=models.PROTECT,
        related_name="dfds_criados"
    )

    itens_demanda = models.ManyToManyField(
        "demandas.ItemDemanda",
        verbose_name="Itens de Demanda",
        related_name="dfds",
        blank=True
    )

    numero_processo = models.CharField(
        verbose_name="Número do Processo",
        max_length=50,
        blank=True
    )

    link_publico = models.URLField(
        verbose_name="Link Público",
        blank=True
    )

    observacao = models.TextField(
        verbose_name="Observação",
        blank=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "DFD"
        verbose_name_plural = "DFDs"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["numero", "ciclo_pac"], name="uniq_dfd_numero_por_ciclo"
            )
        ]

    def __str__(self):
        return f"DFD {self.numero}"
