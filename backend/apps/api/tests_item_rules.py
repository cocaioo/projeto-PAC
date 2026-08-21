from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import (
    Demanda,
    ItemDemanda,
    StatusItemDemanda,
)
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade


Usuario = get_user_model()


class ItemDemandaApiRulesTests(APITestCase):
    def setUp(self):
        self.unidade = Unidade.objects.create(
            nome="Unidade solicitante",
            sigla="SOL",
            codigo="SOL",
        )
        self.unidade_admin = Unidade.objects.create(
            nome="Unidade administradora",
            sigla="ADM",
            codigo="ADM",
        )
        self.usuario = Usuario.objects.create_user(
            username="solicitante",
            password="senha12345",
            email="solicitante@example.com",
            siape="123456",
            unidade=self.unidade,
        )
        self.grupo = GrupoContratacao.objects.create(
            nome="TIC",
            unidade_admin=self.unidade_admin,
        )
        self.catalogo = ItemCatalogo.objects.create(
            tipo="material",
            nome="Notebook institucional",
            descricao="Configuracao homologada",
            grupo=self.grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("4200.50"),
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade,
            usuario=self.usuario,
            ano_referencia=2027,
        )
        self.client.force_login(self.usuario)

    def url_itens(self, demanda=None):
        return reverse(
            "api:demanda-itens",
            kwargs={"pk": (demanda or self.demanda).pk},
        )

    def dados_catalogados(self, **overrides):
        dados = {
            "item_catalogo": self.catalogo.pk,
            "quantidade": 2,
            "data_prevista": date(2027, 3, 1).isoformat(),
            "prioridade": "media",
            "justificativa_prioridade": "",
            "justificativa_necessidade": "Renovacao do parque",
            "indicacao_orcamentaria": "Fonte 1000",
        }
        dados.update(overrides)
        return dados

    def dados_manuais(self, **overrides):
        dados = {
            "tipo": "servico",
            "nome": "Manutencao",
            "descricao": "Manutencao preventiva",
            "unidade_medida": "servico",
            "quantidade": 1,
            "valor_estimado": "300.00",
            "data_prevista": date(2027, 3, 1).isoformat(),
            "prioridade": "media",
            "justificativa_prioridade": "",
            "justificativa_necessidade": "Manter operacao",
            "indicacao_orcamentaria": "Fonte 1000",
        }
        dados.update(overrides)
        return dados

    def test_item_catalogado_aceita_payload_minimo_e_herda_dados(self):
        resposta = self.client.post(
            self.url_itens(),
            self.dados_catalogados(),
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        item = ItemDemanda.objects.get(pk=resposta.data["id"])
        self.assertEqual(item.tipo, self.catalogo.tipo)
        self.assertEqual(item.nome, self.catalogo.nome)
        self.assertEqual(item.descricao, self.catalogo.descricao)
        self.assertEqual(item.unidade_medida, self.catalogo.unidade_medida)
        self.assertEqual(item.valor_estimado, self.catalogo.valor_estimado)
        self.assertEqual(item.valor_total, Decimal("8401.00"))

    def test_item_catalogado_mantem_payload_antigo_mas_ignora_campos_herdados(self):
        resposta = self.client.post(
            self.url_itens(),
            self.dados_catalogados(
                tipo="servico",
                nome="Nome enviado pelo cliente",
                descricao="Descricao enviada pelo cliente",
                unidade_medida="hora",
                valor_estimado="999.99",
            ),
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resposta.data["tipo"], self.catalogo.tipo)
        self.assertEqual(resposta.data["nome"], self.catalogo.nome)
        self.assertEqual(resposta.data["descricao"], self.catalogo.descricao)
        self.assertEqual(
            resposta.data["unidade_medida"],
            self.catalogo.unidade_medida,
        )
        self.assertEqual(
            Decimal(resposta.data["valor_estimado"]),
            self.catalogo.valor_estimado,
        )

    def test_item_catalogado_inativo_e_rejeitado(self):
        self.catalogo.ativo = False
        self.catalogo.save(update_fields=["ativo"])

        resposta = self.client.post(
            self.url_itens(),
            self.dados_catalogados(),
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("item_catalogo", resposta.data)
        self.assertFalse(ItemDemanda.objects.exists())

    def test_item_catalogado_duplicado_na_mesma_demanda_e_rejeitado(self):
        primeira = self.client.post(
            self.url_itens(),
            self.dados_catalogados(),
            format="json",
        )
        segunda = self.client.post(
            self.url_itens(),
            self.dados_catalogados(quantidade=3),
            format="json",
        )

        self.assertEqual(primeira.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("item_catalogo", segunda.data)
        self.assertEqual(ItemDemanda.objects.count(), 1)

    def test_mesmo_catalogo_pode_ser_usado_em_demandas_diferentes(self):
        outra_demanda = Demanda.objects.create(
            unidade=self.unidade,
            usuario=self.usuario,
            ano_referencia=2028,
        )

        primeira = self.client.post(
            self.url_itens(), self.dados_catalogados(), format="json"
        )
        segunda = self.client.post(
            self.url_itens(outra_demanda),
            self.dados_catalogados(),
            format="json",
        )

        self.assertEqual(primeira.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda.status_code, status.HTTP_201_CREATED)

    def test_prioridade_alta_exige_justificativa(self):
        for justificativa in ["", "   "]:
            with self.subTest(justificativa=repr(justificativa)):
                resposta = self.client.post(
                    self.url_itens(),
                    self.dados_manuais(
                        prioridade="alta",
                        justificativa_prioridade=justificativa,
                    ),
                    format="json",
                )
                self.assertEqual(
                    resposta.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )
                self.assertIn("justificativa_prioridade", resposta.data)

    def test_prioridades_baixa_e_media_aceitam_justificativa_vazia(self):
        for prioridade in ["baixa", "media"]:
            with self.subTest(prioridade=prioridade):
                resposta = self.client.post(
                    self.url_itens(),
                    self.dados_manuais(
                        nome=f"Item {prioridade}",
                        prioridade=prioridade,
                        justificativa_prioridade="",
                    ),
                    format="json",
                )
                self.assertEqual(
                    resposta.status_code,
                    status.HTTP_201_CREATED,
                )


class ItemDemandaModelRulesTests(TestCase):
    def setUp(self):
        unidade = Unidade.objects.create(
            nome="Unidade",
            sigla="UNI",
            codigo="UNI",
        )
        usuario = Usuario.objects.create_user(
            username="usuario",
            password="senha12345",
            email="usuario@example.com",
            siape="654321",
            unidade=unidade,
        )
        grupo = GrupoContratacao.objects.create(
            nome="Grupo",
            unidade_admin=unidade,
        )
        self.catalogo = ItemCatalogo.objects.create(
            tipo="material",
            nome="Item",
            descricao="Descricao",
            grupo=grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("10.00"),
        )
        self.demanda = Demanda.objects.create(
            unidade=unidade,
            usuario=usuario,
            ano_referencia=2027,
        )

    def criar_item(self):
        return ItemDemanda.objects.create(
            demanda=self.demanda,
            item_catalogo=self.catalogo,
            tipo=self.catalogo.tipo,
            nome=self.catalogo.nome,
            descricao=self.catalogo.descricao,
            unidade_medida=self.catalogo.unidade_medida,
            quantidade=1,
            valor_estimado=self.catalogo.valor_estimado,
            valor_total=self.catalogo.valor_estimado,
            data_prevista=date(2027, 1, 1),
            prioridade="media",
            justificativa_prioridade="",
            justificativa_necessidade="Necessidade",
            indicacao_orcamentaria="Fonte 1000",
        )

    def test_constraint_impede_catalogo_duplicado_na_mesma_demanda(self):
        self.criar_item()

        with self.assertRaises(IntegrityError), transaction.atomic():
            self.criar_item()

    def test_status_usa_choices_especificos_de_item(self):
        valores = {
            valor
            for valor, _rotulo in ItemDemanda._meta.get_field("status").choices
        }

        self.assertEqual(valores, set(StatusItemDemanda.values))
