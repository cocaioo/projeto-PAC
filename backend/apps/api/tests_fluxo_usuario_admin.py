from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import StatusDemanda, StatusItemDemanda
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade


Usuario = get_user_model()


class FluxoUsuarioAdminValidacaoTests(APITestCase):
    """Contrato completo: solicitante envia item de catálogo ao admin do grupo."""

    def setUp(self):
        self.unidade_tic = Unidade.objects.create(
            nome="Superintendência TIC", sigla="TIC", codigo="TIC"
        )
        self.unidade_solicitante = Unidade.objects.create(
            nome="Unidade Solicitante", sigla="SOL", codigo="SOL"
        )
        self.grupo_tic = GrupoContratacao.objects.create(nome="TIC", unidade_admin=self.unidade_tic)
        self.grupo_outro = GrupoContratacao.objects.create(
            nome="Outro grupo", unidade_admin=self.unidade_solicitante
        )
        self.catalogo_tic = ItemCatalogo.objects.create(
            tipo="material",
            nome="Notebook de fluxo",
            descricao="Item para testar o roteamento da validação.",
            codigo_catmat_catser="FLUXO-TIC-001",
            grupo=self.grupo_tic,
            unidade_medida="unidade",
            valor_estimado=Decimal("5000.00"),
            ativo=True,
        )
        self.solicitante = self._usuario("solicitante_fluxo", self.unidade_solicitante)
        self.admin_tic = self._usuario("admin_tic_fluxo", self.unidade_tic, "admin")
        self.admin_tic.grupos_administrados.add(self.grupo_tic)
        self.admin_outro = self._usuario("admin_outro_fluxo", self.unidade_solicitante, "admin")
        self.admin_outro.grupos_administrados.add(self.grupo_outro)
        self.admin_sem_grupo = self._usuario(
            "admin_sem_grupo_fluxo", self.unidade_solicitante, "admin"
        )

    @staticmethod
    def _usuario(username, unidade, perfil="usuario"):
        return Usuario.objects.create_user(
            username=username,
            password="senha-de-teste",
            email=f"{username}@example.invalid",
            siape=f"SIAPE-{username[:14]}",
            unidade=unidade,
            perfil=perfil,
            is_staff=perfil != "usuario",
        )

    def _criar_e_enviar_demanda(self):
        self.client.force_login(self.solicitante)
        demanda = self.client.post(
            reverse("api:demanda-list"),
            {"ano_referencia": 2099, "observacao": "Fluxo usuário-admin"},
            format="json",
        )
        self.assertEqual(demanda.status_code, status.HTTP_201_CREATED)

        item = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": demanda.data["id"]}),
            {
                "item_catalogo": self.catalogo_tic.id,
                "quantidade": 2,
                "data_prevista": date(2099, 6, 30).isoformat(),
                "prioridade": "media",
                "justificativa_necessidade": "Necessidade do fluxo integrado.",
                "indicacao_orcamentaria": "Recursos de teste",
            },
            format="json",
        )
        self.assertEqual(item.status_code, status.HTTP_201_CREATED)

        envio = self.client.post(
            reverse("api:demanda-enviar", kwargs={"pk": demanda.data["id"]}),
            format="json",
        )
        self.assertEqual(envio.status_code, status.HTTP_200_OK)
        self.assertEqual(envio.data["status"], StatusDemanda.AGUARDANDO_VALIDACAO)
        self.assertEqual(envio.data["itens"][0]["status"], StatusItemDemanda.AGUARDANDO_VALIDACAO)
        return demanda.data["id"], item.data["id"]

    def _criar_e_enviar_item_manual(self):
        self.client.force_login(self.solicitante)
        demanda = self.client.post(
            reverse("api:demanda-list"),
            {"ano_referencia": 2099, "observacao": "Item manual"},
            format="json",
        )
        self.assertEqual(demanda.status_code, status.HTTP_201_CREATED)
        item = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": demanda.data["id"]}),
            {
                "tipo": "material",
                "nome": "Item manual de fluxo",
                "descricao": "Item sem grupo de contratação.",
                "unidade_medida": "unidade",
                "quantidade": 1,
                "valor_estimado": "10.00",
                "data_prevista": date(2099, 6, 30).isoformat(),
                "prioridade": "media",
                "justificativa_necessidade": "Necessidade do fluxo manual.",
                "indicacao_orcamentaria": "Recursos de teste",
            },
            format="json",
        )
        self.assertEqual(item.status_code, status.HTTP_201_CREATED)
        envio = self.client.post(
            reverse("api:demanda-enviar", kwargs={"pk": demanda.data["id"]}),
            format="json",
        )
        self.assertEqual(envio.status_code, status.HTTP_200_OK)
        return demanda.data["id"], item.data["id"]

    def test_item_enviado_aparece_somente_para_admin_do_grupo_e_pode_ser_validado(self):
        demanda_id, item_id = self._criar_e_enviar_demanda()

        self.client.force_login(self.admin_tic)
        pendentes = self.client.get(reverse("api:validacao-pendentes"), {"demanda": demanda_id})
        self.assertEqual(pendentes.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in pendentes.data], [item_id])
        self.assertEqual(pendentes.data[0]["grupo_id"], self.grupo_tic.id)
        self.assertEqual(pendentes.data[0]["grupo_nome"], "TIC")

        decisao = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": item_id, "acao": "validado", "comentario": ""},
            format="json",
        )
        self.assertEqual(decisao.status_code, status.HTTP_201_CREATED)

        apos_decisao = self.client.get(
            reverse("api:validacao-pendentes"), {"demanda_id": demanda_id}
        )
        self.assertEqual(apos_decisao.data, [])

    def test_admin_de_outro_grupo_nao_recebe_nem_decide_item_tic(self):
        demanda_id, item_id = self._criar_e_enviar_demanda()

        self.client.force_login(self.admin_outro)
        pendentes = self.client.get(reverse("api:validacao-pendentes"), {"demanda_id": demanda_id})
        self.assertEqual(pendentes.status_code, status.HTTP_200_OK)
        self.assertEqual(pendentes.data, [])

        decisao = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": item_id, "acao": "validado", "comentario": ""},
            format="json",
        )
        self.assertEqual(decisao.status_code, status.HTTP_403_FORBIDDEN)

    def test_item_manual_nao_e_roteado_por_mera_coincidencia_de_unidade(self):
        demanda_id, item_id = self._criar_e_enviar_item_manual()

        self.client.force_login(self.admin_tic)
        fora_do_escopo = self.client.get(
            reverse("api:validacao-pendentes"), {"demanda": demanda_id}
        )
        self.assertEqual(fora_do_escopo.data, [])

        self.client.force_login(self.admin_sem_grupo)
        pendentes = self.client.get(reverse("api:validacao-pendentes"), {"demanda": demanda_id})
        self.assertEqual(pendentes.status_code, status.HTTP_200_OK)
        self.assertEqual(pendentes.data, [])

        decisao = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": item_id, "acao": "validado", "comentario": ""},
            format="json",
        )
        self.assertEqual(decisao.status_code, status.HTTP_403_FORBIDDEN)
