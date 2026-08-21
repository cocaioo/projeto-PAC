"""Orcamentos de desempenho dos principais fluxos de leitura da API."""

from datetime import date
from decimal import Decimal
from time import perf_counter

from django.contrib.auth import get_user_model
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

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

Usuario = get_user_model()


class LeiturasComMassaRealistaPerformanceTests(APITestCase):
    """Protege os endpoints contra crescimento linear de consultas SQL."""

    TOTAL_DEMANDAS = 30
    ITENS_POR_DEMANDA = 5
    TOTAL_ITENS = TOTAL_DEMANDAS * ITENS_POR_DEMANDA
    TOTAL_PENDENTES = TOTAL_DEMANDAS * 2
    TOTAL_VALIDADOS = TOTAL_DEMANDAS * 2
    TOTAL_CONSOLIDADOS = TOTAL_DEMANDAS
    LIMITE_TEMPO_SEGUNDOS = 3.0

    @classmethod
    def setUpTestData(cls):
        cls.unidade_admin = Unidade.objects.create(
            nome="Unidade administradora de desempenho",
            sigla="PADM",
            codigo="PERF-ADM",
        )
        cls.admin = Usuario.objects.create(
            username="admin_performance",
            password="!",
            first_name="Admin",
            last_name="Performance",
            email="admin.performance@example.invalid",
            siape="PERF-ADM",
            perfil="admin",
            is_staff=True,
            unidade=cls.unidade_admin,
        )
        cls.ciclo = CicloPAC.objects.create(ano=2098, ativo=True)

        cls.grupos = [
            GrupoContratacao.objects.create(
                nome=f"Grupo de desempenho {indice}",
                descricao="Grupo ficticio para teste de carga.",
                unidade_admin=cls.unidade_admin,
            )
            for indice in range(1, 4)
        ]
        cls.catalogo = []
        for indice in range(15):
            grupo = cls.grupos[indice // 5]
            cls.catalogo.append(
                ItemCatalogo.objects.create(
                    tipo="material",
                    nome=f"Item catalogado de desempenho {indice + 1}",
                    descricao="Item ficticio usado apenas no teste de desempenho.",
                    codigo_catmat_catser=f"PERF-{indice + 1:03d}",
                    grupo=grupo,
                    unidade_medida="unidade",
                    valor_estimado=Decimal(100 + indice),
                )
            )

        unidades_solicitantes = [
            Unidade.objects.create(
                nome=f"Unidade solicitante {indice}",
                sigla=f"PS{indice:02d}",
                codigo=f"PERF-SOL-{indice:02d}",
            )
            for indice in range(1, 11)
        ]
        solicitantes = [
            Usuario.objects.create(
                username=f"solicitante_performance_{indice}",
                password="!",
                first_name=f"Solicitante {indice}",
                email=f"solicitante.performance.{indice}@example.invalid",
                siape=f"PERF-SOL-{indice:02d}",
                perfil="usuario",
                unidade=unidade,
            )
            for indice, unidade in enumerate(unidades_solicitantes, start=1)
        ]

        demandas = Demanda.objects.bulk_create(
            [
                Demanda(
                    unidade=solicitantes[indice % len(solicitantes)].unidade,
                    usuario=solicitantes[indice % len(solicitantes)],
                    ano_referencia=cls.ciclo.ano,
                    ciclo_pac=cls.ciclo,
                    status=StatusDemanda.EM_ANDAMENTO,
                    observacao=f"Demanda ficticia de desempenho {indice + 1}",
                    enviada_em=timezone.now(),
                )
                for indice in range(cls.TOTAL_DEMANDAS)
            ]
        )
        dfds = [
            DFD.objects.create(
                numero=f"PERF-DFD-{indice + 1}",
                grupo=grupo,
                ciclo_pac=cls.ciclo,
                criado_por=cls.admin,
            )
            for indice, grupo in enumerate(cls.grupos)
        ]

        itens = []
        for demanda_indice, demanda in enumerate(demandas):
            for item_indice in range(cls.ITENS_POR_DEMANDA):
                catalogo = cls.catalogo[
                    (demanda_indice * cls.ITENS_POR_DEMANDA + item_indice)
                    % len(cls.catalogo)
                ]
                if item_indice in (0, 2):
                    item_status = StatusItemDemanda.AGUARDANDO_VALIDACAO
                    dfd = None
                elif item_indice in (1, 3):
                    item_status = StatusItemDemanda.VALIDADA
                    dfd = None
                else:
                    item_status = StatusItemDemanda.VINCULADA_DFD
                    dfd = dfds[cls.grupos.index(catalogo.grupo)]

                quantidade = item_indice + 1
                valor_unitario = Decimal(100 + item_indice)
                itens.append(
                    ItemDemanda(
                        demanda=demanda,
                        dfd=dfd,
                        item_catalogo=catalogo,
                        tipo=catalogo.tipo,
                        nome=catalogo.nome,
                        descricao=catalogo.descricao,
                        unidade_medida=catalogo.unidade_medida,
                        quantidade=quantidade,
                        valor_estimado=valor_unitario,
                        valor_total=quantidade * valor_unitario,
                        data_prevista=date(2098, 6, 30),
                        prioridade=Prioridade.MEDIA,
                        justificativa_necessidade="Necessidade ficticia para carga.",
                        indicacao_orcamentaria="Fonte ficticia de desempenho",
                        status=item_status,
                    )
                )
        itens = ItemDemanda.objects.bulk_create(itens)

        for dfd in dfds:
            dfd.itens_demanda.add(*(item for item in itens if item.dfd_id == dfd.id))

    def setUp(self):
        self.client.force_authenticate(self.admin)

    def _get_com_metricas(self, rota):
        inicio = perf_counter()
        with CaptureQueriesContext(connection) as consultas:
            resposta = self.client.get(rota)
        duracao = perf_counter() - inicio
        return resposta, len(consultas), duracao

    def test_dashboard_mantem_agregacoes_em_orcamento_constante(self):
        resposta, total_consultas, duracao = self._get_com_metricas(
            reverse("api:dashboard-stats")
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["total_demandas"], self.TOTAL_DEMANDAS)
        self.assertEqual(resposta.data["total_itens"], self.TOTAL_ITENS)
        self.assertEqual(
            resposta.data["aguardando_validacao"], self.TOTAL_PENDENTES
        )
        self.assertEqual(resposta.data["validados"], self.TOTAL_VALIDADOS)
        self.assertEqual(resposta.data["consolidados"], self.TOTAL_CONSOLIDADOS)
        self.assertEqual(resposta.data["total_dfds"], 3)
        self.assertEqual(
            resposta.data["itens_por_status"],
            {
                StatusItemDemanda.AGUARDANDO_VALIDACAO: self.TOTAL_PENDENTES,
                StatusItemDemanda.VALIDADA: self.TOTAL_VALIDADOS,
                StatusItemDemanda.VINCULADA_DFD: self.TOTAL_CONSOLIDADOS,
            },
        )
        self.assertEqual(
            resposta.data["valor_total_estimado"], Decimal("46200.00")
        )
        self.assertLessEqual(total_consultas, 10)
        self.assertLess(duracao, self.LIMITE_TEMPO_SEGUNDOS)

    def test_fila_pendente_serializa_60_itens_sem_n_mais_um(self):
        resposta, total_consultas, duracao = self._get_com_metricas(
            reverse("api:validacao-pendentes")
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resposta.data), self.TOTAL_PENDENTES)
        self.assertEqual(
            {item["status"] for item in resposta.data},
            {StatusItemDemanda.AGUARDANDO_VALIDACAO},
        )
        self.assertEqual(len({item["demanda_id"] for item in resposta.data}), 30)
        self.assertEqual(len({item["grupo_id"] for item in resposta.data}), 3)
        # Uma consulta para itens e uma para o prefetch de devolucoes; a folga
        # cobre autenticadores/middlewares sem permitir consultas por linha.
        self.assertLessEqual(total_consultas, 4)
        self.assertLess(duracao, self.LIMITE_TEMPO_SEGUNDOS)

    def test_elegiveis_agrupa_60_itens_sem_n_mais_um(self):
        resposta, total_consultas, duracao = self._get_com_metricas(
            reverse("api:itens-elegiveis")
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resposta.data), 6)
        self.assertEqual(
            sum(grupo["total_solicitacoes"] for grupo in resposta.data),
            self.TOTAL_VALIDADOS,
        )
        self.assertEqual(
            sum(len(grupo["item_ids"]) for grupo in resposta.data),
            self.TOTAL_VALIDADOS,
        )
        self.assertEqual(
            {grupo["grupo_contratacao"]["id"] for grupo in resposta.data},
            {grupo.id for grupo in self.grupos},
        )
        self.assertTrue(
            all(len(grupo["detalhamento_por_unidade"]) == 10 for grupo in resposta.data)
        )
        # O agrupamento percorre objetos carregados por select_related.
        self.assertLessEqual(total_consultas, 2)
        self.assertLess(duracao, self.LIMITE_TEMPO_SEGUNDOS)
