from django.db import models


class TipoItem(models.TextChoices):
    MATERIAL = "material", "Material"
    SERVICO = "servico", "Serviço"


class ItemCatalogo(models.Model):
    """
    Item do catálogo institucional de materiais e serviços.

    Pertence a um grupo de contratação e serve como referência
    padronizada para os itens das demandas.

    Itens do catálogo podem ser selecionados ao criar uma demanda,
    mas o sistema também permite inclusão manual de itens fora
    do catálogo.
    """

    tipo = models.CharField(
        verbose_name="Tipo",
        max_length=20,
        choices=TipoItem.choices
    )

    nome = models.CharField(
        verbose_name="Nome",
        max_length=300
    )

    descricao = models.TextField(
        verbose_name="Descrição",
        blank=True
    )

    codigo_catmat_catser = models.CharField(
        verbose_name="Código CATMAT/CATSER",
        max_length=30,
        blank=True
    )

    grupo = models.ForeignKey(
        "grupos_contratacao.GrupoContratacao",
        verbose_name="Grupo de Contratação",
        on_delete=models.PROTECT,
        related_name="itens_catalogo"
    )

    unidade_medida = models.CharField(
        verbose_name="Unidade de Medida",
        max_length=50
    )

    valor_estimado = models.DecimalField(
        verbose_name="Valor Estimado",
        max_digits=14,
        decimal_places=2
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
        verbose_name = "Item do Catálogo"
        verbose_name_plural = "Itens do Catálogo"
        ordering = ["nome"]

    def __str__(self):
        return self.nome
