"""
Serializers da API REST do PAC UFPI.

Convertem os modelos do Django em JSON consumido pelo front-end React.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import (
    Demanda,
    ItemDemanda,
    Prioridade,
    StatusItemDemanda,
)
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.validacoes.models import Validacao

Usuario = get_user_model()


# =============================================================================
# Usuários / Autenticação
# =============================================================================

class UsuarioSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id", "username", "first_name", "last_name", "nome_completo",
            "email", "siape", "perfil", "unidade", "is_staff",
        ]

    def get_nome_completo(self, obj):
        return obj.get_full_name() or obj.username


# =============================================================================
# Unidades / Grupos / Catálogo
# =============================================================================

class UnidadeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unidade
        fields = ["id", "nome", "sigla", "codigo", "ativo"]


class GrupoContratacaoSerializer(serializers.ModelSerializer):
    unidade_admin_sigla = serializers.CharField(
        source="unidade_admin.sigla", read_only=True
    )

    class Meta:
        model = GrupoContratacao
        fields = [
            "id", "nome", "descricao", "unidade_admin",
            "unidade_admin_sigla", "ativo",
        ]


class ItemCatalogoSerializer(serializers.ModelSerializer):
    grupo_nome = serializers.CharField(source="grupo.nome", read_only=True)

    class Meta:
        model = ItemCatalogo
        fields = [
            "id", "tipo", "nome", "descricao", "codigo_catmat_catser",
            "grupo", "grupo_nome", "unidade_medida", "valor_estimado", "ativo",
        ]


# =============================================================================
# Demandas e itens
# =============================================================================

class DFDResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DFD
        fields = ["id", "numero"]

class ItemDemandaSerializer(serializers.ModelSerializer):
    CAMPOS_HERDADOS_CATALOGO = {
        "tipo": "tipo",
        "nome": "nome",
        "descricao": "descricao",
        "unidade_medida": "unidade_medida",
        "valor_estimado": "valor_estimado",
    }

    # valor_total é calculado no back-end (quantidade × valor_estimado).
    valor_total = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    justificativa_devolucao = serializers.SerializerMethodField()
    ultima_devolucao = serializers.SerializerMethodField()
    dfd = DFDResumoSerializer(read_only=True)

    class Meta:
        model = ItemDemanda
        fields = [
            "id", "demanda", "item_catalogo", "tipo", "nome", "descricao",
            "unidade_medida", "quantidade", "valor_estimado", "valor_total",
            "data_prevista", "prioridade", "justificativa_prioridade",
            "justificativa_necessidade", "indicacao_orcamentaria", "observacoes",
            "status", "status_display", "dfd", "justificativa_devolucao", "ultima_devolucao",
        ]
        read_only_fields = ["demanda", "status"]
        extra_kwargs = {
            "item_catalogo": {"required": False, "allow_null": True},
            # Estes campos continuam aceitos para manter compatibilidade com
            # o payload manual, mas passam a ser opcionais quando ha catalogo.
            "tipo": {"required": False},
            "nome": {"required": False},
            "descricao": {"required": False},
            "unidade_medida": {"required": False},
            "valor_estimado": {"required": False},
            "justificativa_prioridade": {
                "required": False,
                "allow_blank": True,
            },
        }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        errors = {}
        item_catalogo = attrs.get("item_catalogo")

        if item_catalogo is not None:
            if not item_catalogo.ativo:
                errors["item_catalogo"] = [
                    "O item selecionado esta inativo no catalogo."
                ]

            demanda = self.context.get("demanda")
            if demanda is not None and ItemDemanda.objects.filter(
                demanda=demanda,
                item_catalogo=item_catalogo,
            ).exists():
                errors["item_catalogo"] = [
                    "Este item do catalogo ja foi adicionado a demanda."
                ]

            for campo_item, campo_catalogo in self.CAMPOS_HERDADOS_CATALOGO.items():
                attrs[campo_item] = getattr(item_catalogo, campo_catalogo)
        elif self.instance is None:
            for campo in self.CAMPOS_HERDADOS_CATALOGO:
                valor = attrs.get(campo)
                if valor is None or (isinstance(valor, str) and not valor.strip()):
                    errors[campo] = ["Este campo e obrigatorio para itens manuais."]

        prioridade = attrs.get(
            "prioridade",
            getattr(self.instance, "prioridade", None),
        )
        justificativa = attrs.get(
            "justificativa_prioridade",
            getattr(self.instance, "justificativa_prioridade", ""),
        )
        if prioridade == Prioridade.ALTA and not (justificativa or "").strip():
            errors["justificativa_prioridade"] = [
                "Informe a justificativa para prioridade alta."
            ]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def get_ultima_devolucao(self, obj):
        devolucoes = getattr(obj, "devolucoes_prefetched", None)
        if devolucoes is not None:
            val = devolucoes[0] if devolucoes else None
        else:
            from apps.validacoes.models import TipoAcao
            val = (
                obj.validacoes.filter(acao=TipoAcao.DEVOLVIDO)
                .select_related("usuario")
                .order_by("-criado_em", "-id")
                .first()
            )
        if not val:
            return None
        return {
            "id": val.id,
            "comentario": val.comentario,
            "criado_em": val.criado_em,
            "responsavel": {
                "id": val.usuario_id,
                "nome": val.usuario.get_full_name() or val.usuario.username,
            },
        }

    def get_justificativa_devolucao(self, obj):
        val_data = self.get_ultima_devolucao(obj)
        return val_data["comentario"] if val_data else ""

    def create(self, validated_data):
        validated_data["valor_total"] = (
            validated_data["quantidade"] * validated_data["valor_estimado"]
        )
        validated_data["status"] = StatusItemDemanda.RASCUNHO
        return super().create(validated_data)

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.valor_total = instance.quantidade * instance.valor_estimado
        instance.save(update_fields=["valor_total", "atualizado_em"])
        return instance


class ItemDemandaCorrecaoSerializer(serializers.ModelSerializer):
    CAMPOS_MANUAIS = {
        "tipo", "nome", "descricao", "unidade_medida", "quantidade",
        "valor_estimado", "data_prevista", "prioridade",
        "justificativa_prioridade", "justificativa_necessidade",
        "indicacao_orcamentaria", "observacoes",
    }
    CAMPOS_CATALOGADOS = {
        "quantidade", "valor_estimado", "data_prevista", "prioridade",
        "justificativa_prioridade", "justificativa_necessidade",
        "indicacao_orcamentaria", "observacoes",
    }
    CAMPOS_PROTEGIDOS = {
        "demanda", "status", "valor_total", "criado_em", "atualizado_em",
        "item_catalogo",
    }
    CAMPOS_HERDADOS_CATALOGO = {"tipo", "nome", "descricao", "unidade_medida", "item_catalogo"}

    class Meta:
        model = ItemDemanda
        fields = [
            "tipo", "nome", "descricao", "unidade_medida", "quantidade",
            "valor_estimado", "data_prevista", "prioridade",
            "justificativa_prioridade", "justificativa_necessidade",
            "indicacao_orcamentaria", "observacoes",
        ]

    def validate(self, attrs):
        raw_keys = set(getattr(self, "initial_data", {}).keys())
        allowed = self.CAMPOS_CATALOGADOS if self.instance and self.instance.item_catalogo_id else self.CAMPOS_MANUAIS
        errors = {}

        for campo in sorted(raw_keys & self.CAMPOS_PROTEGIDOS):
            errors[campo] = ["Campo protegido."]

        for campo in sorted(raw_keys - self.CAMPOS_MANUAIS - self.CAMPOS_PROTEGIDOS):
            errors[campo] = ["Campo desconhecido."]

        if self.instance and self.instance.item_catalogo_id:
            for campo in sorted(raw_keys & self.CAMPOS_HERDADOS_CATALOGO):
                errors[campo] = ["Campo herdado do catalogo nao pode ser alterado."]

        for campo in sorted(raw_keys - allowed - self.CAMPOS_PROTEGIDOS):
            errors.setdefault(campo, ["Campo nao permitido."])

        prioridade = attrs.get(
            "prioridade",
            getattr(self.instance, "prioridade", None),
        )
        justificativa = attrs.get(
            "justificativa_prioridade",
            getattr(self.instance, "justificativa_prioridade", ""),
        )
        if prioridade == Prioridade.ALTA and not (justificativa or "").strip():
            errors["justificativa_prioridade"] = [
                "Informe a justificativa para prioridade alta."
            ]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.valor_total = instance.quantidade * instance.valor_estimado
        instance.save(update_fields=["valor_total", "atualizado_em"])
        return instance


class DemandaSerializer(serializers.ModelSerializer):
    itens = ItemDemandaSerializer(many=True, read_only=True)
    unidade_sigla = serializers.CharField(source="unidade.sigla", read_only=True)
    usuario_nome = serializers.CharField(source="usuario.get_full_name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    valor_total = serializers.SerializerMethodField()

    class Meta:
        model = Demanda
        fields = [
            "id", "unidade", "unidade_sigla", "usuario", "usuario_nome",
            "ano_referencia", "status", "status_display", "observacao",
            "enviada_em", "criado_em", "atualizado_em", "itens", "valor_total",
        ]
        read_only_fields = ["unidade", "usuario", "status", "enviada_em"]

    def get_valor_total(self, obj):
        return sum((item.valor_total for item in obj.itens.all()), start=0)


# =============================================================================
# Validações
# =============================================================================

class ValidacaoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(
        source="usuario.get_full_name", read_only=True
    )
    acao_display = serializers.CharField(source="get_acao_display", read_only=True)

    class Meta:
        model = Validacao
        fields = [
            "id", "item_demanda", "usuario", "usuario_nome",
            "acao", "acao_display", "comentario", "criado_em",
        ]
        read_only_fields = ["usuario"]


# =============================================================================
# DFD
# =============================================================================

class DFDSerializer(serializers.ModelSerializer):
    grupo_nome = serializers.CharField(source="grupo.nome", read_only=True)
    criado_por_nome = serializers.CharField(
        source="criado_por.get_full_name", read_only=True
    )
    itens = ItemDemandaSerializer(
        source="itens_demanda", many=True, read_only=True
    )
    total = serializers.SerializerMethodField()

    class Meta:
        model = DFD
        fields = [
            "id", "numero", "ciclo_pac", "grupo", "grupo_nome", "criado_por",
            "criado_por_nome", "numero_processo", "link_publico",
            "observacao", "criado_em", "atualizado_em", "itens", "total",
        ]
        read_only_fields = ["criado_por"]

    def get_total(self, obj):
        return sum((item.valor_total for item in obj.itens_demanda.all()), start=0)


class ConsolidarDFDSerializer(serializers.Serializer):
    numero_dfd = serializers.CharField(max_length=100, trim_whitespace=True)
    ciclo_pac_id = serializers.IntegerField(min_value=1)
    item_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), allow_empty=False)

    def validate_numero_dfd(self, value):
        if not value:
            raise serializers.ValidationError("O numero do DFD e obrigatorio.")
        return value

    def validate_item_ids(self, value):
        if len(value) != len(set(value)):
            raise serializers.ValidationError("A lista contem IDs duplicados.")
        return value
