from datetime import date
from decimal import Decimal

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
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
        self.admin.grupos_administrados.add(self.grupo)
        self.usuario = Usuario.objects.create_user(username="usuario", email="usuario@example.com", siape="2", first_name="Usuario", unidade=self.unidade_solicitante)
        self.demanda = Demanda.objects.create(
            unidade=self.unidade_solicitante,
            usuario=self.usuario,
            ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO,
            enviada_em=timezone.now(),
        )
        self.item = self.criar_item("Elegivel", StatusItemDemanda.VALIDADA, 3)

    def criar_demanda(self, *, unidade=None, usuario=None, ano=2027):
        return Demanda.objects.create(
            unidade=unidade or self.unidade_solicitante,
            usuario=usuario or self.usuario,
            ano_referencia=ano,
            status=StatusDemanda.EM_ANDAMENTO,
            enviada_em=timezone.now(),
        )

    def criar_item(self, nome, status, quantidade, *, demanda=None, catalogado=True):
        return ItemDemanda.objects.create(
            demanda=demanda or self.demanda,
            item_catalogo=self.catalogo if catalogado else None,
            tipo="material", nome=nome,
            descricao="", unidade_medida="unidade", quantidade=quantidade,
            valor_estimado=Decimal("10"), valor_total=Decimal(quantidade * 10),
            data_prevista=date(2027, 1, 1), prioridade="media", justificativa_prioridade="x",
            justificativa_necessidade="x", indicacao_orcamentaria="x", status=status,
        )

    def test_lista_agrupada_omite_nao_elegiveis_e_retorna_unidade(self):
        self.criar_item(
            "Devolvido",
            StatusItemDemanda.DEVOLVIDA,
            7,
            demanda=self.criar_demanda(),
        )
        dfd = DFD.objects.create(numero="Ja", ciclo_pac=self.demanda.ciclo_pac, grupo=self.grupo, criado_por=self.admin)
        self.criar_item(
            "Vinculado",
            StatusItemDemanda.VINCULADA_DFD,
            9,
            demanda=self.criar_demanda(),
        ).dfd = dfd
        ItemDemanda.objects.filter(nome="Vinculado").update(dfd=dfd)
        self.client.force_login(self.admin)
        response = self.client.get("/api/consolidacoes/itens-elegiveis/", {"ciclo_pac_id": self.demanda.ciclo_pac_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data[0]["quantidade_total"], 3)
        self.assertEqual(response.data[0]["item_catalogo"]["unidade_medida"], "unidade")
        self.assertEqual(response.data[0]["item_ids"], [self.item.id])

    def test_lista_expoe_ciclo_grupo_unidades_e_solicitantes(self):
        unidade_b = Unidade.objects.create(nome="Biblioteca", sigla="BIB", codigo="3")
        usuario_b = Usuario.objects.create_user(
            username="usuario_b",
            email="usuario_b@example.com",
            siape="3",
            first_name="Maria",
            last_name="Silva",
            unidade=unidade_b,
        )
        demanda_b = self.criar_demanda(unidade=unidade_b, usuario=usuario_b)
        item_b = self.criar_item(
            "Elegivel B",
            StatusItemDemanda.VALIDADA,
            4,
            demanda=demanda_b,
        )

        self.client.force_login(self.admin)
        response = self.client.get(
            "/api/consolidacoes/itens-elegiveis/",
            {"ciclo_pac_id": self.demanda.ciclo_pac_id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        agrupado = response.data[0]
        self.assertEqual(agrupado["ciclo_pac"], {
            "id": self.demanda.ciclo_pac_id,
            "ano": 2027,
            "ativo": True,
        })
        self.assertEqual(agrupado["grupo_contratacao"]["id"], self.grupo.id)
        self.assertEqual(agrupado["quantidade_total"], 7)
        self.assertEqual(agrupado["valor_total_estimado"], Decimal("70.00"))
        self.assertEqual(agrupado["total_solicitacoes"], 2)
        self.assertCountEqual(agrupado["item_ids"], [self.item.id, item_b.id])
        detalhes = agrupado["detalhamento_por_unidade"]
        self.assertEqual(len(detalhes), 2)
        detalhe_b = next(
            detalhe for detalhe in detalhes if detalhe["unidade"]["id"] == unidade_b.id
        )
        self.assertEqual(detalhe_b["quantidade_total"], 4)
        self.assertEqual(
            detalhe_b["solicitacoes"][0]["solicitante"]["nome"],
            "Maria Silva",
        )
        self.assertEqual(
            detalhe_b["solicitacoes"][0]["demanda_id"], demanda_b.id
        )

    def test_lista_separa_mesmo_item_por_ciclo_e_permite_filtrar(self):
        demanda_2028 = self.criar_demanda(ano=2028)
        self.criar_item(
            "Elegivel 2028",
            StatusItemDemanda.VALIDADA,
            5,
            demanda=demanda_2028,
        )
        self.client.force_login(self.admin)

        response = self.client.get("/api/consolidacoes/itens-elegiveis/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["ciclo_pac"]["ano"] for item in response.data], [2028, 2027])

        filtrado = self.client.get(
            "/api/consolidacoes/itens-elegiveis/",
            {"ciclo_pac_id": self.demanda.ciclo_pac_id},
        )
        self.assertEqual(len(filtrado.data), 1)
        self.assertEqual(filtrado.data[0]["quantidade_total"], 3)

    def test_endpoint_de_ciclos_retorna_apenas_ciclos_com_itens_elegiveis(self):
        demanda_2028 = self.criar_demanda(ano=2028)
        self.criar_item(
            "Elegivel 2028",
            StatusItemDemanda.VALIDADA,
            5,
            demanda=demanda_2028,
        )
        demanda_2029 = self.criar_demanda(ano=2029)
        demanda_2029.ciclo_pac.ativo = False
        demanda_2029.ciclo_pac.save(update_fields=["ativo"])
        self.criar_item(
            "Inativo 2029",
            StatusItemDemanda.VALIDADA,
            1,
            demanda=demanda_2029,
        )
        self.client.force_login(self.admin)

        response = self.client.get("/api/consolidacoes/ciclos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([ciclo["ano"] for ciclo in response.data], [2028, 2027])
        self.assertEqual(response.data[1]["total_itens_elegiveis"], 1)

    def test_filtro_invalido_retorna_400_em_vez_de_erro_interno(self):
        self.client.force_login(self.admin)
        response = self.client.get(
            "/api/consolidacoes/itens-elegiveis/",
            {"ciclo_pac_id": "invalido"},
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("ciclo_pac_id", response.data)

    def test_consolidacao_cria_vincula_audita_e_reutiliza_dfd(self):
        self.client.force_login(self.admin)
        payload = {"numero_dfd": "123/2027", "ciclo_pac_id": self.demanda.ciclo_pac_id, "item_ids": [self.item.id]}
        response = self.client.post("/api/dfds/consolidar/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VINCULADA_DFD)
        self.assertIsNotNone(self.item.dfd_id)
        self.assertEqual(DFD.objects.filter(numero="123/2027").count(), 1)
        self.assertEqual(response.data["dfd"]["ciclo_pac"]["ano"], 2027)
        self.assertEqual(response.data["dfd"]["grupo_contratacao"]["id"], self.grupo.id)
        self.assertEqual(response.data["item_ids"], [self.item.id])
        self.assertEqual(response.data["itens_vinculados"], 1)
        self.assertEqual(self.client.post("/api/dfds/consolidar/", payload, format="json").status_code, status.HTTP_409_CONFLICT)

    def test_usuario_comum_nao_consolida(self):
        self.client.force_login(self.usuario)
        response = self.client.post("/api/dfds/consolidar/", {"numero_dfd": "x", "ciclo_pac_id": self.demanda.ciclo_pac_id, "item_ids": [self.item.id]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_de_outro_grupo_nao_lista_nem_consolida(self):
        outra_unidade = Unidade.objects.create(nome="PREUNI", sigla="PRE", codigo="4")
        outro_admin = Usuario.objects.create_user(
            username="outro_admin",
            email="outro_admin@example.com",
            siape="4",
            perfil=Perfil.ADMIN,
            unidade=outra_unidade,
        )
        self.client.force_login(outro_admin)

        lista = self.client.get("/api/consolidacoes/itens-elegiveis/")
        ciclos = self.client.get("/api/consolidacoes/ciclos/")
        consolidacao = self.client.post(
            "/api/dfds/consolidar/",
            {
                "numero_dfd": "SEM-ESCOPO",
                "ciclo_pac_id": self.demanda.ciclo_pac_id,
                "item_ids": [self.item.id],
            },
            format="json",
        )

        self.assertEqual(lista.status_code, status.HTTP_200_OK)
        self.assertEqual(lista.data, [])
        self.assertEqual(ciclos.data, [])
        self.assertEqual(consolidacao.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(consolidacao.data["item_ids"], [self.item.id])

    def test_item_manual_e_omitido_e_rejeitado_sem_erro_500(self):
        manual = self.criar_item(
            "Manual",
            StatusItemDemanda.VALIDADA,
            2,
            demanda=self.criar_demanda(),
            catalogado=False,
        )
        self.client.force_login(self.admin)

        lista = self.client.get("/api/consolidacoes/itens-elegiveis/")
        response = self.client.post(
            "/api/dfds/consolidar/",
            {
                "numero_dfd": "MANUAL",
                "ciclo_pac_id": manual.demanda.ciclo_pac_id,
                "item_ids": [manual.id],
            },
            format="json",
        )

        self.assertNotIn(manual.id, [item_id for grupo in lista.data for item_id in grupo["item_ids"]])
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["item_ids"], [manual.id])
        self.assertFalse(DFD.objects.filter(numero="MANUAL").exists())
