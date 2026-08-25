from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import (
    Demanda,
    ItemDemanda,
    StatusDemanda,
    StatusItemDemanda,
)
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.validacoes.models import Validacao


Usuario = get_user_model()


class ValidacaoEscopoTests(APITestCase):
    def setUp(self):
        self.unidade_admin_a = self._unidade("ADA")
        self.unidade_admin_b = self._unidade("ADB")
        self.unidade_solicitante_a = self._unidade("SOA")
        self.unidade_solicitante_b = self._unidade("SOB")

        self.admin_a = self._usuario(
            "admin_a", self.unidade_admin_a, perfil="admin"
        )
        self.admin_b = self._usuario(
            "admin_b", self.unidade_admin_b, perfil="admin"
        )
        self.admin_master = self._usuario(
            "admin_master", None, perfil="admin_master"
        )
        self.solicitante_a = self._usuario(
            "solicitante_a", self.unidade_solicitante_a
        )
        self.solicitante_b = self._usuario(
            "solicitante_b", self.unidade_solicitante_b
        )

        self.grupo_a = GrupoContratacao.objects.create(
            nome="Grupo A", unidade_admin=self.unidade_admin_a
        )
        self.grupo_b = GrupoContratacao.objects.create(
            nome="Grupo B", unidade_admin=self.unidade_admin_b
        )
        self.admin_a.grupos_administrados.add(self.grupo_a)
        self.admin_b.grupos_administrados.add(self.grupo_b)
        self.catalogo_a = self._catalogo("CAT-A", self.grupo_a)
        self.catalogo_b = self._catalogo("CAT-B", self.grupo_b)

        self.demanda_a = self._demanda(
            self.solicitante_a, self.unidade_solicitante_a
        )
        self.demanda_b = self._demanda(
            self.solicitante_b, self.unidade_solicitante_b
        )
        self.item_grupo_a = self._item(
            self.demanda_a, "Item do grupo A", self.catalogo_a
        )
        self.item_grupo_b = self._item(
            self.demanda_a, "Item do grupo B", self.catalogo_b
        )
        self.item_manual = self._item(self.demanda_a, "Item manual")
        self.item_grupo_a_outra_unidade = self._item(
            self.demanda_b, "Outro item do grupo A", self.catalogo_a
        )

    @staticmethod
    def _unidade(sigla):
        return Unidade.objects.create(
            nome=f"Unidade {sigla}", sigla=sigla, codigo=f"COD-{sigla}"
        )

    @staticmethod
    def _usuario(username, unidade, perfil="usuario"):
        return Usuario.objects.create_user(
            username=username,
            password="senha-de-teste",
            email=f"{username}@ufpi.edu.br",
            siape=f"SIAPE-{username}",
            unidade=unidade,
            is_staff=perfil != "usuario",
            perfil=perfil,
        )

    @staticmethod
    def _catalogo(codigo, grupo):
        return ItemCatalogo.objects.create(
            tipo="material",
            nome=f"Catalogo {codigo}",
            descricao="Item catalogado para teste",
            codigo_catmat_catser=codigo,
            grupo=grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("100.00"),
        )

    @staticmethod
    def _demanda(usuario, unidade):
        return Demanda.objects.create(
            unidade=unidade,
            usuario=usuario,
            ano_referencia=2027,
            status=StatusDemanda.AGUARDANDO_VALIDACAO,
            enviada_em=timezone.now(),
        )

    @staticmethod
    def _item(demanda, nome, item_catalogo=None):
        return ItemDemanda.objects.create(
            demanda=demanda,
            item_catalogo=item_catalogo,
            tipo="material",
            nome=nome,
            descricao="Descricao do item",
            unidade_medida="unidade",
            quantidade=2,
            valor_estimado=Decimal("100.00"),
            valor_total=Decimal("200.00"),
            data_prevista=date(2027, 1, 1),
            prioridade="media",
            justificativa_prioridade="Planejamento",
            justificativa_necessidade="Necessidade institucional",
            indicacao_orcamentaria="Recursos proprios",
            status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
        )

    def _listar(self, usuario, query=None):
        self.client.force_login(usuario)
        return self.client.get(reverse("api:validacao-pendentes"), query or {})

    def test_admin_lista_apenas_itens_do_grupo_explicitamente_administrado(self):
        resposta = self._listar(self.admin_a)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in resposta.data},
            {self.item_grupo_a.id, self.item_grupo_a_outra_unidade.id},
        )

    def test_admin_master_lista_todos_inclusive_item_manual(self):
        resposta = self._listar(self.admin_master)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in resposta.data},
            {
                self.item_grupo_a.id,
                self.item_grupo_b.id,
                self.item_manual.id,
                self.item_grupo_a_outra_unidade.id,
            },
        )

    def test_pendentes_aceita_filtros_de_unidade_e_grupo_sem_ampliar_escopo(self):
        resposta = self._listar(
            self.admin_a,
            {"unidade": self.unidade_solicitante_a.id, "grupo": self.grupo_a.id},
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in resposta.data], [self.item_grupo_a.id])

        fora_do_escopo = self._listar(self.admin_a, {"grupo": self.grupo_b.id})
        self.assertEqual(fora_do_escopo.status_code, status.HTTP_200_OK)
        self.assertEqual(fora_do_escopo.data, [])

    def test_pendente_preserva_campos_do_item_e_inclui_contexto_para_agrupamento(self):
        resposta = self._listar(
            self.admin_a,
            {"unidade_id": self.unidade_solicitante_a.id},
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        item = resposta.data[0]
        self.assertEqual(item["demanda"], self.demanda_a.id)
        self.assertEqual(item["demanda_id"], self.demanda_a.id)
        self.assertEqual(item["demanda_ano_referencia"], 2027)
        self.assertEqual(item["unidade_id"], self.unidade_solicitante_a.id)
        self.assertEqual(item["unidade_sigla"], "SOA")
        self.assertEqual(item["usuario_id"], self.solicitante_a.id)
        self.assertEqual(item["usuario_nome"], "solicitante_a")
        self.assertEqual(item["grupo_id"], self.grupo_a.id)
        self.assertEqual(item["grupo_nome"], "Grupo A")
        self.assertFalse(item["item_manual"])
        self.assertEqual(item["demanda_dados"]["id"], self.demanda_a.id)
        self.assertEqual(item["grupo_dados"]["id"], self.grupo_a.id)

    def test_admin_de_outro_grupo_nao_consegue_decidir_item(self):
        self.client.force_login(self.admin_b)
        resposta = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item_grupo_a.id, "acao": "validado"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)
        self.item_grupo_a.refresh_from_db()
        self.assertEqual(
            self.item_grupo_a.status, StatusItemDemanda.AGUARDANDO_VALIDACAO
        )
        self.assertFalse(
            Validacao.objects.filter(item_demanda=self.item_grupo_a).exists()
        )

    def test_admin_do_grupo_consegue_decidir_item(self):
        self.client.force_login(self.admin_a)
        resposta = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item_grupo_a.id, "acao": "validado"},
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED)
        self.item_grupo_a.refresh_from_db()
        self.assertEqual(self.item_grupo_a.status, StatusItemDemanda.VALIDADA)

    def test_item_manual_pode_ser_decidido_por_admin_da_unidade_solicitante(self):
        admin_unidade_solicitante = self._usuario(
            "admin_sol_a", self.unidade_solicitante_a, perfil="admin"
        )
        admin_unidade_solicitante.grupos_administrados.add(self.grupo_a)
        self.client.force_login(self.admin_a)
        resposta_admin = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item_manual.id, "acao": "validado"},
            format="json",
        )
        self.assertEqual(resposta_admin.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_login(admin_unidade_solicitante)
        resposta_unidade = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item_manual.id, "acao": "validado"},
            format="json",
        )
        self.assertEqual(resposta_unidade.status_code, status.HTTP_201_CREATED)

    def test_fila_omite_demanda_nao_enviada_ou_com_status_inconsistente(self):
        demanda_nao_enviada = Demanda.objects.create(
            unidade=self.unidade_solicitante_a,
            usuario=self.solicitante_a,
            ano_referencia=2027,
            status=StatusDemanda.AGUARDANDO_VALIDACAO,
        )
        item_nao_enviado = self._item(
            demanda_nao_enviada, "Item de demanda nao enviada", self.catalogo_a
        )
        demanda_status_inconsistente = Demanda.objects.create(
            unidade=self.unidade_solicitante_a,
            usuario=self.solicitante_a,
            ano_referencia=2027,
            status=StatusDemanda.RASCUNHO,
            enviada_em=timezone.now(),
        )
        item_status_inconsistente = self._item(
            demanda_status_inconsistente,
            "Item de demanda com status inconsistente",
            self.catalogo_a,
        )

        resposta = self._listar(self.admin_a)

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        ids_na_fila = {item["id"] for item in resposta.data}
        self.assertNotIn(item_nao_enviado.id, ids_na_fila)
        self.assertNotIn(item_status_inconsistente.id, ids_na_fila)

    def test_devolucao_rejeita_comentario_composto_so_por_espacos(self):
        self.client.force_login(self.admin_a)
        resposta = self.client.post(
            reverse("api:validacao-decidir"),
            {
                "item_demanda": self.item_grupo_a.id,
                "acao": "devolvido",
                "comentario": "   ",
            },
            format="json",
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.item_grupo_a.refresh_from_db()
        self.assertEqual(
            self.item_grupo_a.status, StatusItemDemanda.AGUARDANDO_VALIDACAO
        )

    def test_filtro_com_id_invalido_retorna_400(self):
        resposta = self._listar(self.admin_master, {"grupo": "nao-e-id"})

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("grupo", resposta.data)

    def test_admin_lista_historico_de_validacoes_apenas_do_proprio_grupo(self):
        validacao_grupo_a = Validacao.objects.create(
            item_demanda=self.item_grupo_a,
            usuario=self.admin_a,
            acao="validado",
            comentario="Grupo A",
        )
        Validacao.objects.create(
            item_demanda=self.item_grupo_b,
            usuario=self.admin_b,
            acao="devolvido",
            comentario="Grupo B",
        )

        self.client.force_login(self.admin_a)
        resposta = self.client.get(reverse("api:validacao-list"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in resposta.data["results"]], [validacao_grupo_a.id])

    def test_admin_de_outro_grupo_recebe_404_ao_consultar_validacao_por_id(self):
        validacao_grupo_a = Validacao.objects.create(
            item_demanda=self.item_grupo_a,
            usuario=self.admin_a,
            acao="validado",
            comentario="Grupo A",
        )

        self.client.force_login(self.admin_b)
        resposta = self.client.get(
            reverse("api:validacao-detail", kwargs={"pk": validacao_grupo_a.id})
        )

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)
