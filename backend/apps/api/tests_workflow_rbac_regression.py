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
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.validacoes.models import Validacao


Usuario = get_user_model()


class WorkflowRbacRegressionTests(APITestCase):
    """Regressoes do fluxo requisitante -> grupo -> administrador -> DFD."""

    ano_referencia = 2099

    def setUp(self):
        self.unidade_solicitante_a = self._unidade("Solicitante A", "SOA")
        self.unidade_solicitante_b = self._unidade("Solicitante B", "SOB")
        self.unidade_admin_a = self._unidade("Administradora A", "ADA")
        self.unidade_admin_b = self._unidade("Administradora B", "ADB")

        self.grupo_a = GrupoContratacao.objects.create(
            nome="Grupo A - workflow RBAC",
            unidade_admin=self.unidade_admin_a,
        )
        self.grupo_b = GrupoContratacao.objects.create(
            nome="Grupo B - workflow RBAC",
            unidade_admin=self.unidade_admin_b,
        )

        self.catalogo_a1 = self._catalogo("RBAC-A-001", "Notebook", self.grupo_a)
        self.catalogo_a2 = self._catalogo("RBAC-A-002", "Monitor", self.grupo_a)
        self.catalogo_a3 = self._catalogo("RBAC-A-003", "Mouse", self.grupo_a)
        self.catalogo_b1 = self._catalogo("RBAC-B-001", "Software", self.grupo_b)

        self.usuario_a = self._usuario(
            "workflow_usuario_a", self.unidade_solicitante_a
        )
        self.usuario_b = self._usuario(
            "workflow_usuario_b", self.unidade_solicitante_b
        )
        self.admin_a = self._usuario(
            "workflow_admin_a", self.unidade_admin_a, perfil="admin"
        )
        self.admin_a.grupos_administrados.set([self.grupo_a])
        self.admin_b = self._usuario(
            "workflow_admin_b", self.unidade_admin_b, perfil="admin"
        )
        self.admin_b.grupos_administrados.set([self.grupo_b])
        self.admin_master = self._usuario(
            "workflow_admin_master", None, perfil="admin_master"
        )

        # Estes dois usuarios tornam explicitas as duas bordas arquiteturais:
        # nao herdar grupo pela unidade e nao exigir unidade quando ha M2M.
        self.admin_sem_grupo = self._usuario(
            "workflow_admin_sem_grupo", self.unidade_admin_a, perfil="admin"
        )
        self.admin_grupo_sem_unidade = self._usuario(
            "workflow_admin_grupo_sem_unidade", None, perfil="admin"
        )
        self.admin_grupo_sem_unidade.grupos_administrados.set([self.grupo_a])

    @staticmethod
    def _unidade(nome, sigla):
        return Unidade.objects.create(
            nome=nome,
            sigla=sigla,
            codigo=f"WF-{sigla}",
        )

    @staticmethod
    def _usuario(username, unidade, perfil="usuario"):
        return Usuario.objects.create_user(
            username=username,
            password="senha-de-teste",
            email=f"{username}@example.invalid",
            siape=f"WF{username[-18:]}",
            unidade=unidade,
            perfil=perfil,
            is_staff=perfil != "usuario",
        )

    @staticmethod
    def _catalogo(codigo, nome, grupo):
        return ItemCatalogo.objects.create(
            tipo="material",
            nome=nome,
            descricao=f"{nome} catalogado para regressao de RBAC",
            codigo_catmat_catser=codigo,
            grupo=grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("1000.00"),
            ativo=True,
        )

    def _login(self, usuario):
        self.client.force_login(usuario)

    def _criar_demanda(self, proprietario, observacao="Workflow RBAC"):
        self._login(proprietario)
        resposta = self.client.post(
            reverse("api:demanda-list"),
            {
                "ano_referencia": self.ano_referencia,
                "observacao": observacao,
            },
            format="json",
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        return Demanda.objects.get(pk=resposta.data["id"])

    def _adicionar_item(self, demanda, proprietario, catalogo, quantidade=1):
        self._login(proprietario)
        resposta = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": demanda.pk}),
            {
                "item_catalogo": catalogo.pk,
                "quantidade": quantidade,
                "data_prevista": date(self.ano_referencia, 6, 30).isoformat(),
                "prioridade": "media",
                "justificativa_necessidade": "Necessidade institucional testada.",
                "indicacao_orcamentaria": "Recursos de regressao",
            },
            format="json",
        )
        self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)
        return ItemDemanda.objects.get(pk=resposta.data["id"])

    def _enviar(self, demanda, proprietario):
        self._login(proprietario)
        resposta = self.client.post(
            reverse("api:demanda-enviar", kwargs={"pk": demanda.pk}),
            format="json",
        )
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        demanda.refresh_from_db()
        return resposta

    def _criar_enviar(self, proprietario, *catalogos):
        demanda = self._criar_demanda(proprietario)
        itens = [
            self._adicionar_item(demanda, proprietario, catalogo, indice)
            for indice, catalogo in enumerate(catalogos, start=1)
        ]
        resposta = self._enviar(demanda, proprietario)
        return demanda, itens, resposta

    def _pendentes(self, administrador, demanda=None):
        self._login(administrador)
        query = {"demanda": demanda.pk} if demanda is not None else {}
        resposta = self.client.get(reverse("api:validacao-pendentes"), query)
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        return resposta

    def _decidir(self, administrador, item, acao, comentario=""):
        self._login(administrador)
        return self.client.post(
            reverse("api:validacao-decidir"),
            {
                "item_demanda": item.pk,
                "acao": acao,
                "comentario": comentario,
            },
            format="json",
        )

    def _consolidar(self, administrador, demanda, itens, numero):
        self._login(administrador)
        return self.client.post(
            reverse("api:dfd-consolidar"),
            {
                "numero_dfd": numero,
                "ciclo_pac_id": demanda.ciclo_pac_id,
                "item_ids": [item.pk for item in itens],
            },
            format="json",
        )

    def test_fluxo_usuario_item_catalogado_chega_ao_admin_correto(self):
        demanda, (notebook,), envio = self._criar_enviar(
            self.usuario_a, self.catalogo_a1
        )

        self.assertEqual(envio.data["status"], StatusDemanda.AGUARDANDO_VALIDACAO)
        self.assertIsNotNone(demanda.enviada_em)
        notebook.refresh_from_db()
        self.assertEqual(notebook.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)

        pendentes = self._pendentes(self.admin_a, demanda)
        self.assertEqual([item["id"] for item in pendentes.data], [notebook.pk])
        self.assertEqual(pendentes.data[0]["grupo_id"], self.grupo_a.pk)
        self.assertEqual(pendentes.data[0]["demanda_id"], demanda.pk)

        detalhe = self.client.get(reverse("api:item-detail", kwargs={"pk": notebook.pk}))
        self.assertEqual(detalhe.status_code, status.HTTP_200_OK)

        decisao = self._decidir(self.admin_a, notebook, "validado")
        self.assertEqual(decisao.status_code, status.HTTP_201_CREATED, decisao.data)
        notebook.refresh_from_db()
        demanda.refresh_from_db()
        self.assertEqual(notebook.status, StatusItemDemanda.VALIDADA)
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
        self.assertEqual(self._pendentes(self.admin_a, demanda).data, [])

    def test_admin_errado_nao_ve_fila_nem_acessa_ou_decide_por_id(self):
        demanda, (notebook,), _ = self._criar_enviar(
            self.usuario_a, self.catalogo_a1
        )

        self.assertEqual(self._pendentes(self.admin_b, demanda).data, [])
        demanda_url = reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        item_url = reverse("api:item-detail", kwargs={"pk": notebook.pk})
        self.assertEqual(self.client.get(demanda_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(item_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn(
            self.client.patch(item_url, {"quantidade": 99}, format="json").status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )

        decisao = self._decidir(self.admin_b, notebook, "validado")
        self.assertIn(
            decisao.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )
        notebook.refresh_from_db()
        self.assertEqual(notebook.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.assertFalse(Validacao.objects.filter(item_demanda=notebook).exists())

    def test_requisitantes_ficam_isolados_em_get_patch_e_decisao_diretos(self):
        demanda, (notebook,), _ = self._criar_enviar(
            self.usuario_a, self.catalogo_a1
        )
        self._login(self.usuario_b)

        lista = self.client.get(reverse("api:demanda-list"))
        self.assertNotIn(demanda.pk, [item["id"] for item in lista.data["results"]])
        demanda_url = reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        item_url = reverse("api:item-detail", kwargs={"pk": notebook.pk})
        self.assertEqual(self.client.get(demanda_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(
                demanda_url, {"observacao": "tentativa indevida"}, format="json"
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.get(item_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(item_url, {"quantidade": 88}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        decisao = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": notebook.pk, "acao": "validado"},
            format="json",
        )
        self.assertEqual(decisao.status_code, status.HTTP_403_FORBIDDEN)
        notebook.refresh_from_db()
        demanda.refresh_from_db()
        self.assertEqual(notebook.quantidade, 1)
        self.assertEqual(notebook.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.assertNotEqual(demanda.observacao, "tentativa indevida")

    def test_rascunho_e_invisivel_ao_admin_responsavel_inclusive_por_id(self):
        demanda = self._criar_demanda(self.usuario_a, "Rascunho privado")
        notebook = self._adicionar_item(
            demanda, self.usuario_a, self.catalogo_a1
        )

        self.assertEqual(self._pendentes(self.admin_a, demanda).data, [])
        lista = self.client.get(reverse("api:demanda-list"))
        self.assertNotIn(demanda.pk, [item["id"] for item in lista.data["results"]])
        self.assertEqual(
            self.client.get(
                reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.get(
                reverse("api:item-detail", kwargs={"pk": notebook.pk})
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_admin_sem_grupo_falha_fechado_na_fila_mesmo_com_unidade(self):
        demanda, _, _ = self._criar_enviar(self.usuario_a, self.catalogo_a1)

        self.assertEqual(self._pendentes(self.admin_sem_grupo, demanda).data, [])

    def test_admin_sem_grupo_falha_fechado_em_get_e_decisao_diretos(self):
        _, (notebook,), _ = self._criar_enviar(self.usuario_a, self.catalogo_a1)

        self._login(self.admin_sem_grupo)
        detalhe = self.client.get(reverse("api:item-detail", kwargs={"pk": notebook.pk}))
        self.assertIn(
            detalhe.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )
        decisao = self._decidir(self.admin_sem_grupo, notebook, "validado")
        self.assertIn(
            decisao.status_code,
            {status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND},
        )
        notebook.refresh_from_db()
        self.assertEqual(notebook.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.assertFalse(Validacao.objects.filter(item_demanda=notebook).exists())

    def test_admin_com_grupo_explicito_sem_unidade_lista_e_decide(self):
        demanda, (notebook,), _ = self._criar_enviar(
            self.usuario_a, self.catalogo_a1
        )

        pendentes = self._pendentes(self.admin_grupo_sem_unidade, demanda)
        self.assertEqual([item["id"] for item in pendentes.data], [notebook.pk])
        decisao = self._decidir(
            self.admin_grupo_sem_unidade, notebook, "validado"
        )
        self.assertEqual(decisao.status_code, status.HTTP_201_CREATED, decisao.data)
        notebook.refresh_from_db()
        self.assertEqual(notebook.status, StatusItemDemanda.VALIDADA)

    def test_admin_com_grupo_explicito_sem_unidade_acessa_item_por_id(self):
        _, (notebook,), _ = self._criar_enviar(self.usuario_a, self.catalogo_a1)

        self._login(self.admin_grupo_sem_unidade)
        resposta = self.client.get(
            reverse("api:item-detail", kwargs={"pk": notebook.pk})
        )
        self.assertEqual(resposta.status_code, status.HTTP_200_OK, resposta.data)
        self.assertEqual(resposta.data["id"], notebook.pk)

    def test_multiplos_itens_do_mesmo_grupo_entram_e_saem_da_fila(self):
        demanda, itens, _ = self._criar_enviar(
            self.usuario_a,
            self.catalogo_a1,
            self.catalogo_a2,
            self.catalogo_a3,
        )

        pendentes = self._pendentes(self.admin_a, demanda)
        self.assertEqual(
            [item["id"] for item in pendentes.data],
            [item.pk for item in itens],
        )
        self.assertEqual({item["grupo_id"] for item in pendentes.data}, {self.grupo_a.pk})

        for item in itens:
            resposta = self._decidir(self.admin_a, item, "validado")
            self.assertEqual(resposta.status_code, status.HTTP_201_CREATED, resposta.data)

        demanda.refresh_from_db()
        self.assertEqual(self._pendentes(self.admin_a, demanda).data, [])
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
        self.assertEqual(
            set(demanda.itens.values_list("status", flat=True)),
            {StatusItemDemanda.VALIDADA},
        )

    def test_demanda_a_b_a_percorre_devolucao_reenvio_e_dois_dfds(self):
        demanda, (item_a1, item_b, item_a2), _ = self._criar_enviar(
            self.usuario_a,
            self.catalogo_a1,
            self.catalogo_b1,
            self.catalogo_a2,
        )

        self.assertEqual(
            [item["id"] for item in self._pendentes(self.admin_a, demanda).data],
            [item_a1.pk, item_a2.pk],
        )
        self.assertEqual(
            [item["id"] for item in self._pendentes(self.admin_b, demanda).data],
            [item_b.pk],
        )

        validacao_a1 = self._decidir(self.admin_a, item_a1, "validado")
        self.assertEqual(validacao_a1.status_code, status.HTTP_201_CREATED)
        demanda.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
        self.assertEqual(
            [item["id"] for item in self._pendentes(self.admin_a, demanda).data],
            [item_a2.pk],
        )

        devolucao_b = self._decidir(
            self.admin_b,
            item_b,
            "devolvido",
            "Corrigir a quantidade solicitada.",
        )
        self.assertEqual(devolucao_b.status_code, status.HTTP_201_CREATED)
        item_b.refresh_from_db()
        demanda.refresh_from_db()
        self.assertEqual(item_b.status, StatusItemDemanda.DEVOLVIDA)
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)
        self.assertEqual(self._pendentes(self.admin_b, demanda).data, [])

        self._login(self.usuario_a)
        detalhe_usuario = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(detalhe_usuario.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in detalhe_usuario.data["itens"]},
            {item_a1.pk, item_b.pk, item_a2.pk},
        )
        correcao = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": item_b.pk}),
            {"quantidade": 7, "observacoes": "Quantidade corrigida"},
            format="json",
        )
        self.assertEqual(correcao.status_code, status.HTTP_200_OK, correcao.data)
        self.assertEqual(correcao.data["status"], StatusItemDemanda.DEVOLVIDA)
        reenvio = self.client.post(
            reverse("api:item-reenviar", kwargs={"pk": item_b.pk}),
            format="json",
        )
        self.assertEqual(reenvio.status_code, status.HTTP_200_OK, reenvio.data)
        self.assertEqual(
            [item["id"] for item in self._pendentes(self.admin_b, demanda).data],
            [item_b.pk],
        )

        validacao_b = self._decidir(self.admin_b, item_b, "validado")
        self.assertEqual(validacao_b.status_code, status.HTTP_201_CREATED)
        validacao_a2 = self._decidir(self.admin_a, item_a2, "validado")
        self.assertEqual(validacao_a2.status_code, status.HTTP_201_CREATED)
        demanda.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)

        dfd_a = self._consolidar(
            self.admin_a,
            demanda,
            [item_a1, item_a2],
            "DFD-WORKFLOW-A",
        )
        self.assertEqual(dfd_a.status_code, status.HTTP_201_CREATED, dfd_a.data)
        demanda.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.EM_ANDAMENTO)

        dfd_b = self._consolidar(
            self.admin_b,
            demanda,
            [item_b],
            "DFD-WORKFLOW-B",
        )
        self.assertEqual(dfd_b.status_code, status.HTTP_201_CREATED, dfd_b.data)
        demanda.refresh_from_db()
        item_a1.refresh_from_db()
        item_a2.refresh_from_db()
        item_b.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.CONCLUIDA)
        self.assertEqual(DFD.objects.filter(ciclo_pac=demanda.ciclo_pac).count(), 2)
        self.assertEqual(item_a1.dfd.grupo_id, self.grupo_a.pk)
        self.assertEqual(item_a2.dfd_id, item_a1.dfd_id)
        self.assertEqual(item_b.dfd.grupo_id, self.grupo_b.pk)
        self.assertNotEqual(item_a1.dfd_id, item_b.dfd_id)

    def test_admin_master_ve_todos_os_grupos_e_processa_sem_ampliar_patch(self):
        demanda, (item_a, item_b), _ = self._criar_enviar(
            self.usuario_a, self.catalogo_a1, self.catalogo_b1
        )

        pendentes = self._pendentes(self.admin_master, demanda)
        self.assertEqual(
            {item["id"] for item in pendentes.data},
            {item_a.pk, item_b.pk},
        )
        detalhe = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(detalhe.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {item["id"] for item in detalhe.data["itens"]},
            {item_a.pk, item_b.pk},
        )
        patch = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": item_a.pk}),
            {"quantidade": 42},
            format="json",
        )
        self.assertEqual(patch.status_code, status.HTTP_403_FORBIDDEN)
        decisao = self._decidir(self.admin_master, item_b, "validado")
        self.assertEqual(decisao.status_code, status.HTTP_201_CREATED, decisao.data)
        item_b.refresh_from_db()
        self.assertEqual(item_b.status, StatusItemDemanda.VALIDADA)

    def test_grupo_inativo_nao_autoriza_item_manual_da_mesma_unidade(self):
        demanda = self._criar_demanda(self.usuario_a, "Manual com grupo inativo")
        item = ItemDemanda.objects.create(
            demanda=demanda,
            tipo="material",
            nome="Item manual restrito",
            descricao="Item manual para testar falha fechada",
            unidade_medida="unidade",
            quantidade=1,
            valor_estimado=Decimal("100.00"),
            valor_total=Decimal("100.00"),
            data_prevista=date(self.ano_referencia, 6, 30),
            prioridade="media",
            justificativa_necessidade="Teste de grupo inativo",
            indicacao_orcamentaria="Teste",
            status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
        )
        demanda.enviada_em = timezone.now()
        demanda.status = StatusDemanda.AGUARDANDO_VALIDACAO
        demanda.save(update_fields=["enviada_em", "status", "atualizado_em"])
        self.grupo_a.ativo = False
        self.grupo_a.save(update_fields=["ativo"])

        self.assertEqual(self._pendentes(self.admin_a, demanda).data, [])
        self.assertEqual(
            self._decidir(self.admin_a, item, "validado").status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_decisao_direta_rejeita_demanda_nao_enviada(self):
        demanda = self._criar_demanda(self.usuario_a, "Estado artificial")
        item = self._adicionar_item(demanda, self.usuario_a, self.catalogo_a1)
        item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
        item.save(update_fields=["status", "atualizado_em"])

        resposta = self._decidir(self.admin_a, item, "validado")
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        item.refresh_from_db()
        self.assertEqual(item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.assertFalse(Validacao.objects.filter(item_demanda=item).exists())

    def test_cancelamento_rejeita_demanda_parcialmente_vinculada_a_dfd(self):
        demanda, (item_a, item_b), _ = self._criar_enviar(
            self.usuario_a, self.catalogo_a1, self.catalogo_b1
        )
        self.assertEqual(
            self._decidir(self.admin_a, item_a, "validado").status_code,
            status.HTTP_201_CREATED,
        )
        self.assertEqual(
            self._consolidar(self.admin_a, demanda, [item_a], "DFD-PARCIAL").status_code,
            status.HTTP_201_CREATED,
        )

        self._login(self.admin_master)
        resposta = self.client.post(
            reverse("api:demanda-cancelar", kwargs={"pk": demanda.pk}),
            format="json",
        )
        self.assertEqual(resposta.status_code, status.HTTP_409_CONFLICT)
        item_a.refresh_from_db()
        item_b.refresh_from_db()
        self.assertEqual(item_a.status, StatusItemDemanda.VINCULADA_DFD)
        self.assertEqual(item_b.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
