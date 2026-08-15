import os
from io import StringIO
from pathlib import Path
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import (
    CicloPAC,
    Demanda,
    ItemDemanda,
    Prioridade,
    StatusDemanda,
    StatusItemDemanda,
)
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil
from apps.validacoes.models import TipoAcao, Validacao


PASSWORD_ENV = "HOMOLOGACAO_TEST_PASSWORD"
TEST_PASSWORD = "valor-exclusivo-do-ambiente-de-teste"
DEMANDA_MARKER = "[SEED HOMOLOGACAO] Cenários controlados para validação do MVP."
SEEDED_USERS = [
    "usuario_teste",
    "admin_teste",
    "admin_outro_grupo",
    "admin_master_teste",
]


class SeedHomologacaoTests(TestCase):
    def executar_seed(self):
        stdout = StringIO()
        with mock.patch.dict(os.environ, {PASSWORD_ENV: TEST_PASSWORD}):
            call_command("seed_homologacao", stdout=stdout)
        return stdout.getvalue()

    def test_cria_cenarios_coerentes_para_homologacao(self):
        self.executar_seed()

        unidades = Unidade.objects.filter(
            sigla__in=["HML-CCN", "HML-STI", "HML-PREUNI"]
        )
        self.assertEqual(unidades.count(), 3)
        self.assertTrue(all(unidade.ativo for unidade in unidades))

        User = get_user_model()
        usuario = User.objects.get(username="usuario_teste")
        admin = User.objects.get(username="admin_teste")
        admin_outro = User.objects.get(username="admin_outro_grupo")
        admin_master = User.objects.get(username="admin_master_teste")
        self.assertEqual(usuario.perfil, Perfil.USUARIO)
        self.assertEqual(admin.perfil, Perfil.ADMIN)
        self.assertEqual(admin_outro.perfil, Perfil.ADMIN)
        self.assertEqual(admin_master.perfil, Perfil.ADMIN_MASTER)
        self.assertFalse(usuario.is_staff)
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin_master.is_staff)
        self.assertFalse(admin_master.is_superuser)
        self.assertTrue(all(user.check_password(TEST_PASSWORD) for user in User.objects.all()))

        grupos = GrupoContratacao.objects.filter(
            nome__in=["TIC Homologacao", "Obras Homologacao"]
        )
        self.assertEqual(grupos.count(), 2)
        self.assertEqual(
            grupos.get(nome="TIC Homologacao").unidade_admin.sigla,
            "HML-STI",
        )
        self.assertEqual(
            grupos.get(nome="Obras Homologacao").unidade_admin.sigla,
            "HML-PREUNI",
        )

        catalogo = ItemCatalogo.objects.filter(codigo_catmat_catser__startswith="HML-")
        self.assertEqual(catalogo.count(), 6)
        self.assertEqual(catalogo.filter(ativo=True).count(), 5)
        self.assertEqual(catalogo.filter(ativo=False).count(), 1)

        demanda = Demanda.objects.get(observacao=DEMANDA_MARKER)
        itens = demanda.itens.select_related("item_catalogo", "dfd")
        self.assertEqual(itens.count(), 5)
        self.assertEqual(
            itens.values("item_catalogo_id").distinct().count(),
            itens.count(),
        )
        for item in itens:
            self.assertEqual(item.nome, item.item_catalogo.nome)
            self.assertEqual(item.tipo, item.item_catalogo.tipo)
            self.assertEqual(item.descricao, item.item_catalogo.descricao)
            self.assertEqual(item.unidade_medida, item.item_catalogo.unidade_medida)
            self.assertEqual(item.valor_total, item.valor_estimado * item.quantidade)
        prioritario = itens.get(item_catalogo__codigo_catmat_catser="HML-CAT-001")
        self.assertEqual(prioritario.prioridade, Prioridade.ALTA)
        self.assertTrue(prioritario.justificativa_prioridade.strip())

        devolvido = itens.get(item_catalogo__codigo_catmat_catser="HML-CAT-002")
        historico = Validacao.objects.get(item_demanda=devolvido)
        self.assertEqual(historico.acao, TipoAcao.DEVOLVIDO)
        self.assertIn("especificação técnica", historico.comentario)
        self.assertEqual(historico.usuario, admin)

        dfd = DFD.objects.get(numero="HML-DFD-001", ciclo_pac=demanda.ciclo_pac)
        vinculado = itens.get(item_catalogo__codigo_catmat_catser="HML-CAT-004")
        self.assertEqual(vinculado.dfd, dfd)
        self.assertEqual(vinculado.item_catalogo.grupo, dfd.grupo)
        self.assertQuerySetEqual(dfd.itens_demanda.all(), [vinculado])
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)

    def test_nao_sobrescreve_referencias_institucionais_reais(self):
        unidade_real = Unidade.objects.create(
            sigla="STI",
            nome="Superintendência institucional",
            codigo="STI-REAL",
            ativo=False,
        )
        ciclo_real = CicloPAC.objects.create(ano=2027, ativo=False)

        self.executar_seed()

        unidade_real.refresh_from_db()
        ciclo_real.refresh_from_db()
        self.assertEqual(unidade_real.nome, "Superintendência institucional")
        self.assertEqual(unidade_real.codigo, "STI-REAL")
        self.assertFalse(unidade_real.ativo)
        self.assertFalse(ciclo_real.ativo)
        self.assertTrue(CicloPAC.objects.get(ano=2099).ativo)

    def test_reexecucao_preserva_identidades_contagens_e_senha(self):
        self.executar_seed()
        demanda = Demanda.objects.get(observacao=DEMANDA_MARKER)
        identidades_antes = {
            "unidades": dict(Unidade.objects.values_list("sigla", "pk")),
            "usuarios": dict(
                get_user_model().objects.filter(username__in=SEEDED_USERS).values_list(
                    "username", "pk"
                )
            ),
            "grupos": dict(
                GrupoContratacao.objects.filter(nome__contains="Homologacao").values_list(
                    "nome", "pk"
                )
            ),
            "catalogo": dict(
                ItemCatalogo.objects.filter(
                    codigo_catmat_catser__startswith="HML-"
                ).values_list("codigo_catmat_catser", "pk")
            ),
            "itens": dict(
                demanda.itens.values_list("item_catalogo__codigo_catmat_catser", "pk")
            ),
            "dfd": DFD.objects.get(numero="HML-DFD-001").pk,
            "validacao": Validacao.objects.get(
                item_demanda__demanda=demanda,
                acao=TipoAcao.DEVOLVIDO,
            ).pk,
        }
        contagens_antes = {
            "unidades": Unidade.objects.count(),
            "usuarios": get_user_model().objects.count(),
            "grupos": GrupoContratacao.objects.count(),
            "catalogo": ItemCatalogo.objects.count(),
            "demandas": Demanda.objects.count(),
            "itens": ItemDemanda.objects.count(),
            "dfds": DFD.objects.count(),
            "validacoes": Validacao.objects.count(),
        }
        hash_antes = get_user_model().objects.get(username="usuario_teste").password

        catalogo_ativo = ItemCatalogo.objects.get(codigo_catmat_catser="HML-CAT-001")
        catalogo_ativo.ativo = False
        catalogo_ativo.save(update_fields=["ativo"])
        demanda.status = StatusDemanda.CANCELADA
        demanda.observacao = "Marcador alterado durante a homologação"
        demanda.save(update_fields=["status", "observacao"])
        vinculado = demanda.itens.get(
            item_catalogo__codigo_catmat_catser="HML-CAT-004"
        )
        vinculado.status = StatusItemDemanda.VALIDADA
        vinculado.dfd = None
        vinculado.save(update_fields=["status", "dfd"])
        dfd = DFD.objects.get(numero="HML-DFD-001")
        dfd.itens_demanda.add(
            demanda.itens.get(item_catalogo__codigo_catmat_catser="HML-CAT-003")
        )
        validacao_base = Validacao.objects.get(
            item_demanda__demanda=demanda,
            acao=TipoAcao.DEVOLVIDO,
        )
        Validacao.objects.create(
            item_demanda=validacao_base.item_demanda,
            usuario=validacao_base.usuario,
            acao=validacao_base.acao,
            comentario=validacao_base.comentario,
        )

        self.executar_seed()

        demanda.refresh_from_db()
        identidades_depois = {
            "unidades": dict(Unidade.objects.values_list("sigla", "pk")),
            "usuarios": dict(
                get_user_model().objects.filter(username__in=SEEDED_USERS).values_list(
                    "username", "pk"
                )
            ),
            "grupos": dict(
                GrupoContratacao.objects.filter(nome__contains="Homologacao").values_list(
                    "nome", "pk"
                )
            ),
            "catalogo": dict(
                ItemCatalogo.objects.filter(
                    codigo_catmat_catser__startswith="HML-"
                ).values_list("codigo_catmat_catser", "pk")
            ),
            "itens": dict(
                demanda.itens.values_list("item_catalogo__codigo_catmat_catser", "pk")
            ),
            "dfd": DFD.objects.get(numero="HML-DFD-001").pk,
            "validacao": Validacao.objects.get(
                item_demanda__demanda=demanda,
                acao=TipoAcao.DEVOLVIDO,
            ).pk,
        }
        contagens_depois = {
            "unidades": Unidade.objects.count(),
            "usuarios": get_user_model().objects.count(),
            "grupos": GrupoContratacao.objects.count(),
            "catalogo": ItemCatalogo.objects.count(),
            "demandas": Demanda.objects.count(),
            "itens": ItemDemanda.objects.count(),
            "dfds": DFD.objects.count(),
            "validacoes": Validacao.objects.count(),
        }
        self.assertEqual(identidades_depois, identidades_antes)
        self.assertEqual(contagens_depois, contagens_antes)
        self.assertEqual(
            get_user_model().objects.get(username="usuario_teste").password,
            hash_antes,
        )
        catalogo_ativo.refresh_from_db()
        vinculado.refresh_from_db()
        demanda.refresh_from_db()
        self.assertTrue(catalogo_ativo.ativo)
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
        self.assertEqual(demanda.observacao, DEMANDA_MARKER)
        self.assertEqual(vinculado.status, StatusItemDemanda.VINCULADA_DFD)
        self.assertEqual(vinculado.dfd, dfd)
        self.assertQuerySetEqual(dfd.itens_demanda.all(), [vinculado])
        self.assertEqual(
            Validacao.objects.filter(
                item_demanda__demanda=demanda,
                acao=TipoAcao.DEVOLVIDO,
            ).count(),
            1,
        )

    def test_exige_senha_do_ambiente_e_nao_a_expoe(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop(PASSWORD_ENV, None)
            with self.assertRaisesMessage(CommandError, PASSWORD_ENV):
                call_command("seed_homologacao", stdout=StringIO())
        self.assertFalse(get_user_model().objects.filter(username="usuario_teste").exists())

        output = self.executar_seed()
        self.assertNotIn(TEST_PASSWORD, output)

        raiz = Path(settings.BASE_DIR).parent
        exemplo_env = (raiz / ".env.example").read_text(encoding="utf-8")
        linha_senha = next(
            linha for linha in exemplo_env.splitlines() if linha.startswith(f"{PASSWORD_ENV}=")
        )
        self.assertEqual(linha_senha, f"{PASSWORD_ENV}=")

        command_source = (
            raiz / "pac/apps/core/management/commands/seed_homologacao.py"
        ).read_text(encoding="utf-8")
        self.assertNotRegex(command_source, r"set_password\(\s*['\"]")
