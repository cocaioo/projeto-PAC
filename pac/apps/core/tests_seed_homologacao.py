import json
import os
from collections import Counter
from datetime import date
from decimal import Decimal
from io import StringIO
from unittest import mock

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from apps.catalogo.models import ItemCatalogo
from apps.core.management.commands.seed_homologacao import DFD_PREFIX
from apps.core.seed_homologacao_data import (
    ANO_REFERENCIA,
    CATALOGO,
    CENARIOS,
    GRUPOS,
    SEED_NAMESPACE,
    UNIDADES,
    VALIDATION_NAMESPACE,
)
from apps.core.seed_safety import PASSWORD_ENV, inspect_seed_target
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


TEST_PASSWORD = "valor-exclusivo-do-ambiente-de-teste"
EXPECTED_SCENARIOS = dict(CENARIOS)


@override_settings(
    PAC_ENVIRONMENT="development",
    ALLOW_HOMOLOGACAO_SEED=True,
)
class SeedHomologacaoTests(TestCase):
    def executar_seed(self, password=TEST_PASSWORD):
        stdout = StringIO()
        fingerprint = inspect_seed_target().fingerprint
        with mock.patch.dict(os.environ, {PASSWORD_ENV: password}):
            call_command(
                "seed_homologacao",
                apply=True,
                confirm_target=fingerprint,
                stdout=stdout,
            )
        return stdout.getvalue()

    @staticmethod
    def demandas_seed():
        return Demanda.objects.filter(
            observacao__startswith=SEED_NAMESPACE,
            ano_referencia=ANO_REFERENCIA,
        )

    @staticmethod
    def cenario(demanda):
        return (
            demanda.observacao.removeprefix(SEED_NAMESPACE)
            .strip()
            .split(":", maxsplit=1)[0]
        )

    @staticmethod
    def relatorio_json(output):
        return json.loads(output[output.index("{") :])

    @staticmethod
    def criar_item_manual(
        demanda,
        *,
        nome="Item institucional alheio ao seed",
        status=StatusItemDemanda.RASCUNHO,
        dfd=None,
    ):
        return ItemDemanda.objects.create(
            demanda=demanda,
            dfd=dfd,
            item_catalogo=None,
            tipo="material",
            nome=nome,
            descricao="Registro manual criado fora do namespace da massa de testes.",
            unidade_medida="unidade",
            quantidade=2,
            valor_estimado=Decimal("125.50"),
            valor_total=Decimal("251.00"),
            data_prevista=date(ANO_REFERENCIA, 8, 15),
            prioridade=Prioridade.MEDIA,
            justificativa_prioridade="",
            justificativa_necessidade="Necessidade institucional independente.",
            indicacao_orcamentaria="Planejamento institucional",
            observacoes="Não deve ser alterado pelo seed.",
            status=status,
        )

    def test_cria_volume_personas_e_itens_coerentes(self):
        output = self.executar_seed()

        unit_siglas = [definition[1] for definition in UNIDADES]
        group_names = [definition[1] for definition in GRUPOS]
        catalog_codes = [definition["codigo"] for definition in CATALOGO]
        self.assertEqual(len(UNIDADES), 17)
        self.assertEqual(len(GRUPOS), 5)
        self.assertEqual(len(CATALOGO), 41)
        self.assertEqual(Unidade.objects.filter(sigla__in=unit_siglas).count(), 17)
        self.assertFalse(
            Unidade.objects.filter(sigla__in=unit_siglas, ativo=False).exists()
        )
        self.assertEqual(
            GrupoContratacao.objects.filter(nome__in=group_names).count(),
            5,
        )

        catalogo = ItemCatalogo.objects.filter(
            codigo_catmat_catser__in=catalog_codes
        )
        self.assertEqual(catalogo.count(), 41)
        self.assertEqual(
            catalogo.filter(ativo=False).count(),
            sum(not definition["ativo"] for definition in CATALOGO),
        )

        demandas = self.demandas_seed().select_related("usuario").prefetch_related(
            "itens__item_catalogo"
        )
        self.assertEqual(demandas.count(), 41)
        self.assertEqual(
            Counter(self.cenario(demanda) for demanda in demandas),
            Counter(EXPECTED_SCENARIOS),
        )

        seeded_users = get_user_model().objects.filter(
            email__endswith="@homologacao.invalid"
        )
        self.assertEqual(seeded_users.count(), 49)
        self.assertEqual(seeded_users.filter(perfil=Perfil.USUARIO).count(), 43)
        self.assertEqual(seeded_users.filter(perfil=Perfil.ADMIN).count(), 5)
        self.assertEqual(seeded_users.filter(perfil=Perfil.ADMIN_MASTER).count(), 1)
        self.assertFalse(
            get_user_model()
            .objects.get(username="usuario_sem_demanda")
            .demandas.exists()
        )
        self.assertFalse(
            get_user_model()
            .objects.get(username="usuario_teste")
            .demandas.exists()
        )
        self.assertEqual(
            get_user_model()
            .objects.get(username="usuario_aguardando")
            .demandas.filter(
                observacao__startswith=f"{SEED_NAMESPACE} aguardando:"
            )
            .count(),
            1,
        )
        for username, expected_profile in (
            ("usuario_teste", Perfil.USUARIO),
            ("admin_teste", Perfil.ADMIN),
            ("admin_outro_grupo", Perfil.ADMIN),
            ("admin_master_teste", Perfil.ADMIN_MASTER),
        ):
            user = seeded_users.get(username=username)
            self.assertEqual(user.perfil, expected_profile)
            self.assertFalse(user.is_superuser)
        self.assertFalse(seeded_users.get(username="usuario_teste").is_staff)
        self.assertTrue(seeded_users.get(username="admin_teste").is_staff)
        self.assertTrue(seeded_users.get(username="admin_master_teste").is_staff)

        all_items = []
        manual_scenarios = set()
        for demanda in demandas:
            items = list(demanda.itens.all())
            self.assertGreaterEqual(len(items), 1)
            self.assertLessEqual(len(items), 8)
            all_items.extend(items)

            catalog_ids = [
                item.item_catalogo_id
                for item in items
                if item.item_catalogo_id is not None
            ]
            self.assertEqual(len(catalog_ids), len(set(catalog_ids)))
            for item in items:
                self.assertEqual(
                    item.valor_total,
                    item.valor_estimado * item.quantidade,
                )
                if item.item_catalogo_id is None:
                    manual_scenarios.add(self.cenario(demanda))
                    continue
                self.assertEqual(item.nome, item.item_catalogo.nome)
                self.assertEqual(item.tipo, item.item_catalogo.tipo)
                self.assertEqual(item.descricao, item.item_catalogo.descricao)
                self.assertEqual(
                    item.unidade_medida,
                    item.item_catalogo.unidade_medida,
                )
                self.assertEqual(
                    item.valor_estimado,
                    item.item_catalogo.valor_estimado,
                )

        self.assertEqual(manual_scenarios, {"rascunho", "cancelada"})
        self.assertTrue(any(item.item_catalogo_id is None for item in all_items))
        self.assertTrue(any(item.item_catalogo_id is not None for item in all_items))
        self.assertEqual(
            {item.prioridade for item in all_items},
            {Prioridade.BAIXA, Prioridade.MEDIA, Prioridade.ALTA},
        )
        self.assertTrue(
            all(
                item.justificativa_prioridade.strip()
                for item in all_items
                if item.prioridade == Prioridade.ALTA
            )
        )

        report = self.relatorio_json(output)
        self.assertEqual(report["counts"]["unidades"], 17)
        self.assertEqual(report["counts"]["grupos"], 5)
        self.assertEqual(report["counts"]["catalogo"], 41)
        self.assertEqual(report["counts"]["demandas"], 41)
        for scenario, amount in CENARIOS:
            self.assertEqual(report["counts"][f"cenario_{scenario}"], amount)

    def test_representa_estados_historicos_e_consolidacoes(self):
        self.executar_seed()

        demandas_por_cenario = {
            scenario: list(
                self.demandas_seed()
                .filter(observacao__startswith=f"{SEED_NAMESPACE} {scenario}:")
                .prefetch_related("itens__validacoes", "itens__dfd")
            )
            for scenario in EXPECTED_SCENARIOS
        }

        for demanda in demandas_por_cenario["rascunho"]:
            self.assertEqual(demanda.status, StatusDemanda.RASCUNHO)
            self.assertIsNone(demanda.enviada_em)
            self.assertEqual(
                set(demanda.itens.values_list("status", flat=True)),
                {StatusItemDemanda.RASCUNHO},
            )

        for demanda in demandas_por_cenario["aguardando"]:
            self.assertEqual(demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)
            self.assertIsNotNone(demanda.enviada_em)
            self.assertEqual(
                set(demanda.itens.values_list("status", flat=True)),
                {StatusItemDemanda.AGUARDANDO_VALIDACAO},
            )

        partial_items = ItemDemanda.objects.filter(
            demanda__in=demandas_por_cenario["parcial"]
        )
        self.assertEqual(
            set(partial_items.values_list("status", flat=True)),
            {
                StatusItemDemanda.AGUARDANDO_VALIDACAO,
                StatusItemDemanda.VALIDADA,
            },
        )
        for demanda in demandas_por_cenario["parcial"]:
            self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
            self.assertEqual(
                set(demanda.itens.values_list("status", flat=True)),
                {
                    StatusItemDemanda.AGUARDANDO_VALIDACAO,
                    StatusItemDemanda.VALIDADA,
                },
            )
        partial_validated = partial_items.filter(status=StatusItemDemanda.VALIDADA)
        self.assertEqual(
            Validacao.objects.filter(
                item_demanda__in=partial_validated,
                acao=TipoAcao.VALIDADO,
                comentario__startswith=VALIDATION_NAMESPACE,
            ).count(),
            partial_validated.count(),
        )
        self.assertFalse(
            Validacao.objects.filter(
                item_demanda__in=partial_items.filter(
                    status=StatusItemDemanda.AGUARDANDO_VALIDACAO
                )
            ).exists()
        )

        for scenario, current_status in (
            ("devolvida", StatusItemDemanda.DEVOLVIDA),
            ("reenviada", StatusItemDemanda.AGUARDANDO_VALIDACAO),
        ):
            demands = demandas_por_cenario[scenario]
            scenario_items = ItemDemanda.objects.filter(demanda__in=demands)
            self.assertEqual(
                set(scenario_items.values_list("status", flat=True)),
                {current_status},
            )
            self.assertEqual(
                Validacao.objects.filter(
                    item_demanda__in=scenario_items,
                    acao=TipoAcao.DEVOLVIDO,
                    comentario__startswith=VALIDATION_NAMESPACE,
                ).count(),
                scenario_items.count(),
            )
        self.assertTrue(
            all(
                demanda.status == StatusDemanda.EM_ANDAMENTO
                for demanda in demandas_por_cenario["devolvida"]
            )
        )
        self.assertTrue(
            all(
                demanda.status == StatusDemanda.AGUARDANDO_VALIDACAO
                for demanda in demandas_por_cenario["reenviada"]
            )
        )

        validated_items = ItemDemanda.objects.filter(
            demanda__in=demandas_por_cenario["validada"]
        )
        self.assertEqual(
            set(validated_items.values_list("status", flat=True)),
            {StatusItemDemanda.VALIDADA},
        )
        self.assertEqual(
            Validacao.objects.filter(
                item_demanda__in=validated_items,
                acao=TipoAcao.VALIDADO,
                comentario__startswith=VALIDATION_NAMESPACE,
            ).count(),
            validated_items.count(),
        )
        self.assertTrue(
            all(
                demanda.status == StatusDemanda.EM_ANDAMENTO
                for demanda in demandas_por_cenario["validada"]
            )
        )

        dfds = DFD.objects.filter(
            numero__startswith=DFD_PREFIX,
            ciclo_pac__ano=ANO_REFERENCIA,
        ).select_related("grupo")
        self.assertEqual(dfds.count(), 5)
        consolidated_demands = demandas_por_cenario["consolidada"]
        self.assertTrue(
            all(
                demanda.status == StatusDemanda.CONCLUIDA
                for demanda in consolidated_demands
            )
        )
        for dfd in dfds:
            m2m_ids = set(dfd.itens_demanda.values_list("pk", flat=True))
            fk_items = ItemDemanda.objects.filter(dfd=dfd)
            self.assertTrue(m2m_ids)
            self.assertEqual(m2m_ids, set(fk_items.values_list("pk", flat=True)))
            self.assertFalse(
                fk_items.exclude(status=StatusItemDemanda.VINCULADA_DFD).exists()
            )
            self.assertFalse(
                fk_items.exclude(item_catalogo__grupo=dfd.grupo).exists()
            )
            self.assertEqual(
                fk_items.values("demanda_id").distinct().count(),
                1,
            )

        for demanda in demandas_por_cenario["cancelada"]:
            self.assertEqual(demanda.status, StatusDemanda.CANCELADA)
            self.assertEqual(
                set(demanda.itens.values_list("status", flat=True)),
                {StatusItemDemanda.CANCELADA},
            )

    def test_reexecucao_preserva_ids_contagens_historicos_dfds_e_senha(self):
        first_output = self.executar_seed()

        seeded_users = get_user_model().objects.filter(
            email__endswith="@homologacao.invalid"
        )
        representative = seeded_users.get(username="usuario_teste")
        self.assertTrue(representative.check_password(TEST_PASSWORD))
        self.assertEqual(
            seeded_users.values_list("password", flat=True).distinct().count(),
            1,
        )
        password_hash = representative.password

        identities_before = {
            "units": dict(
                Unidade.objects.filter(
                    sigla__in=[definition[1] for definition in UNIDADES]
                ).values_list("sigla", "pk")
            ),
            "groups": dict(
                GrupoContratacao.objects.filter(
                    nome__in=[definition[1] for definition in GRUPOS]
                ).values_list("nome", "pk")
            ),
            "catalog": dict(
                ItemCatalogo.objects.filter(
                    codigo_catmat_catser__in=[
                        definition["codigo"] for definition in CATALOGO
                    ]
                ).values_list("codigo_catmat_catser", "pk")
            ),
            "users": dict(seeded_users.values_list("username", "pk")),
            "demands": dict(self.demandas_seed().values_list("observacao", "pk")),
            "items": {
                (item.demanda.observacao, item.item_catalogo_id or "manual"): item.pk
                for item in ItemDemanda.objects.filter(
                    demanda__in=self.demandas_seed()
                ).select_related("demanda")
            },
            "validations": dict(
                Validacao.objects.filter(
                    item_demanda__demanda__in=self.demandas_seed(),
                    comentario__startswith=VALIDATION_NAMESPACE,
                ).values_list("item_demanda_id", "pk")
            ),
            "dfds": dict(
                DFD.objects.filter(
                    numero__startswith=DFD_PREFIX,
                    ciclo_pac__ano=ANO_REFERENCIA,
                ).values_list("numero", "pk")
            ),
        }
        counts_before = {
            "users": seeded_users.count(),
            "demands": self.demandas_seed().count(),
            "items": ItemDemanda.objects.filter(
                demanda__in=self.demandas_seed()
            ).count(),
            "validations": Validacao.objects.filter(
                item_demanda__demanda__in=self.demandas_seed()
            ).count(),
            "dfds": DFD.objects.filter(numero__startswith=DFD_PREFIX).count(),
        }
        dfd_relations_before = {
            dfd.numero: tuple(
                dfd.itens_demanda.order_by("pk").values_list("pk", flat=True)
            )
            for dfd in DFD.objects.filter(numero__startswith=DFD_PREFIX)
        }

        second_output = self.executar_seed()

        seeded_users = get_user_model().objects.filter(
            email__endswith="@homologacao.invalid"
        )
        identities_after = {
            "units": dict(
                Unidade.objects.filter(
                    sigla__in=[definition[1] for definition in UNIDADES]
                ).values_list("sigla", "pk")
            ),
            "groups": dict(
                GrupoContratacao.objects.filter(
                    nome__in=[definition[1] for definition in GRUPOS]
                ).values_list("nome", "pk")
            ),
            "catalog": dict(
                ItemCatalogo.objects.filter(
                    codigo_catmat_catser__in=[
                        definition["codigo"] for definition in CATALOGO
                    ]
                ).values_list("codigo_catmat_catser", "pk")
            ),
            "users": dict(seeded_users.values_list("username", "pk")),
            "demands": dict(self.demandas_seed().values_list("observacao", "pk")),
            "items": {
                (item.demanda.observacao, item.item_catalogo_id or "manual"): item.pk
                for item in ItemDemanda.objects.filter(
                    demanda__in=self.demandas_seed()
                ).select_related("demanda")
            },
            "validations": dict(
                Validacao.objects.filter(
                    item_demanda__demanda__in=self.demandas_seed(),
                    comentario__startswith=VALIDATION_NAMESPACE,
                ).values_list("item_demanda_id", "pk")
            ),
            "dfds": dict(
                DFD.objects.filter(
                    numero__startswith=DFD_PREFIX,
                    ciclo_pac__ano=ANO_REFERENCIA,
                ).values_list("numero", "pk")
            ),
        }
        counts_after = {
            "users": seeded_users.count(),
            "demands": self.demandas_seed().count(),
            "items": ItemDemanda.objects.filter(
                demanda__in=self.demandas_seed()
            ).count(),
            "validations": Validacao.objects.filter(
                item_demanda__demanda__in=self.demandas_seed()
            ).count(),
            "dfds": DFD.objects.filter(numero__startswith=DFD_PREFIX).count(),
        }
        dfd_relations_after = {
            dfd.numero: tuple(
                dfd.itens_demanda.order_by("pk").values_list("pk", flat=True)
            )
            for dfd in DFD.objects.filter(numero__startswith=DFD_PREFIX)
        }

        self.assertEqual(identities_after, identities_before)
        self.assertEqual(counts_after, counts_before)
        self.assertEqual(dfd_relations_after, dfd_relations_before)
        representative.refresh_from_db()
        self.assertEqual(representative.password, password_hash)
        self.assertTrue(representative.check_password(TEST_PASSWORD))
        self.assertNotIn(TEST_PASSWORD, first_output)
        self.assertNotIn(TEST_PASSWORD, second_output)
        report = self.relatorio_json(second_output)
        self.assertEqual(
            report["credentials"],
            {"source": PASSWORD_ENV, "value": "omitted"},
        )
        self.assertEqual(report["target"]["fingerprint"], inspect_seed_target().fingerprint)
        self.assertNotIn(TEST_PASSWORD, json.dumps(report))

    def test_reexecucao_preserva_registros_humanos_e_reconcilia_dfds_seed(self):
        self.executar_seed()

        user = get_user_model().objects.get(username="usuario_teste")
        admin_master = get_user_model().objects.get(username="admin_master_teste")
        cycle = CicloPAC.objects.get(ano=ANO_REFERENCIA)
        manual_demand = Demanda.objects.create(
            unidade=user.unidade,
            usuario=user,
            ano_referencia=ANO_REFERENCIA,
            ciclo_pac=cycle,
            status=StatusDemanda.RASCUNHO,
            observacao="Demanda manual do usuário, fora do namespace do seed.",
        )

        first_seed_dfd, second_seed_dfd = list(
            DFD.objects.filter(numero__startswith=DFD_PREFIX).order_by("numero")[:2]
        )
        external_dfd = DFD.objects.create(
            numero="DFD-INSTITUCIONAL-ALHEIO",
            grupo=first_seed_dfd.grupo,
            ciclo_pac=cycle,
            criado_por=admin_master,
            numero_processo="23111.999999/2099-99",
            observacao="Documento institucional fora do namespace do seed.",
        )
        manual_item = self.criar_item_manual(
            manual_demand,
            status=StatusItemDemanda.VINCULADA_DFD,
            dfd=external_dfd,
        )
        external_dfd.itens_demanda.add(manual_item)

        returned_item = ItemDemanda.objects.filter(
            demanda__observacao__startswith=f"{SEED_NAMESPACE} devolvida:"
        ).first()
        human_validation = Validacao.objects.create(
            item_demanda=returned_item,
            usuario=admin_master,
            acao=TipoAcao.VALIDADO,
            comentario="Análise humana posterior, sem marcador reservado.",
        )

        first_seed_item = first_seed_dfd.itens_demanda.order_by("pk").first()
        second_seed_item = second_seed_dfd.itens_demanda.order_by("pk").first()
        first_seed_item.dfd = external_dfd
        first_seed_item.status = StatusItemDemanda.VALIDADA
        first_seed_item.save(update_fields=["dfd", "status"])
        first_seed_dfd.itens_demanda.remove(first_seed_item)
        external_dfd.itens_demanda.add(first_seed_item)
        second_seed_item.dfd = None
        second_seed_item.status = StatusItemDemanda.VALIDADA
        second_seed_item.save(update_fields=["dfd", "status"])
        second_seed_dfd.itens_demanda.remove(second_seed_item)
        first_seed_dfd.itens_demanda.add(second_seed_item)

        manual_snapshot = {
            "demand_pk": manual_demand.pk,
            "demand_observation": manual_demand.observacao,
            "item_pk": manual_item.pk,
            "item_name": manual_item.nome,
            "item_status": manual_item.status,
            "item_dfd": manual_item.dfd_id,
            "dfd_pk": external_dfd.pk,
            "dfd_observation": external_dfd.observacao,
        }

        self.executar_seed()

        manual_demand.refresh_from_db()
        manual_item.refresh_from_db()
        external_dfd.refresh_from_db()
        human_validation.refresh_from_db()
        self.assertEqual(manual_demand.pk, manual_snapshot["demand_pk"])
        self.assertEqual(
            manual_demand.observacao,
            manual_snapshot["demand_observation"],
        )
        self.assertEqual(manual_item.pk, manual_snapshot["item_pk"])
        self.assertEqual(manual_item.nome, manual_snapshot["item_name"])
        self.assertEqual(manual_item.status, manual_snapshot["item_status"])
        self.assertEqual(manual_item.dfd_id, manual_snapshot["item_dfd"])
        self.assertEqual(external_dfd.pk, manual_snapshot["dfd_pk"])
        self.assertEqual(
            external_dfd.observacao,
            manual_snapshot["dfd_observation"],
        )
        self.assertQuerySetEqual(external_dfd.itens_demanda.all(), [manual_item])
        self.assertEqual(
            Demanda.objects.filter(
                usuario=user,
                ano_referencia=ANO_REFERENCIA,
            ).count(),
            1,
        )

        self.assertEqual(human_validation.acao, TipoAcao.VALIDADO)
        self.assertEqual(
            human_validation.comentario,
            "Análise humana posterior, sem marcador reservado.",
        )
        self.assertEqual(
            Validacao.objects.filter(
                item_demanda=returned_item,
                comentario__startswith=VALIDATION_NAMESPACE,
            ).count(),
            1,
        )

        for dfd in DFD.objects.filter(numero__startswith=DFD_PREFIX):
            fk_items = ItemDemanda.objects.filter(dfd=dfd)
            self.assertEqual(
                set(dfd.itens_demanda.values_list("pk", flat=True)),
                set(fk_items.values_list("pk", flat=True)),
            )
            self.assertFalse(
                fk_items.exclude(status=StatusItemDemanda.VINCULADA_DFD).exists()
            )
            self.assertFalse(
                fk_items.exclude(
                    demanda__observacao__startswith=SEED_NAMESPACE
                ).exists()
            )

    def test_colisao_de_dfd_reservado_e_recusada_atomicamente(self):
        self.executar_seed()

        colliding_dfd = DFD.objects.get(numero=f"{DFD_PREFIX}001")
        colliding_dfd.observacao = "Documento institucional sem namespace reservado."
        colliding_dfd.save(update_fields=["observacao"])
        seed_unit = Unidade.objects.get(sigla="HML-STI")
        seed_unit.ativo = False
        seed_unit.save(update_fields=["ativo"])
        seed_catalog_item = ItemCatalogo.objects.get(
            codigo_catmat_catser="HML-CAT-001"
        )
        seed_catalog_item.ativo = False
        seed_catalog_item.save(update_fields=["ativo"])
        counts_before = {
            "demands": Demanda.objects.count(),
            "items": ItemDemanda.objects.count(),
            "validations": Validacao.objects.count(),
            "dfds": DFD.objects.count(),
        }

        with self.assertRaises(CommandError):
            self.executar_seed()

        colliding_dfd.refresh_from_db()
        seed_unit.refresh_from_db()
        seed_catalog_item.refresh_from_db()
        self.assertEqual(
            colliding_dfd.observacao,
            "Documento institucional sem namespace reservado.",
        )
        self.assertFalse(seed_unit.ativo)
        self.assertFalse(seed_catalog_item.ativo)
        self.assertEqual(
            {
                "demands": Demanda.objects.count(),
                "items": ItemDemanda.objects.count(),
                "validations": Validacao.objects.count(),
                "dfds": DFD.objects.count(),
            },
            counts_before,
        )

    def test_exige_senha_externa_sem_gravar_dados(self):
        fingerprint = inspect_seed_target().fingerprint
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop(PASSWORD_ENV, None)
            with self.assertRaisesMessage(CommandError, PASSWORD_ENV):
                call_command(
                    "seed_homologacao",
                    apply=True,
                    confirm_target=fingerprint,
                    stdout=StringIO(),
                )

        self.assertFalse(self.demandas_seed().exists())
        self.assertFalse(
            get_user_model().objects.filter(username="usuario_teste").exists()
        )

    def test_nao_altera_unidade_nem_ciclo_institucional_real(self):
        real_unit = Unidade.objects.create(
            sigla="STI",
            nome="Superintendência institucional",
            codigo="STI-REAL",
            ativo=False,
        )
        real_cycle = CicloPAC.objects.create(ano=2027, ativo=False)

        self.executar_seed()

        real_unit.refresh_from_db()
        real_cycle.refresh_from_db()
        self.assertEqual(real_unit.nome, "Superintendência institucional")
        self.assertEqual(real_unit.codigo, "STI-REAL")
        self.assertFalse(real_unit.ativo)
        self.assertFalse(real_cycle.ativo)
        self.assertTrue(CicloPAC.objects.get(ano=ANO_REFERENCIA).ativo)

    def test_recusa_ciclo_2099_com_dados_alheios_sem_efeitos_parciais(self):
        real_unit = Unidade.objects.create(
            sigla="REAL-2099",
            nome="Unidade institucional do ciclo 2099",
            codigo="REAL-2099",
            ativo=True,
        )
        real_user = get_user_model().objects.create(
            username="usuario_institucional_2099",
            email="usuario.institucional.2099@example.edu.br",
            siape="REAL-2099",
            first_name="Usuário",
            last_name="Institucional",
            perfil=Perfil.USUARIO,
            unidade=real_unit,
            password="!senha-inutilizavel!",
        )
        real_cycle = CicloPAC.objects.create(ano=ANO_REFERENCIA, ativo=False)
        real_demand = Demanda.objects.create(
            unidade=real_unit,
            usuario=real_user,
            ano_referencia=ANO_REFERENCIA,
            ciclo_pac=real_cycle,
            status=StatusDemanda.RASCUNHO,
            observacao="Planejamento institucional real de 2099.",
        )
        real_item = self.criar_item_manual(
            real_demand,
            nome="Item institucional real de 2099",
        )

        with self.assertRaises(CommandError):
            self.executar_seed()

        real_cycle.refresh_from_db()
        real_demand.refresh_from_db()
        real_item.refresh_from_db()
        self.assertFalse(real_cycle.ativo)
        self.assertEqual(
            real_demand.observacao,
            "Planejamento institucional real de 2099.",
        )
        self.assertEqual(real_item.nome, "Item institucional real de 2099")
        self.assertEqual(Unidade.objects.count(), 1)
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(CicloPAC.objects.count(), 1)
        self.assertEqual(Demanda.objects.count(), 1)
        self.assertEqual(ItemDemanda.objects.count(), 1)
        self.assertFalse(
            Unidade.objects.filter(
                sigla__in=[definition[1] for definition in UNIDADES]
            ).exists()
        )
        self.assertFalse(
            ItemCatalogo.objects.filter(
                codigo_catmat_catser__in=[
                    definition["codigo"] for definition in CATALOGO
                ]
            ).exists()
        )
