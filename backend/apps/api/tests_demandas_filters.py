from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.demandas.models import Demanda, StatusDemanda, ItemDemanda, Prioridade, TipoItem
from apps.unidades.models import Unidade
from apps.catalogo.models import ItemCatalogo
from decimal import Decimal
from datetime import date

User = get_user_model()

class DemandaFiltersTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='tester', password='123')
        self.unidade = Unidade.objects.create(sigla='STI', nome='Superintendencia')
        self.user.unidade = self.unidade
        self.user.save()
        self.client.force_authenticate(user=self.user)

        self.demanda1 = Demanda.objects.create(usuario=self.user, unidade=self.unidade, ano_referencia=2024, status=StatusDemanda.RASCUNHO)
        self.demanda2 = Demanda.objects.create(usuario=self.user, unidade=self.unidade, ano_referencia=2024, status=StatusDemanda.AGUARDANDO_VALIDACAO, observacao='Urgente')

        self.item1 = ItemDemanda.objects.create(
            demanda=self.demanda1, tipo=TipoItem.MATERIAL, nome='Lapis', descricao='Lapis',
            unidade_medida='CX', quantidade=10, valor_estimado=Decimal('5.00'), valor_total=Decimal('50.00'),
            data_prevista=date(2024, 1, 1), prioridade=Prioridade.BAIXA, justificativa_necessidade='-',
            indicacao_orcamentaria='-'
        )
        self.item2 = ItemDemanda.objects.create(
            demanda=self.demanda2, tipo=TipoItem.MATERIAL, nome='Caneta', descricao='Caneta',
            unidade_medida='CX', quantidade=10, valor_estimado=Decimal('10.00'), valor_total=Decimal('100.00'),
            data_prevista=date(2024, 2, 1), prioridade=Prioridade.BAIXA, justificativa_necessidade='-',
            indicacao_orcamentaria='-'
        )

    def test_search_by_observacao(self):
        response = self.client.get('/api/demandas/?search=Urgente')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.demanda2.id)

    def test_filter_by_status(self):
        response = self.client.get('/api/demandas/?status=rascunho')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.demanda1.id)

    def test_filter_by_valor_min(self):
        response = self.client.get('/api/demandas/?valor_min=60.00')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['id'], self.demanda2.id)

