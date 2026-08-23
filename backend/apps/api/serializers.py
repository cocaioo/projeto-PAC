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
            "is_admin_user", "is_admin_master_user",
        ]

    def get_nome_completo(self, obj):
        return obj.get_full_name() or obj.username


class GrupoContratacaoResumoSerializer(serializers.ModelSerializer):
    unidade_admin_sigla = serializers.CharField(
        source="unidade_admin.sigla", read_only=True
    )

    class Meta:
        model = GrupoContratacao
        fields = ["id", "nome", "unidade_admin", "unidade_admin_sigla", "ativo"]


class UsuarioMeSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()
    perfil_display = serializers.CharField(source="get_perfil_display", read_only=True)
    unidade_detalhe = serializers.SerializerMethodField()
    grupos_associados = serializers.SerializerMethodField()
    grupos_administrados = serializers.SerializerMethodField()
    status_conta = serializers.SerializerMethodField()
    escopo_administrativo_global = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "nome_completo",
            "email",
            "siape",
            "perfil",
            "perfil_display",
            "unidade",
            "unidade_detalhe",
            "is_active",
            "status_conta",
            "date_joined",
            "last_login",
            "is_staff",
            "is_admin_user",
            "is_admin_master_user",
            "escopo_administrativo_global",
            "grupos_associados",
            "grupos_administrados",
        ]

    def get_nome_completo(self, obj):
        return obj.get_full_name() or obj.username

    def get_unidade_detalhe(self, obj):
        if obj.unidade is None:
            return None
        return UnidadeSerializer(obj.unidade).data

    def get_status_conta(self, obj):
        return "ativa" if obj.is_active else "inativa"

    def get_escopo_administrativo_global(self, obj):
        return bool(obj.is_admin_master_user)

    def _serializar_grupos_administrados(self, obj):
        if obj.is_admin_master_user or not obj.is_admin_user or not obj.unidade_id:
            return []
        grupos = (
            GrupoContratacao.objects.select_related("unidade_admin")
            .filter(unidade_admin_id=obj.unidade_id)
            .order_by("nome")
        )
        return GrupoContratacaoResumoSerializer(grupos, many=True).data

    def get_grupos_associados(self, obj):
        return self._serializar_grupos_administrados(obj)

    def get_grupos_administrados(self, obj):
        return self._serializar_grupos_administrados(obj)


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
    historico_validacoes = serializers.SerializerMethodField()
    dfd = DFDResumoSerializer(read_only=True)

    class Meta:
        model = ItemDemanda
        fields = [
            "id", "demanda", "item_catalogo", "tipo", "nome", "descricao",
            "unidade_medida", "quantidade", "valor_estimado", "valor_total",
            "data_prevista", "prioridade", "justificativa_prioridade",
            "justificativa_necessidade", "indicacao_orcamentaria", "observacoes",
            "status", "status_display", "dfd", "justificativa_devolucao", "ultima_devolucao",
            "historico_validacoes",
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
            todas = getattr(obj, "todas_validacoes_prefetched", None)
            if todas is not None:
                from apps.validacoes.models import TipoAcao
                devs = [v for v in todas if v.acao == TipoAcao.DEVOLVIDO]
                val = devs[0] if devs else None
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

    def get_historico_validacoes(self, obj):
        validacoes = getattr(obj, "todas_validacoes_prefetched", None)
        if validacoes is not None:
            return ValidacaoSerializer(validacoes, many=True).data

        devolucoes = getattr(obj, "devolucoes_prefetched", None)
        if devolucoes is not None:
            return ValidacaoSerializer(devolucoes, many=True).data

        if hasattr(obj, "_prefetched_objects_cache") and "validacoes" in obj._prefetched_objects_cache:
            return ValidacaoSerializer(obj.validacoes.all(), many=True).data

        validacoes = obj.validacoes.select_related("usuario").order_by("-criado_em", "-id")
        return ValidacaoSerializer(validacoes, many=True).data

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
    historico = serializers.SerializerMethodField()

    class Meta:
        model = Demanda
        fields = [
            "id", "unidade", "unidade_sigla", "usuario", "usuario_nome",
            "ano_referencia", "status", "status_display", "observacao",
            "enviada_em", "criado_em", "atualizado_em", "itens", "valor_total",
            "historico",
        ]
        read_only_fields = ["unidade", "usuario", "status", "enviada_em"]

    def get_valor_total(self, obj):
        return sum((item.valor_total for item in obj.itens.all()), start=0)

    def get_historico(self, obj):
        eventos = []

        # Movimentação: Criação da demanda
        if obj.criado_em:
            autor_nome = (obj.usuario.get_full_name() or obj.usuario.username) if obj.usuario else ""
            eventos.append({
                "titulo": f"Demanda #{obj.pk} criada",
                "comentario": obj.observacao or "",
                "autor": autor_nome,
                "data": obj.criado_em,
                "acao": "criada",
            })

        # Movimentação: Envio da demanda
        if obj.enviada_em:
            autor_nome = (obj.usuario.get_full_name() or obj.usuario.username) if obj.usuario else ""
            eventos.append({
                "titulo": f"Demanda #{obj.pk} enviada para validação",
                "comentario": "",
                "autor": autor_nome,
                "data": obj.enviada_em,
                "acao": "enviada",
            })

        # Validações dos itens
        for item in obj.itens.all():
            validacoes = getattr(item, "todas_validacoes_prefetched", None)
            if validacoes is None:
                validacoes = item.validacoes.select_related("usuario").order_by("-criado_em", "-id")
            for val in validacoes:
                autor_val = (val.usuario.get_full_name() or val.usuario.username) if val.usuario else ""
                eventos.append({
                    "titulo": f"Item: {item.nome}",
                    "comentario": val.comentario or "",
                    "autor": autor_val,
                    "data": val.criado_em,
                    "acao": val.acao,
                })

        eventos.sort(key=lambda x: x["data"], reverse=True)
        return eventos


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


class ItensElegiveisQuerySerializer(serializers.Serializer):
    ciclo_pac_id = serializers.IntegerField(min_value=1, required=False)
    item_catalogo_id = serializers.IntegerField(min_value=1, required=False)
    grupo_contratacao_id = serializers.IntegerField(min_value=1, required=False)


# =============================================================================
# GESTÃO DE ACESSOS E USUÁRIOS
# =============================================================================

from apps.usuarios.models import SolicitacaoAcesso, Usuario, Perfil

class SolicitarAcessoSerializer(serializers.Serializer):
    nome_completo = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    unidade_id = serializers.IntegerField(required=False)
    unidade = serializers.IntegerField(required=False)
    senha = serializers.CharField(write_only=True, min_length=6)

    def validate(self, attrs):
        unidade_val = attrs.get('unidade_id') or attrs.get('unidade')
        if not unidade_val:
            raise serializers.ValidationError({"unidade": "Unidade é obrigatória."})
        attrs['unidade_id'] = int(unidade_val)
        return attrs

class SolicitacaoAcessoListSerializer(serializers.ModelSerializer):
    unidade_sigla = serializers.CharField(source='unidade.sigla', read_only=True)
    unidade_nome = serializers.CharField(source='unidade.nome', read_only=True)
    analisado_por_nome = serializers.CharField(source='analisado_por.get_full_name', read_only=True)
    data_solicitacao = serializers.DateTimeField(source='criado_em', read_only=True)

    class Meta:
        model = SolicitacaoAcesso
        fields = '__all__'

class DecisaoSolicitacaoSerializer(serializers.Serializer):
    justificativa = serializers.CharField(required=False, allow_blank=True)
    motivo_rejeicao = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        just = attrs.get('justificativa') or attrs.get('motivo_rejeicao') or ''
        attrs['justificativa'] = just
        return attrs

class CriarUsuarioAdminSerializer(serializers.Serializer):
    nome_completo = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    unidade_id = serializers.IntegerField(required=False)
    unidade = serializers.IntegerField(required=False, allow_null=True)
    perfil = serializers.ChoiceField(choices=Perfil.choices)
    senha_temporaria = serializers.CharField(write_only=True, min_length=6, required=False)
    senha = serializers.CharField(write_only=True, min_length=6, required=False)
    grupos_administrados = serializers.ListField(child=serializers.IntegerField(), required=False)

    def validate(self, attrs):
        unidade_val = attrs.get('unidade_id') or attrs.get('unidade')
        if not unidade_val:
            raise serializers.ValidationError({"unidade": "Unidade é obrigatória."})
        attrs['unidade_id'] = int(unidade_val)
        senha_val = attrs.get('senha_temporaria') or attrs.get('senha')
        if not senha_val:
            raise serializers.ValidationError({"senha_temporaria": "Senha temporária é obrigatória."})
        attrs['senha_temporaria'] = senha_val
        return attrs

class UsuarioAdminListSerializer(serializers.ModelSerializer):
    unidade_sigla = serializers.CharField(source='unidade.sigla', read_only=True)
    unidade_nome = serializers.CharField(source='unidade.nome', read_only=True)
    nome_completo = serializers.CharField(source='first_name', read_only=True)
    grupos_nomes = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            'id', 'username', 'first_name', 'nome_completo', 'email', 'perfil',
            'unidade', 'unidade_sigla', 'unidade_nome', 'grupos_nomes',
            'is_active', 'precisa_trocar_senha'
        ]

    def get_grupos_nomes(self, obj):
        if obj.unidade:
            return list(obj.unidade.grupos_administrados.values_list('nome', flat=True))
        return []

class UsuarioStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField(required=False)
    ativo = serializers.BooleanField(required=False)

    def validate(self, attrs):
        if 'is_active' not in attrs and 'ativo' not in attrs:
            raise serializers.ValidationError("Informe o status is_active.")
        if 'is_active' not in attrs:
            attrs['is_active'] = attrs['ativo']
        return attrs
