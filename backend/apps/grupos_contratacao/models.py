from django.db import models


class GrupoContratacao(models.Model):
    """
    Representa um grupo de contratação institucional.

    Cada grupo é administrado por uma unidade responsável (unidade_admin)
    que consolida demandas, gerencia catálogo e valida solicitações.

    Exemplos:
        - TIC → administrado pela STI
        - PREUNI → administrado pela Prefeitura Universitária
        - Almoxarifado → administrado pela Divisão de Almoxarifado
    """

    nome = models.CharField(
        verbose_name="Nome",
        max_length=200
    )

    descricao = models.TextField(
        verbose_name="Descrição",
        blank=True
    )

    unidade_admin = models.ForeignKey(
        "unidades.Unidade",
        verbose_name="Unidade Administradora",
        on_delete=models.PROTECT,
        related_name="grupos_administrados"
    )

    ativo = models.BooleanField(
        verbose_name="Ativo",
        default=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "Grupo de Contratação"
        verbose_name_plural = "Grupos de Contratação"
        ordering = ["nome"]

    def __str__(self):
        return self.nome
