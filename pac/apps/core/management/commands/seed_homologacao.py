import os
from datetime import UTC, date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import (
    CicloPAC,
    Demanda,
    ItemDemanda,
    Prioridade,
    StatusDemanda,
    StatusItemDemanda,
)
from apps.demandas.services import sincronizar_status_macro_demanda
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil
from apps.validacoes.models import TipoAcao, Validacao


PASSWORD_ENV = "HOMOLOGACAO_TEST_PASSWORD"
# Ano deliberadamente reservado para não alterar ciclos institucionais reais.
ANO_REFERENCIA = 2099
DEMANDA_MARKER = "[SEED HOMOLOGACAO] Cenários controlados para validação do MVP."
MOTIVO_DEVOLUCAO = (
    "Ajustar a especificação técnica e anexar uma cotação atualizada antes do reenvio."
)


class Command(BaseCommand):
    help = "Cria usuários e dados determinísticos para homologação."

    def handle(self, *args, **options):
        senha = os.environ.get(PASSWORD_ENV)
        if not senha:
            raise CommandError(
                f"Defina {PASSWORD_ENV} no ambiente antes de executar o seed."
            )

        with transaction.atomic():
            unidades = self._criar_unidades()
            usuarios = self._criar_usuarios(unidades, senha)
            grupos = self._criar_grupos(unidades)
            catalogo = self._criar_catalogo(grupos)
            demanda, ciclo = self._criar_demanda(unidades, usuarios)
            dfd = self._criar_dfd(ciclo, grupos, usuarios)
            itens = self._criar_itens(demanda, catalogo, dfd)
            self._criar_historico_validacao(itens, usuarios)
            self._sincronizar_dfd(dfd, itens["vinculado"])
            sincronizar_status_macro_demanda(demanda)

        self.stdout.write(
            self.style.SUCCESS(
                "Dados de homologação configurados para usuario_teste, admin_teste, "
                "admin_outro_grupo e admin_master_teste."
            )
        )

    @staticmethod
    def _criar_unidades():
        definicoes = {
            "solicitante": {
                "sigla": "HML-CCN",
                "nome": "Unidade Solicitante de Homologação",
                "codigo": "HML-CCN",
            },
            "admin": {
                "sigla": "HML-STI",
                "nome": "Unidade Administradora de Homologação",
                "codigo": "HML-STI",
            },
            "outro_admin": {
                "sigla": "HML-PREUNI",
                "nome": "Outra Unidade Administradora de Homologação",
                "codigo": "HML-PREUNI",
            },
        }
        unidades = {}
        for chave, dados in definicoes.items():
            unidade, _ = Unidade.objects.update_or_create(
                sigla=dados["sigla"],
                defaults={
                    "nome": dados["nome"],
                    "codigo": dados["codigo"],
                    "ativo": True,
                },
            )
            unidades[chave] = unidade
        return unidades

    @staticmethod
    def _criar_usuarios(unidades, senha):
        User = get_user_model()
        definicoes = {
            "usuario_teste": {
                "perfil": Perfil.USUARIO,
                "unidade": unidades["solicitante"],
                "first_name": "Joara",
                "last_name": "Solicitante",
                "is_staff": False,
            },
            "admin_teste": {
                "perfil": Perfil.ADMIN,
                "unidade": unidades["admin"],
                "first_name": "Gestor",
                "last_name": "TIC",
                "is_staff": True,
            },
            "admin_outro_grupo": {
                "perfil": Perfil.ADMIN,
                "unidade": unidades["outro_admin"],
                "first_name": "Gestor",
                "last_name": "Infraestrutura",
                "is_staff": True,
            },
            "admin_master_teste": {
                "perfil": Perfil.ADMIN_MASTER,
                "unidade": unidades["admin"],
                "first_name": "Gestor",
                "last_name": "Master",
                "is_staff": True,
            },
        }
        usuarios = {}
        for indice, (username, dados) in enumerate(definicoes.items(), start=1):
            usuario, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": f"{username}@homologacao.invalid",
                    "siape": f"HML-{indice:04d}",
                    "first_name": dados["first_name"],
                    "last_name": dados["last_name"],
                    "perfil": dados["perfil"],
                    "unidade": dados["unidade"],
                    "is_active": True,
                    "is_staff": dados["is_staff"],
                    "is_superuser": False,
                },
            )
            if not usuario.check_password(senha):
                usuario.set_password(senha)
                usuario.save(update_fields=["password"])
            usuarios[username] = usuario
        return usuarios

    @staticmethod
    def _criar_grupos(unidades):
        definicoes = {
            "tic": {
                "nome": "TIC Homologacao",
                "descricao": "Bens e serviços de tecnologia para os cenários de homologação.",
                "unidade_admin": unidades["admin"],
            },
            "infraestrutura": {
                "nome": "Obras Homologacao",
                "descricao": "Serviços de infraestrutura usados para validar o escopo por grupo.",
                "unidade_admin": unidades["outro_admin"],
            },
        }
        grupos = {}
        for chave, dados in definicoes.items():
            grupo, _ = GrupoContratacao.objects.update_or_create(
                nome=dados["nome"],
                defaults={
                    "descricao": dados["descricao"],
                    "unidade_admin": dados["unidade_admin"],
                    "ativo": True,
                },
            )
            grupos[chave] = grupo
        return grupos

    @staticmethod
    def _criar_catalogo(grupos):
        definicoes = {
            "aguardando": {
                "codigo": "HML-CAT-001",
                "tipo": "material",
                "nome": "Notebook Homologacao",
                "descricao": "Notebook corporativo para o cenário aguardando validação.",
                "grupo": grupos["tic"],
                "unidade_medida": "unidade",
                "valor_estimado": Decimal("5000.00"),
                "ativo": True,
            },
            "devolvido": {
                "codigo": "HML-CAT-002",
                "tipo": "material",
                "nome": "Monitor Homologacao",
                "descricao": "Monitor para o cenário de devolução e reenvio.",
                "grupo": grupos["tic"],
                "unidade_medida": "unidade",
                "valor_estimado": Decimal("1200.00"),
                "ativo": True,
            },
            "validado": {
                "codigo": "HML-CAT-003",
                "tipo": "material",
                "nome": "Switch Homologacao",
                "descricao": "Switch gerenciável disponível para consolidação.",
                "grupo": grupos["tic"],
                "unidade_medida": "unidade",
                "valor_estimado": Decimal("3500.00"),
                "ativo": True,
            },
            "vinculado": {
                "codigo": "HML-CAT-004",
                "tipo": "material",
                "nome": "Nobreak Homologacao",
                "descricao": "Nobreak já vinculado ao DFD de demonstração.",
                "grupo": grupos["tic"],
                "unidade_medida": "unidade",
                "valor_estimado": Decimal("2200.00"),
                "ativo": True,
            },
            "outro_grupo": {
                "codigo": "HML-SER-001",
                "tipo": "servico",
                "nome": "Servico Outro Grupo",
                "descricao": "Serviço usado para demonstrar o isolamento entre grupos.",
                "grupo": grupos["infraestrutura"],
                "unidade_medida": "mês",
                "valor_estimado": Decimal("8000.00"),
                "ativo": True,
            },
            "inativo": {
                "codigo": "HML-CAT-999",
                "tipo": "material",
                "nome": "Item Inativo Homologacao",
                "descricao": "Item reservado para validar filtros e reativação do catálogo.",
                "grupo": grupos["tic"],
                "unidade_medida": "unidade",
                "valor_estimado": Decimal("100.00"),
                "ativo": False,
            },
        }
        catalogo = {}
        for chave, dados in definicoes.items():
            item, _ = ItemCatalogo.objects.update_or_create(
                codigo_catmat_catser=dados["codigo"],
                defaults={
                    "tipo": dados["tipo"],
                    "nome": dados["nome"],
                    "descricao": dados["descricao"],
                    "grupo": dados["grupo"],
                    "unidade_medida": dados["unidade_medida"],
                    "valor_estimado": dados["valor_estimado"],
                    "ativo": dados["ativo"],
                },
            )
            catalogo[chave] = item
        return catalogo

    @staticmethod
    def _criar_demanda(unidades, usuarios):
        ciclo, _ = CicloPAC.objects.update_or_create(
            ano=ANO_REFERENCIA,
            defaults={"ativo": True},
        )
        demandas_do_seed = Demanda.objects.filter(
            usuario=usuarios["usuario_teste"],
            ano_referencia=ANO_REFERENCIA,
        )
        demanda = (
            demandas_do_seed.filter(observacao=DEMANDA_MARKER).order_by("pk").first()
            or demandas_do_seed.order_by("pk").first()
        )
        valores = {
            "unidade": unidades["solicitante"],
            "ciclo_pac": ciclo,
            "status": StatusDemanda.EM_ANDAMENTO,
            "observacao": DEMANDA_MARKER,
            "enviada_em": datetime(2098, 10, 1, 12, tzinfo=UTC),
        }
        if demanda is None:
            demanda = Demanda.objects.create(
                usuario=usuarios["usuario_teste"],
                ano_referencia=ANO_REFERENCIA,
                **valores,
            )
        else:
            for campo, valor in valores.items():
                setattr(demanda, campo, valor)
            demanda.save(update_fields=[*valores, "atualizado_em"])
        return demanda, ciclo

    @staticmethod
    def _criar_dfd(ciclo, grupos, usuarios):
        dfd, _ = DFD.objects.update_or_create(
            numero="HML-DFD-001",
            ciclo_pac=ciclo,
            defaults={
                "grupo": grupos["tic"],
                "criado_por": usuarios["admin_teste"],
                "numero_processo": "23111.000001/2099-01",
                "link_publico": "https://example.invalid/dfd/HML-DFD-001",
                "observacao": "DFD controlado pelo seed de homologação.",
            },
        )
        return dfd

    @staticmethod
    def _criar_itens(demanda, catalogo, dfd):
        definicoes = {
            "aguardando": {
                "catalogo": catalogo["aguardando"],
                "status": StatusItemDemanda.AGUARDANDO_VALIDACAO,
                "quantidade": 2,
                "prioridade": Prioridade.ALTA,
                "justificativa_prioridade": "Necessário antes do início do próximo período letivo.",
                "dfd": None,
            },
            "devolvido": {
                "catalogo": catalogo["devolvido"],
                "status": StatusItemDemanda.DEVOLVIDA,
                "quantidade": 3,
                "prioridade": Prioridade.MEDIA,
                "justificativa_prioridade": "",
                "dfd": None,
            },
            "validado": {
                "catalogo": catalogo["validado"],
                "status": StatusItemDemanda.VALIDADA,
                "quantidade": 1,
                "prioridade": Prioridade.MEDIA,
                "justificativa_prioridade": "",
                "dfd": None,
            },
            "vinculado": {
                "catalogo": catalogo["vinculado"],
                "status": StatusItemDemanda.VINCULADA_DFD,
                "quantidade": 4,
                "prioridade": Prioridade.MEDIA,
                "justificativa_prioridade": "",
                "dfd": dfd,
            },
            "outro_grupo": {
                "catalogo": catalogo["outro_grupo"],
                "status": StatusItemDemanda.VALIDADA,
                "quantidade": 1,
                "prioridade": Prioridade.BAIXA,
                "justificativa_prioridade": "",
                "dfd": None,
            },
        }
        itens = {}
        for chave, dados in definicoes.items():
            item_catalogo = dados["catalogo"]
            quantidade = dados["quantidade"]
            item, _ = ItemDemanda.objects.update_or_create(
                demanda=demanda,
                item_catalogo=item_catalogo,
                defaults={
                    "tipo": item_catalogo.tipo,
                    "nome": item_catalogo.nome,
                    "descricao": item_catalogo.descricao,
                    "unidade_medida": item_catalogo.unidade_medida,
                    "quantidade": quantidade,
                    "valor_estimado": item_catalogo.valor_estimado,
                    "valor_total": item_catalogo.valor_estimado * quantidade,
                    "data_prevista": date(ANO_REFERENCIA, 6, 30),
                    "prioridade": dados["prioridade"],
                    "justificativa_prioridade": dados["justificativa_prioridade"],
                    "justificativa_necessidade": (
                        "Atender ao planejamento anual usado na homologação do PAC."
                    ),
                    "indicacao_orcamentaria": "Recursos do orçamento de homologação de 2099",
                    "observacoes": "Registro controlado pelo seed_homologacao.",
                    "status": dados["status"],
                    "dfd": dados["dfd"],
                },
            )
            itens[chave] = item
        return itens

    @staticmethod
    def _criar_historico_validacao(itens, usuarios):
        devolucoes = Validacao.objects.filter(
            item_demanda=itens["devolvido"],
            acao=TipoAcao.DEVOLVIDO,
        ).order_by("pk")
        devolucao = devolucoes.first()
        if devolucao is None:
            devolucao = Validacao.objects.create(
                item_demanda=itens["devolvido"],
                acao=TipoAcao.DEVOLVIDO,
                comentario=MOTIVO_DEVOLUCAO,
                usuario=usuarios["admin_teste"],
            )
        else:
            devolucao.usuario = usuarios["admin_teste"]
            devolucao.comentario = MOTIVO_DEVOLUCAO
            devolucao.save(update_fields=["usuario", "comentario"])
        Validacao.objects.filter(item_demanda__in=itens.values()).exclude(
            pk=devolucao.pk
        ).delete()

    @staticmethod
    def _sincronizar_dfd(dfd, item_vinculado):
        if item_vinculado.dfd_id != dfd.id:
            item_vinculado.dfd = dfd
            item_vinculado.status = StatusItemDemanda.VINCULADA_DFD
            item_vinculado.save(update_fields=["dfd", "status", "atualizado_em"])
        dfd.itens_demanda.set([item_vinculado])
