from rest_framework.test import APITestCase
from rest_framework import status
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil, Usuario
from apps.grupos_contratacao.models import GrupoContratacao
from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, CicloPAC, Prioridade, StatusItemDemanda
from datetime import date
from django.utils import timezone
from decimal import Decimal

class MixedDemandIsolationTests(APITestCase):
    def setUp(self):
        self.ciclo = CicloPAC.objects.create(ano=2024, ativo=True)
        
        # Unidades
        self.unidade_requisitante = Unidade.objects.create(nome="Unidade Req", sigla="UR", codigo="UR", ativo=True)
        self.unidade_admin_a = Unidade.objects.create(nome="Unidade Admin A", sigla="UAA", codigo="UAA", ativo=True)
        self.unidade_admin_b = Unidade.objects.create(nome="Unidade Admin B", sigla="UAB", codigo="UAB", ativo=True)
        
        # Grupos
        self.grupo_a = GrupoContratacao.objects.create(nome="Grupo A", unidade_admin=self.unidade_admin_a, ativo=True)
        self.grupo_b = GrupoContratacao.objects.create(nome="Grupo B", unidade_admin=self.unidade_admin_b, ativo=True)
        
        # Catalogo
        self.item_cat_a = ItemCatalogo.objects.create(
            codigo_catmat_catser="CATA", nome="Item A", tipo="material", 
            grupo=self.grupo_a, unidade_medida="unidade", valor_estimado=Decimal("100"), ativo=True
        )
        self.item_cat_b = ItemCatalogo.objects.create(
            codigo_catmat_catser="CATB", nome="Item B", tipo="material", 
            grupo=self.grupo_b, unidade_medida="unidade", valor_estimado=Decimal("200"), ativo=True
        )
        
        # Usuarios
        self.requisitante = Usuario.objects.create_user(
            username="req", email="req@test.com", password="123", perfil=Perfil.USUARIO, unidade=self.unidade_requisitante
        )
        self.admin_a = Usuario.objects.create_user(
            username="admin_a", email="admin_a@test.com", password="123", perfil=Perfil.ADMIN, unidade=self.unidade_admin_a
        )
        self.admin_a.grupos_administrados.add(self.grupo_a)
        
        # Demanda mista
        self.demanda = Demanda.objects.create(
            usuario=self.requisitante, unidade=self.unidade_requisitante,
            ciclo_pac=self.ciclo, ano_referencia=2024, status=StatusDemanda.AGUARDANDO_VALIDACAO,
            enviada_em=timezone.now()
        )
        self.item_demanda_a = ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=self.item_cat_a, status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
            tipo="material", nome="Item A", unidade_medida="unidade", quantidade=1, valor_estimado=Decimal("100"), 
            valor_total=Decimal("100"), data_prevista=date(2024, 1, 1), prioridade=Prioridade.MEDIA
        )
        self.item_demanda_b = ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=self.item_cat_b, status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
            tipo="material", nome="Item B", unidade_medida="unidade", quantidade=1, valor_estimado=Decimal("200"), 
            valor_total=Decimal("200"), data_prevista=date(2024, 1, 1), prioridade=Prioridade.MEDIA
        )

    def test_admin_sees_mixed_demand_but_only_their_items(self):
        self.client.force_authenticate(user=self.admin_a)
        
        # Verifica se o Admin A vê a demanda (já que tem o item A)
        response = self.client.get("/api/demandas/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        
        demanda_retornada = response.data["results"][0]
        self.assertEqual(demanda_retornada["id"], self.demanda.id)
        
        # Verifica a prefetch e restrição de itens
        itens = demanda_retornada["itens"]
        self.assertEqual(len(itens), 1)
        self.assertEqual(itens[0]["id"], self.item_demanda_a.id)

    def test_admin_cannot_access_other_group_item_directly(self):
        self.client.force_authenticate(user=self.admin_a)
        
        # Tentativa de acesso direto ao Item B via IDOR
        response = self.client.get(f"/api/itens/{self.item_demanda_b.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_validate_their_own_item_in_mixed_demand(self):
        self.client.force_authenticate(user=self.admin_a)
        
        # Admin A tenta validar Item A (Sucesso)
        response = self.client.post("/api/validacoes/decidir/", {
            "item_demanda": self.item_demanda_a.id,
            "acao": "validado",
            "comentario": "Ok"
        })
        if response.status_code != 201:
            print("Response:", response.data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.item_demanda_a.refresh_from_db()
        self.assertEqual(self.item_demanda_a.status, StatusItemDemanda.VALIDADA)
        
        # Admin A tenta validar Item B (Falha - IDOR)
        response_b = self.client.post("/api/validacoes/decidir/", {
            "item_demanda": self.item_demanda_b.id,
            "acao": "validado",
            "comentario": "Tentando validar de fora"
        })
        self.assertEqual(response_b.status_code, status.HTTP_403_FORBIDDEN)
        self.item_demanda_b.refresh_from_db()
        self.assertEqual(self.item_demanda_b.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
