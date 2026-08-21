from django.conf import settings
from django.db import models


class StatusDemanda(models.TextChoices):
    RASCUNHO = "rascunho", "Rascunho"
    AGUARDANDO_VALIDACAO = "aguardando_validacao", "Aguardando Validação"
    EM_ANDAMENTO = "em_andamento", "Em Andamento"
    CONCLUIDA = "concluida", "Concluída"
    CANCELADA = "cancelada", "Cancelada"


class StatusItemDemanda(models.TextChoices):
    RASCUNHO = "rascunho", "Rascunho"
    AGUARDANDO_VALIDACAO = "aguardando_validacao", "Aguardando Validação"
    DEVOLVIDA = "devolvida", "Devolvida"
    VALIDADA = "validada", "Validada"
    VINCULADA_DFD = "vinculada_dfd", "Vinculada ao DFD"
    CANCELADA = "cancelada", "Cancelada"


class CicloPAC(models.Model):
    """Ciclo anual ao qual as demandas e DFDs pertencem."""

    ano = models.PositiveIntegerField(unique=True)
    ativo = models.BooleanField(default=True)

    class Meta:
        ordering = ["-ano"]

    def __str__(self):
        return str(self.ano)


class Prioridade(models.TextChoices):
    BAIXA = "baixa", "Baixa"
    MEDIA = "media", "Média"
    ALTA = "alta", "Alta"
    CRITICA = "critica", "Crítica"


class TipoItem(models.TextChoices):
    MATERIAL = "material", "Material"
    SERVICO = "servico", "Serviço"


class Demanda(models.Model):
    """
    Representa uma solicitação de contratação feita por uma unidade.

    Uma demanda agrupa vários itens (ItemDemanda) e percorre um fluxo
    de status: rascunho → enviada → validada/devolvida → consolidada.

    A demanda NÃO possui vínculo direto com GrupoContratacao.
    Os itens da demanda podem pertencer a grupos diferentes,
    pois o grupo é definido no nível do ItemCatalogo.
    """

    unidade = models.ForeignKey(
        "unidades.Unidade",
        verbose_name="Unidade Solicitante",
        on_delete=models.PROTECT,
        related_name="demandas"
    )

    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Usuário Responsável",
        on_delete=models.PROTECT,
        related_name="demandas"
    )

    ano_referencia = models.PositiveIntegerField(
        verbose_name="Ano de Referência"
    )

    ciclo_pac = models.ForeignKey(
        CicloPAC, on_delete=models.PROTECT, related_name="demandas"
    )

    status = models.CharField(
        verbose_name="Status",
        max_length=30,
        choices=StatusDemanda.choices,
        default=StatusDemanda.RASCUNHO
    )

    observacao = models.TextField(
        verbose_name="Observação",
        blank=True
    )

    enviada_em = models.DateTimeField(
        verbose_name="Enviada em",
        null=True,
        blank=True
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "Demanda"
        verbose_name_plural = "Demandas"
        ordering = ["-criado_em"]

    def save(self, *args, **kwargs):
        if not self.ciclo_pac_id:
            ciclo, _ = CicloPAC.objects.get_or_create(ano=self.ano_referencia)
            self.ciclo_pac = ciclo
        # Nota: O cálculo aqui estava sem indentação no original.
        # No entanto, o campo valor_total pertence ao ItemDemanda, não à Demanda.
        # Vou remover este método save da Demanda pois ele causaria erro de atributo.
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Demanda #{self.pk} — {self.unidade}"


class ItemDemanda(models.Model):
    """
    Item individual dentro de uma demanda.

    Pode referenciar um item do catálogo (item_catalogo) ou ser
    preenchido manualmente pelo usuário. Quando item_catalogo é nulo,
    trata-se de um item manual.

    Cada item possui status independente (RN19), permitindo que
    itens da mesma demanda estejam em estágios diferentes do fluxo
    de validação.
    """

    demanda = models.ForeignKey(
        Demanda,
        verbose_name="Demanda",
        on_delete=models.CASCADE,
        related_name="itens"
    )

    dfd = models.ForeignKey(
        "dfd.DFD", on_delete=models.PROTECT, related_name="itens_vinculados",
        null=True, blank=True,
    )

    item_catalogo = models.ForeignKey(
        "catalogo.ItemCatalogo",
        verbose_name="Item do Catálogo",
        on_delete=models.PROTECT,
        related_name="itens_demanda",
        null=True,
        blank=True
    )

    tipo = models.CharField(
        verbose_name="Tipo",
        max_length=20,
        choices=TipoItem.choices,
        help_text="Material ou Serviço."
    )

    nome = models.CharField(
        verbose_name="Nome",
        max_length=300
    )

    descricao = models.TextField(
        verbose_name="Descrição"
    )

    unidade_medida = models.CharField(
        verbose_name="Unidade de Medida",
        max_length=50
    )

    quantidade = models.PositiveIntegerField(
        verbose_name="Quantidade"
    )

    valor_estimado = models.DecimalField(
        verbose_name="Valor Estimado Unitário",
        max_digits=14,
        decimal_places=2
    )

    valor_total = models.DecimalField(
        verbose_name="Valor Total",
        max_digits=14,
        decimal_places=2,
        help_text="Calculado: quantidade × valor estimado unitário."
    )

    data_prevista = models.DateField(
        verbose_name="Data Prevista"
    )

    prioridade = models.CharField(
        verbose_name="Prioridade",
        max_length=20,
        choices=Prioridade.choices
    )

    justificativa_prioridade = models.TextField(
        verbose_name="Justificativa da Prioridade",
        blank=True
    )

    justificativa_necessidade = models.TextField(
        verbose_name="Justificativa da Necessidade"
    )

    indicacao_orcamentaria = models.CharField(
        verbose_name="Indicação Orçamentária",
        max_length=200
    )

    observacoes = models.TextField(
        verbose_name="Observações do Solicitante",
        blank=True,
        default=""
    )

    # Status independente por item (RN19).
    status = models.CharField(
        verbose_name="Status",
        max_length=30,
        choices=StatusItemDemanda.choices,
        default=StatusItemDemanda.RASCUNHO
    )

    criado_em = models.DateTimeField(
        auto_now_add=True
    )

    atualizado_em = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "Item de Demanda"
        verbose_name_plural = "Itens de Demanda"
        ordering = ["-criado_em"]
        constraints = [
            models.UniqueConstraint(
                fields=["demanda", "item_catalogo"],
                name="uniq_item_catalogo_demanda",
            ),
        ]

    def __str__(self):
        return f"{self.nome} (Demanda #{self.demanda_id})"
