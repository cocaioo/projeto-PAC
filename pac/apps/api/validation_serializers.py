"""Serializers dedicados ao fluxo administrativo de validacao."""

from rest_framework import serializers

from .serializers import ItemDemandaSerializer


class ItemPendenteValidacaoSerializer(ItemDemandaSerializer):
    """Mantem o contrato do item e acrescenta contexto para agrupamento."""

    demanda_id = serializers.IntegerField(source="demanda.pk", read_only=True)
    demanda_ano_referencia = serializers.IntegerField(
        source="demanda.ano_referencia", read_only=True
    )
    demanda_status = serializers.CharField(source="demanda.status", read_only=True)
    demanda_status_display = serializers.CharField(
        source="demanda.get_status_display", read_only=True
    )
    demanda_observacao = serializers.CharField(
        source="demanda.observacao", read_only=True
    )
    demanda_enviada_em = serializers.DateTimeField(
        source="demanda.enviada_em", read_only=True, allow_null=True
    )
    demanda_criado_em = serializers.DateTimeField(
        source="demanda.criado_em", read_only=True
    )

    unidade = serializers.IntegerField(source="demanda.unidade_id", read_only=True)
    unidade_id = serializers.IntegerField(
        source="demanda.unidade_id", read_only=True
    )
    unidade_nome = serializers.CharField(
        source="demanda.unidade.nome", read_only=True
    )
    unidade_sigla = serializers.CharField(
        source="demanda.unidade.sigla", read_only=True
    )

    usuario = serializers.IntegerField(source="demanda.usuario_id", read_only=True)
    usuario_id = serializers.IntegerField(
        source="demanda.usuario_id", read_only=True
    )
    usuario_nome = serializers.SerializerMethodField()
    usuario_username = serializers.CharField(
        source="demanda.usuario.username", read_only=True
    )

    grupo = serializers.SerializerMethodField()
    grupo_id = serializers.SerializerMethodField()
    grupo_nome = serializers.SerializerMethodField()
    grupo_unidade_admin_id = serializers.SerializerMethodField()
    item_manual = serializers.SerializerMethodField()

    demanda_dados = serializers.SerializerMethodField()
    grupo_dados = serializers.SerializerMethodField()

    class Meta(ItemDemandaSerializer.Meta):
        fields = ItemDemandaSerializer.Meta.fields + [
            "demanda_id",
            "demanda_ano_referencia",
            "demanda_status",
            "demanda_status_display",
            "demanda_observacao",
            "demanda_enviada_em",
            "demanda_criado_em",
            "unidade",
            "unidade_id",
            "unidade_nome",
            "unidade_sigla",
            "usuario",
            "usuario_id",
            "usuario_nome",
            "usuario_username",
            "grupo",
            "grupo_id",
            "grupo_nome",
            "grupo_unidade_admin_id",
            "item_manual",
            "demanda_dados",
            "grupo_dados",
        ]

    def _grupo(self, obj):
        item_catalogo = obj.item_catalogo
        return item_catalogo.grupo if item_catalogo is not None else None

    def get_usuario_nome(self, obj):
        usuario = obj.demanda.usuario
        return usuario.get_full_name() or usuario.username

    def get_grupo(self, obj):
        grupo = self._grupo(obj)
        return grupo.pk if grupo is not None else None

    def get_grupo_id(self, obj):
        return self.get_grupo(obj)

    def get_grupo_nome(self, obj):
        grupo = self._grupo(obj)
        return grupo.nome if grupo is not None else None

    def get_grupo_unidade_admin_id(self, obj):
        grupo = self._grupo(obj)
        return grupo.unidade_admin_id if grupo is not None else None

    def get_item_manual(self, obj):
        return obj.item_catalogo_id is None

    def get_demanda_dados(self, obj):
        demanda = obj.demanda
        unidade = demanda.unidade
        usuario = demanda.usuario
        return {
            "id": demanda.pk,
            "ano_referencia": demanda.ano_referencia,
            "status": demanda.status,
            "status_display": demanda.get_status_display(),
            "observacao": demanda.observacao,
            "enviada_em": demanda.enviada_em,
            "criado_em": demanda.criado_em,
            "unidade": {
                "id": unidade.pk,
                "nome": unidade.nome,
                "sigla": unidade.sigla,
            },
            "usuario": {
                "id": usuario.pk,
                "username": usuario.username,
                "nome": usuario.get_full_name() or usuario.username,
            },
        }

    def get_grupo_dados(self, obj):
        grupo = self._grupo(obj)
        if grupo is None:
            return None
        unidade_admin = grupo.unidade_admin
        return {
            "id": grupo.pk,
            "nome": grupo.nome,
            "unidade_admin": {
                "id": unidade_admin.pk,
                "nome": unidade_admin.nome,
                "sigla": unidade_admin.sigla,
            },
        }
