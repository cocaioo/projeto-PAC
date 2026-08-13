from django.db import models


class Unidade(models.Model):
    """
    Representa uma unidade organizacional da UFPI.

    Exemplos: STI, Prefeitura Universitária, Reitoria, Pró-Reitorias.

    Cada unidade pode ter vários usuários vinculados (relação inversa
    via Usuario.unidade).
    """

    nome = models.CharField(
        verbose_name="Nome",
        max_length=200
    )

    sigla = models.CharField(
        verbose_name="Sigla",
        max_length=20,
        unique=True
    )

    codigo = models.CharField(
        verbose_name="Código",
        max_length=20,
        unique=True
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
        verbose_name = "Unidade"
        verbose_name_plural = "Unidades"
        ordering = ["nome"]

    def __str__(self):
        return f"{self.sigla} — {self.nome}"
