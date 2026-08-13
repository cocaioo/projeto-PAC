from datetime import date
from decimal import Decimal

from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import Demanda, ItemDemanda, StatusItemDemanda
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil, Usuario


class ConsolidacaoAPITests(APITestCase):
    def setUp(self):
        self.unidade_admin = Unidade.objects.create(nome="STI", sigla="STI", codigo="1")
        self.unidade_solicitante = Unidade.objects.create(nome="CCN", sigla="CCN", codigo="2")
        self.grupo = GrupoContratacao.objects.create(nome="TIC", unidade_admin=self.unidade_admin)
        self.catalogo = ItemCatalogo.objects.create(tipo="material", nome="Notebook", descricao="", grupo=self.grupo, unidade_medida="unidade", valor_estimado=Decimal("10"))
        self.admin = Usuario.objects.create_user(username="admin", email="admin@example.com", siape="1", first_name="Admin", perfil=Perfil.ADMIN, unidade=self.unidade_admin)
        self.usuario = Usuario.objects.create_user(username="usuario", email="usuario@example.com", siape="2", first_name="Usuario", unidade=self.unidade_solicitante)
        self.demanda = Demanda.objects.create(unidade=self.unidade_solicitante, usuario=self.usuario, ano_referencia=2027)
        self.item = self.criar_item("Elegivel", StatusItemDemanda.VALIDADA, 3)

    def criar_item(self, nome, status, quantidade):
        return ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=self.catalogo, tipo="material", nome=nome,
            descricao="", unidade_medida="unidade", quantidade=quantidade,
            valor_estimado=Decimal("10"), valor_total=Decimal(quantidade * 10),
            data_prevista=date(2027, 1, 1), prioridade="media", justificativa_prioridade="x",
            justificativa_necessidade="x", indicacao_orcamentaria="x", status=status,
        )

    def test_lista_agrupada_omite_nao_elegiveis_e_retorna_unidade(self):
        self.criar_item("Devolvido", StatusItemDemanda.DEVOLVIDA, 7)
        dfd = DFD.objects.create(numero="Ja", ciclo_pac=self.demanda.ciclo_pac, grupo=self.grupo, criado_por=self.admin)
        self.criar_item("Vinculado", StatusItemDemanda.VINCULADA_DFD, 9).dfd = dfd
        ItemDemanda.objects.filter(nome="Vinculado").update(dfd=dfd)
        self.client.force_login(self.admin)
        response = self.client.get("/api/consolidacoes/itens-elegiveis/", {"ciclo_pac_id": self.demanda.ciclo_pac_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["quantidade_total"], 3)
        self.assertEqual(response.data[0]["item_catalogo"]["unidade_medida"], "unidade")
        self.assertEqual(response.data[0]["item_ids"], [self.item.id])

    def test_consolidacao_cria_vincula_audita_e_reutiliza_dfd(self):
        self.client.force_login(self.admin)
        payload = {"numero_dfd": "123/2027", "ciclo_pac_id": self.demanda.ciclo_pac_id, "item_ids": [self.item.id]}
        response = self.client.post("/api/dfds/consolidar/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VINCULADA_DFD)
        self.assertIsNotNone(self.item.dfd_id)
        self.assertEqual(DFD.objects.filter(numero="123/2027").count(), 1)
        self.assertEqual(self.client.post("/api/dfds/consolidar/", payload, format="json").status_code, status.HTTP_409_CONFLICT)

    def test_usuario_comum_nao_consolida(self):
        self.client.force_login(self.usuario)
        response = self.client.post("/api/dfds/consolidar/", {"numero_dfd": "x", "ciclo_pac_id": self.demanda.ciclo_pac_id, "item_ids": [self.item.id]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
