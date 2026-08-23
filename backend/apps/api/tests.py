"""
Testes da API REST do PAC UFPI.

Cobrem autenticação por sessão e os principais fluxos de negócio expostos
pela API consumida pelo front-end React.
"""

from datetime import date
from decimal import Decimal
from unittest import mock

from django.contrib import admin
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.catalogo.models import ItemCatalogo
from apps.auditoria.models import LogAuditoria
from apps.demandas.models import Demanda, ItemDemanda, StatusDemanda, StatusItemDemanda
from apps.demandas.services import sincronizar_status_macro_demanda
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.validacoes.models import Validacao

Usuario = get_user_model()


def criar_unidade(sigla="STI"):
    return Unidade.objects.create(
        nome=f"Unidade {sigla}", sigla=sigla, codigo=f"COD-{sigla}"
    )


def criar_usuario(username="ana", unidade=None, is_staff=False, perfil="usuario"):
    return Usuario.objects.create_user(
        username=username,
        password="senha12345",
        email=f"{username}@ufpi.edu.br",
        siape=f"SIAPE-{username}",
        unidade=unidade,
        is_staff=is_staff,
        perfil=perfil,
    )


def dados_item(**overrides):
    dados = {
        "tipo": "material",
        "nome": "Notebook",
        "descricao": "Notebook institucional",
        "unidade_medida": "unidade",
        "quantidade": 2,
        "valor_estimado": "1500.00",
        "data_prevista": date(2027, 1, 1).isoformat(),
        "prioridade": "media",
        "justificativa_prioridade": "Necessário",
        "justificativa_necessidade": "Trabalho",
        "indicacao_orcamentaria": "Orçamento X",
    }
    dados.update(overrides)
    return dados


# =============================================================================
# Autenticação
# =============================================================================

class AutenticacaoTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)

    def test_login_com_credenciais_validas(self):
        resp = self.client.post(
            reverse("api:login"),
            {"username": "ana", "password": "senha12345"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["username"], "ana")

    def test_login_com_credenciais_invalidas(self):
        resp = self.client.post(
            reverse("api:login"),
            {"username": "ana", "password": "errada"},
        )
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_exige_autenticacao(self):
        resp = self.client.get(reverse("api:me"))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_retorna_usuario_logado(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:me"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["username"], "ana")
        self.assertFalse(resp.data["is_admin_user"])
        self.assertFalse(resp.data["is_admin_master_user"])

    def test_me_expoe_capacidades_do_perfil_sem_depender_de_is_staff(self):
        admin_pac = criar_usuario(
            username="gestor",
            unidade=self.unidade,
            perfil="admin",
            is_staff=False,
        )
        self.client.force_login(admin_pac)

        resp = self.client.get(reverse("api:me"))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["is_admin_user"])
        self.assertFalse(resp.data["is_admin_master_user"])
        self.assertFalse(resp.data["is_staff"])


# =============================================================================
# Demandas
# =============================================================================

class DemandaTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)

    def test_criar_demanda(self):
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api:demanda-list"),
            {"ano_referencia": 2027, "observacao": "Teste"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["status"], StatusDemanda.RASCUNHO)

    def test_adicionar_item_a_demanda(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )
        resp = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": demanda.pk}),
            dados_item(),
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(resp.data["valor_total"]), Decimal("3000.00"))
        self.assertEqual(resp.data["status"], StatusItemDemanda.RASCUNHO)

    def test_enviar_demanda_sem_itens_rejeita(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )
        resp = self.client.post(
            reverse("api:demanda-enviar", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_enviar_demanda_com_itens_sucesso(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )
        ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item 1", quantidade=1,
            valor_estimado=Decimal("100"), valor_total=Decimal("100"),
            data_prevista=date(2027, 1, 1), justificativa_necessidade="Uso necessário",
        )
        resp = self.client.post(
            reverse("api:demanda-enviar", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        demanda.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)

    def test_cancelar_demanda_em_rascunho_pelo_dono(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )
        ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item 1", quantidade=1,
            valor_estimado=Decimal("100"), valor_total=Decimal("100"),
            data_prevista=date(2027, 1, 1),
        )
        resp = self.client.post(
            reverse("api:demanda-cancelar", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        demanda.refresh_from_db()
        self.assertEqual(demanda.status, StatusDemanda.CANCELADA)
        self.assertTrue(all(i.status == StatusItemDemanda.CANCELADA for i in demanda.itens.all()))

    def test_excluir_demanda_em_rascunho_pelo_dono_sucesso_204(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.RASCUNHO
        )
        ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item Excluir", quantidade=1,
            valor_estimado=Decimal("50"), valor_total=Decimal("50"),
            data_prevista=date(2027, 1, 1),
        )
        resp = self.client.delete(
            reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Demanda.objects.filter(pk=demanda.pk).exists())

    def test_excluir_demanda_nao_rascunho_bloqueado_400(self):
        self.client.force_login(self.user)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.AGUARDANDO_VALIDACAO
        )
        resp = self.client.delete(
            reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(Demanda.objects.filter(pk=demanda.pk).exists())

    def test_excluir_demanda_por_outro_usuario_bloqueado_403(self):
        outro_admin = criar_usuario(username="gestor_outro", is_staff=True, perfil="admin_master")
        self.client.force_login(outro_admin)
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.RASCUNHO
        )
        resp = self.client.delete(
            reverse("api:demanda-detail", kwargs={"pk": demanda.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Demanda.objects.filter(pk=demanda.pk).exists())

    def test_serializacao_historico_na_demanda_e_item(self):
        from apps.validacoes.models import TipoAcao
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO, observacao="Demanda inicial de TI"
        )
        item = ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Mouse Óptico", quantidade=3,
            valor_estimado=Decimal("30"), valor_total=Decimal("90"),
            data_prevista=date(2027, 2, 1), status=StatusItemDemanda.VALIDADA
        )
        admin_validador = criar_usuario(username="validador_test", is_staff=True, perfil="admin")
        Validacao.objects.create(
            item_demanda=item,
            usuario=admin_validador,
            acao=TipoAcao.VALIDADO,
            comentario="Item de acordo com as especificações."
        )

        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:demanda-detail", kwargs={"pk": demanda.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Verifica histórico consolidado na demanda
        self.assertIn("historico", resp.data)
        historico = resp.data["historico"]
        self.assertGreaterEqual(len(historico), 2)  # Criação da demanda + validação do item

        # Verifica se cada registro do histórico possui título, comentário, autor, data e ação
        for entrada in historico:
            self.assertIn("titulo", entrada)
            self.assertIn("comentario", entrada)
            self.assertIn("autor", entrada)
            self.assertIn("data", entrada)
            self.assertIn("acao", entrada)

        # Verifica histórico de validações no item
        self.assertIn("itens", resp.data)
        self.assertEqual(len(resp.data["itens"]), 1)
        item_data = resp.data["itens"][0]
        self.assertIn("historico_validacoes", item_data)
        self.assertEqual(len(item_data["historico_validacoes"]), 1)
        self.assertEqual(item_data["historico_validacoes"][0]["comentario"], "Item de acordo com as especificações.")
        self.assertEqual(item_data["historico_validacoes"][0]["acao"], TipoAcao.VALIDADO)


# =============================================================================
# Validações
# =============================================================================

class ValidacaoTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)
        self.admin = criar_usuario(
            username="admin", is_staff=True, perfil="admin_master"
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.AGUARDANDO_VALIDACAO
        )
        self.item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Cadeira", quantidade=5,
            valor_estimado=Decimal("200"), valor_total=Decimal("1000"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.AGUARDANDO_VALIDACAO
        )

    def test_listar_pendentes_exige_admin(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:validacao-pendentes"))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_listar_pendentes_retorna_itens_aguardando(self):
        self.client.force_login(self.admin)
        resp = self.client.get(reverse("api:validacao-pendentes"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_validar_item(self):
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item.pk, "acao": "validado"},
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VALIDADA)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.EM_ANDAMENTO)

    def test_devolver_exige_comentario(self):
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": self.item.pk, "acao": "devolvido"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_devolver_com_comentario(self):
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:validacao-decidir"),
            {
                "item_demanda": self.item.pk,
                "acao": "devolvido",
                "comentario": "Ajustar valor",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.DEVOLVIDA)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.EM_ANDAMENTO)

    def test_reenviar_item_devolvido(self):
        self.item.status = StatusItemDemanda.DEVOLVIDA
        self.item.justificativa_necessidade = "Justificativa válida"
        self.item.save()
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api:item-reenviar", kwargs={"pk": self.item.pk})
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)


# =============================================================================
# DFD e Consolidação
# =============================================================================

class DFDTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)
        self.admin = criar_usuario(
            username="admin", is_staff=True, perfil="admin_master"
        )
        self.grupo = GrupoContratacao.objects.create(
            nome="TIC", unidade_admin=self.unidade
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO
        )
        self.item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="X", descricao="d",
            unidade_medida="un", quantidade=1, valor_estimado=Decimal("10"),
            valor_total=Decimal("10"), data_prevista=date(2027, 1, 1),
            prioridade="media", justificativa_prioridade="a",
            justificativa_necessidade="b", indicacao_orcamentaria="c",
            status=StatusItemDemanda.VALIDADA,
        )

    def test_itens_disponiveis(self):
        self.client.force_login(self.admin)
        resp = self.client.get(reverse("api:dfd-disponiveis"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

    def test_consolidar_cria_dfd_e_marca_itens_vinculados(self):
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-001", "grupo": self.grupo.pk, "itens": [self.item.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VINCULADA_DFD)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.CONCLUIDA)

    def test_consolidar_item_nao_validado_rejeita(self):
        self.item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
        self.item.save()
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-002", "grupo": self.grupo.pk, "itens": [self.item.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_consolidacao_reverte_todas_as_escritas_em_falha_intermediaria(self):
        dfd_count_inicial = DFD.objects.count()
        self.client.force_login(self.admin)
        with mock.patch("apps.api.views.sincronizar_status_macro_demanda", side_effect=RuntimeError("Falha simulada")):
            with self.assertRaises(RuntimeError):
                self.client.post(
                    reverse("api:dfd-consolidar"),
                    {"numero": "DFD-FAIL", "grupo": self.grupo.pk, "itens": [self.item.pk]},
                    format="json",
                )
        self.assertFalse(DFD.objects.filter(numero="DFD-FAIL").exists())
        self.assertEqual(DFD.objects.count(), dfd_count_inicial)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VALIDADA)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.EM_ANDAMENTO)

    def test_consolidar_itens_de_multiplas_demandas_sincroniza_todas(self):
        demanda_b = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO
        )
        item_b = ItemDemanda.objects.create(
            demanda=demanda_b, tipo="material", nome="Y", descricao="d2",
            unidade_medida="un", quantidade=1, valor_estimado=Decimal("20"),
            valor_total=Decimal("20"), data_prevista=date(2027, 1, 1),
            prioridade="media", justificativa_prioridade="a",
            justificativa_necessidade="b", indicacao_orcamentaria="c",
            status=StatusItemDemanda.VALIDADA,
        )
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-MULTI", "grupo": self.grupo.pk, "itens": [self.item.pk, item_b.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(DFD.objects.filter(numero="DFD-MULTI").count(), 1)
        self.item.refresh_from_db()
        item_b.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.VINCULADA_DFD)
        self.assertEqual(item_b.status, StatusItemDemanda.VINCULADA_DFD)
        self.demanda.refresh_from_db()
        demanda_b.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.CONCLUIDA)
        self.assertEqual(demanda_b.status, StatusDemanda.CONCLUIDA)

    def test_consolidar_rejeita_id_inexistente(self):
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-BAD-ID", "grupo": self.grupo.pk, "itens": [999999]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DFD.objects.filter(numero="DFD-BAD-ID").count(), 0)

    def test_consolidar_desduplica_ids_repetidos(self):
        # A desduplicação automática da lista de itens na consolidação é intencional para o MVP.
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-DUP", "grupo": self.grupo.pk, "itens": [self.item.pk, self.item.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        dfd = DFD.objects.get(numero="DFD-DUP")
        self.assertEqual(dfd.itens_demanda.count(), 1)

    def test_consolidar_rejeita_item_ja_vinculado(self):
        self.item.status = StatusItemDemanda.VINCULADA_DFD
        self.item.save()
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-ALREADY", "grupo": self.grupo.pk, "itens": [self.item.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(DFD.objects.filter(numero="DFD-ALREADY").count(), 0)

    def test_consolidar_rejeita_item_de_demanda_concluida(self):
        self.demanda.status = StatusDemanda.CONCLUIDA
        self.demanda.save()
        self.client.force_login(self.admin)
        resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-CLOSED", "grupo": self.grupo.pk, "itens": [self.item.pk]},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(DFD.objects.filter(numero="DFD-CLOSED").count(), 0)

    def test_fluxo_completo_ciclo_de_vida(self):
        # 1. Usuário cria demanda em rascunho
        self.client.force_login(self.user)
        demanda_resp = self.client.post(
            reverse("api:demanda-list"),
            {"ano_referencia": 2027, "observacao": "Nova demanda de teste"},
            format="json",
        )
        self.assertEqual(demanda_resp.status_code, status.HTTP_201_CREATED)
        demanda_id = demanda_resp.data["id"]

        # 2. Adiciona item à demanda
        item_resp = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": demanda_id}),
            {
                "tipo": "material", "nome": "Teclado", "descricao": "USB",
                "unidade_medida": "un", "quantidade": 2, "valor_estimado": "100.00",
                "data_prevista": "2027-03-01", "prioridade": "alta",
                "justificativa_prioridade": "Essencial",
                "justificativa_necessidade": "Substituição",
                "indicacao_orcamentaria": "Recursos próprios",
            },
            format="json",
        )
        self.assertEqual(item_resp.status_code, status.HTTP_201_CREATED)
        item_id = item_resp.data["id"]

        # 3. Usuário envia a demanda
        enviar_resp = self.client.post(reverse("api:demanda-enviar", kwargs={"pk": demanda_id}))
        self.assertEqual(enviar_resp.status_code, status.HTTP_200_OK)

        # 4. Admin valida o item
        self.client.force_login(self.admin)
        valida_resp = self.client.post(
            reverse("api:validacao-decidir"),
            {"item_demanda": item_id, "acao": "validado"},
            format="json",
        )
        self.assertEqual(valida_resp.status_code, status.HTTP_201_CREATED)

        # 5. Admin consolida em DFD
        dfd_resp = self.client.post(
            reverse("api:dfd-consolidar"),
            {"numero": "DFD-2027-01", "grupo": self.grupo.pk, "itens": [item_id]},
            format="json",
        )
        self.assertEqual(dfd_resp.status_code, status.HTTP_201_CREATED)

        # 6. Verifica alteração para VINCULADA_DFD no banco e Demanda CONCLUIDA
        item_obj = ItemDemanda.objects.get(pk=item_id)
        self.assertEqual(item_obj.status, StatusItemDemanda.VINCULADA_DFD)
        demanda_obj = Demanda.objects.get(pk=demanda_id)
        self.assertEqual(demanda_obj.status, StatusDemanda.CONCLUIDA)


# =============================================================================
# Testes do Serviço de Sincronização Macro de Status
# =============================================================================

class SincronizacaoMacroTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )

    def test_demanda_sem_itens_eh_rascunho(self):
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.RASCUNHO)

    def test_todos_itens_rascunho_eh_rascunho(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.RASCUNHO,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.RASCUNHO)

    def test_todos_itens_aguardando_eh_aguardando_validacao(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.AGUARDANDO_VALIDACAO)

    def test_itens_mistos_com_devolvido_eh_em_andamento(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
        )
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="B", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.AGUARDANDO_VALIDACAO,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.EM_ANDAMENTO)

    def test_todos_vinculados_eh_concluida(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.VINCULADA_DFD,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.CONCLUIDA)

    def test_todos_itens_cancelados_preserva_status_macro_anterior(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.CANCELADA,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.RASCUNHO)

    def test_cancelados_com_ativos_ignora_cancelados(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.CANCELADA,
        )
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="B", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.VINCULADA_DFD,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.CONCLUIDA)

    def test_demanda_cancelada_nao_reativa_com_sincronizacao(self):
        self.demanda.status = StatusDemanda.CANCELADA
        self.demanda.save()
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.VINCULADA_DFD,
        )
        status_calc = sincronizar_status_macro_demanda(self.demanda)
        self.assertEqual(status_calc, StatusDemanda.CANCELADA)

    def test_idempotencia_da_sincronizacao(self):
        ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.VINCULADA_DFD,
        )
        s1 = sincronizar_status_macro_demanda(self.demanda)
        self.demanda.refresh_from_db()
        st1 = self.demanda.status
        s2 = sincronizar_status_macro_demanda(self.demanda)
        self.demanda.refresh_from_db()
        st2 = self.demanda.status
        self.assertEqual(s1, s2)
        self.assertEqual(st1, st2)
        self.assertEqual(st2, StatusDemanda.CONCLUIDA)

    def test_patch_direto_nao_altera_status_da_demanda(self):
        self.client.force_login(self.user)
        resp = self.client.patch(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda.pk}),
            {"status": StatusDemanda.CONCLUIDA, "observacao": "Tentativa"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.RASCUNHO)

    def test_patch_direto_nao_altera_status_do_item(self):
        item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Item A", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.RASCUNHO,
        )
        self.client.force_login(self.user)
        resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": item.pk}),
            {"status": StatusItemDemanda.VALIDADA},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        item.refresh_from_db()
        self.assertEqual(item.status, StatusItemDemanda.RASCUNHO)

    def test_alterar_demanda_concluida_rejeita(self):
        self.demanda.status = StatusDemanda.CONCLUIDA
        self.demanda.save()
        self.client.force_login(self.user)
        resp = self.client.post(
            reverse("api:demanda-itens", kwargs={"pk": self.demanda.pk}),
            dados_item(),
        )
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)


# =============================================================================
# Server-Side Integration
# =============================================================================

class ServerSideIntegrationTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.unidade_admin = criar_unidade("ADM")
        self.user = criar_usuario(unidade=self.unidade)
        self.admin = criar_usuario(
            username="admin",
            unidade=self.unidade_admin,
            is_staff=True,
            perfil="admin",
        )
        self.grupo = GrupoContratacao.objects.create(
            nome="Grupo administrativo",
            unidade_admin=self.unidade_admin,
        )
        self.catalogo = ItemCatalogo.objects.create(
            tipo="material",
            nome="Monitor catalogado",
            descricao="Monitor institucional",
            codigo_catmat_catser="CAT-SERVER-SIDE",
            grupo=self.grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("500"),
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )

    def test_server_side_envio_e_validacao(self):
        item = ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=self.catalogo, tipo="material", nome="Monitor", quantidade=1,
            valor_estimado=Decimal("500"), valor_total=Decimal("500"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.RASCUNHO,
            justificativa_necessidade="Uso necessário",
        )
        self.client.force_login(self.user)
        resp = self.client.post(reverse("demandas:enviar", kwargs={"pk": self.demanda.pk}))
        self.assertEqual(resp.status_code, status.HTTP_302_FOUND)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)

        self.client.force_login(self.admin)
        val_resp = self.client.post(
            reverse("validacoes:validar_item", kwargs={"item_pk": item.pk}),
            {"acao": "aprovar"},
        )
        self.assertEqual(val_resp.status_code, status.HTTP_302_FOUND)
        item.refresh_from_db()
        self.assertEqual(item.status, StatusItemDemanda.VALIDADA)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.EM_ANDAMENTO)

    def test_server_side_item_reenviar(self):
        from apps.validacoes.models import Validacao, TipoAcao
        item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Teclado", quantidade=1,
            valor_estimado=Decimal("100"), valor_total=Decimal("100"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
            justificativa_necessidade="Necessário",
        )
        Validacao.objects.create(item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Corrigir descrição")

        self.client.force_login(self.user)
        resp = self.client.post(reverse("demandas:item_reenviar", kwargs={"pk": item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_302_FOUND)
        item.refresh_from_db()
        self.assertEqual(item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)

    def test_server_side_item_reenviar_sem_csrf_rejeita(self):
        from django.test import Client
        from apps.validacoes.models import Validacao, TipoAcao
        csrf_client = Client(enforce_csrf_checks=True)
        item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Mouse CSRF", quantidade=1,
            valor_estimado=Decimal("50"), valor_total=Decimal("50"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
            justificativa_necessidade="Necessário",
        )
        Validacao.objects.create(item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Devolvido")
        csrf_client.force_login(self.user)

        resp = csrf_client.post(reverse("demandas:item_reenviar", kwargs={"pk": item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_server_side_item_reenviar_com_csrf_sucesso(self):
        from django.test import Client
        from apps.validacoes.models import Validacao, TipoAcao
        csrf_client = Client(enforce_csrf_checks=True)
        item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Mouse CSRF Valid", quantidade=1,
            valor_estimado=Decimal("50"), valor_total=Decimal("50"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
            justificativa_necessidade="Necessário",
        )
        Validacao.objects.create(item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Devolvido")
        csrf_client.force_login(self.user)

        get_resp = csrf_client.get(reverse("demandas:detalhe", kwargs={"pk": self.demanda.pk}))
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        csrf_token = csrf_client.cookies["csrftoken"].value

        resp = csrf_client.post(
            reverse("demandas:item_reenviar", kwargs={"pk": item.pk}),
            {"csrfmiddlewaretoken": csrf_token},
        )
        self.assertEqual(resp.status_code, status.HTTP_302_FOUND)
        item.refresh_from_db()
        self.assertEqual(item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)


class ItemDevolvidoCorrecaoTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(username="solicitante", unidade=self.unidade)
        self.outro_user = criar_usuario(username="outro", unidade=self.unidade)
        self.admin = criar_usuario(username="admin_test", is_staff=True, perfil="admin")
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO,
        )
        self.item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Impressora", quantidade=1,
            valor_estimado=Decimal("800"), valor_total=Decimal("800"),
            data_prevista=date(2027, 5, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        from apps.validacoes.models import Validacao, TipoAcao
        self.val1 = Validacao.objects.create(
            item_demanda=self.item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Primeira devolução: ajustar marca."
        )

    def test_item_devolvido_exibe_ultima_justificativa(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["justificativa_devolucao"], "Primeira devolução: ajustar marca.")
        self.assertIsNotNone(resp.data["ultima_devolucao"])
        self.assertEqual(resp.data["ultima_devolucao"]["comentario"], "Primeira devolução: ajustar marca.")

    def test_item_devolvido_exibe_justificativa_mais_recente(self):
        from apps.validacoes.models import Validacao, TipoAcao
        Validacao.objects.create(
            item_demanda=self.item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Segunda devolução: ajustar cotação."
        )
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["justificativa_devolucao"], "Segunda devolução: ajustar cotação.")
        self.assertEqual(Validacao.objects.filter(item_demanda=self.item).count(), 2)

    def test_editar_item_devolvido_salva_observacoes_e_mantem_status(self):
        from apps.validacoes.models import Validacao
        validacoes_antes = Validacao.objects.filter(item_demanda=self.item).count()
        self.client.force_login(self.user)
        resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {
                "tipo": "material", "nome": "Impressora Laser", "descricao": "Multifuncional",
                "unidade_medida": "un", "quantidade": 2, "valor_estimado": "900.00",
                "data_prevista": "2027-05-01", "prioridade": "media",
                "justificativa_prioridade": "a", "justificativa_necessidade": "b",
                "indicacao_orcamentaria": "c", "observacoes": "Ajustada marca e modelo conforme solicitado.",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.nome, "Impressora Laser")
        self.assertEqual(self.item.observacoes, "Ajustada marca e modelo conforme solicitado.")
        self.assertEqual(self.item.status, StatusItemDemanda.DEVOLVIDA)
        # Comprova diretamente que edição NÃO cria nem altera instâncias de Validacao
        self.assertEqual(Validacao.objects.filter(item_demanda=self.item).count(), validacoes_antes)

    def test_observacao_do_solicitante_nao_substitui_justificativa_admin(self):
        from apps.validacoes.models import Validacao
        validacoes_antes = Validacao.objects.filter(item_demanda=self.item).count()
        self.client.force_login(self.user)
        self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"observacoes": "Observação do usuário"},
            format="json",
        )
        self.val1.refresh_from_db()
        self.assertEqual(self.val1.comentario, "Primeira devolução: ajustar marca.")
        self.assertEqual(Validacao.objects.filter(item_demanda=self.item).count(), validacoes_antes)

    def test_reenviar_item_devolvido_sucesso(self):
        from apps.validacoes.models import Validacao
        validacoes_antes = Validacao.objects.filter(item_demanda=self.item).count()
        self.client.force_login(self.user)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["detail"], "Item reenviado para validacao com sucesso.")
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)
        # Comprova diretamente que o reenvio NÃO cria nenhuma validação artificial
        self.assertEqual(Validacao.objects.filter(item_demanda=self.item).count(), validacoes_antes)

    def test_demanda_detail_query_count_does_not_grow_per_item(self):
        from apps.validacoes.models import Validacao, TipoAcao
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        d1 = Demanda.objects.create(unidade=self.unidade, usuario=self.user, ano_referencia=2027)
        i1 = ItemDemanda.objects.create(
            demanda=d1, tipo="material", nome="Item 1", quantidade=1,
            valor_estimado=Decimal("100"), valor_total=Decimal("100"),
            data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
            justificativa_necessidade="N",
        )
        Validacao.objects.create(item_demanda=i1, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Dev1")

        d2 = Demanda.objects.create(unidade=self.unidade, usuario=self.user, ano_referencia=2027)
        for idx in range(5):
            it = ItemDemanda.objects.create(
                demanda=d2, tipo="material", nome=f"Item {idx}", quantidade=1,
                valor_estimado=Decimal("100"), valor_total=Decimal("100"),
                data_prevista=date(2027, 1, 1), status=StatusItemDemanda.DEVOLVIDA,
                justificativa_necessidade="N",
            )
            Validacao.objects.create(item_demanda=it, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario=f"Dev {idx}")

        self.client.force_login(self.user)

        with CaptureQueriesContext(connection) as ctx1:
            self.client.get(reverse("api:demanda-detail", kwargs={"pk": d1.pk}))

        with CaptureQueriesContext(connection) as ctx2:
            self.client.get(reverse("api:demanda-detail", kwargs={"pk": d2.pk}))

        self.assertEqual(len(ctx1), len(ctx2))

    def test_reenviar_item_nao_devolvido_rejeita(self):
        self.item.status = StatusItemDemanda.AGUARDANDO_VALIDACAO
        self.item.save()
        self.client.force_login(self.user)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reenviar_item_de_demanda_concluida_rejeita(self):
        self.demanda.status = StatusDemanda.CONCLUIDA
        self.demanda.save()
        self.client.force_login(self.user)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_outro_usuario_nao_edita_nem_reenvia_item(self):
        self.client.force_login(self.outro_user)
        edit_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"nome": "Hacked"}, format="json",
        )
        self.assertEqual(edit_resp.status_code, status.HTTP_404_NOT_FOUND)

        resend_resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resend_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_comum_nao_visualiza_item_manual(self):
        self.client.force_login(self.admin)
        get_resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item.pk}))
        self.assertEqual(get_resp.status_code, status.HTTP_404_NOT_FOUND)

        edit_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"nome": "Admin Edit"}, format="json",
        )
        self.assertEqual(edit_resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_segundo_reenvio_do_mesmo_item_eh_rejeitado(self):
        from apps.validacoes.models import Validacao
        self.client.force_login(self.user)
        # Primeiro reenvio: sucesso
        resp1 = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)

        val_count_before = Validacao.objects.filter(item_demanda=self.item).count()

        # Segundo reenvio: rejeitado por transição inválida
        resp2 = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp2.status_code, status.HTTP_400_BAD_REQUEST)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)
        self.assertEqual(Validacao.objects.filter(item_demanda=self.item).count(), val_count_before)

    def test_get_item_proprietario_acessa(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["id"], self.item.pk)
        self.assertEqual(resp.data["demanda"], self.demanda.pk)

    def test_get_item_outro_usuario_bloqueado(self):
        self.client.force_login(self.outro_user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_item_inexistente_retorna_404(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": 999999}))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_prefetch_multiplos_itens_devolvidos(self):
        from apps.validacoes.models import Validacao, TipoAcao
        item2 = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Monitor 27", quantidade=2,
            valor_estimado=Decimal("1200"), valor_total=Decimal("2400"),
            data_prevista=date(2027, 5, 1), prioridade="alta",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        Validacao.objects.create(
            item_demanda=item2, usuario=self.admin, acao=TipoAcao.DEVOLVIDO, comentario="Devolução Monitor: ajustar resolução."
        )

        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:demanda-detail", kwargs={"pk": self.demanda.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        itens = resp.data["itens"]
        self.assertEqual(len(itens), 2)
        i1 = next(i for i in itens if i["id"] == self.item.pk)
        i2 = next(i for i in itens if i["id"] == item2.pk)
        self.assertEqual(i1["justificativa_devolucao"], "Primeira devolução: ajustar marca.")
        self.assertEqual(i2["justificativa_devolucao"], "Devolução Monitor: ajustar resolução.")


# =============================================================================
# Catálogo e Dashboard
# =============================================================================

class CatalogoDashboardTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade()
        self.user = criar_usuario(unidade=self.unidade)
        self.grupo = GrupoContratacao.objects.create(
            nome="TIC", unidade_admin=self.unidade
        )
        ItemCatalogo.objects.create(
            tipo="material", nome="Mouse", grupo=self.grupo,
            unidade_medida="un", valor_estimado=Decimal("50"),
        )

    def test_listar_catalogo(self):
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:catalogo-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["count"], 1)

    def test_catalogo_busca_por_nome_ou_codigo(self):
        ItemCatalogo.objects.create(
            tipo="material", nome="Teclado", codigo_catmat_catser="CAT-123",
            grupo=self.grupo, unidade_medida="un", valor_estimado=Decimal("80"),
        )
        self.client.force_login(self.user)

        por_nome = self.client.get(reverse("api:catalogo-list"), {"q": "mouse"})
        por_codigo = self.client.get(reverse("api:catalogo-list"), {"q": "CAT-123"})

        self.assertEqual(por_nome.status_code, status.HTTP_200_OK)
        self.assertEqual(por_codigo.status_code, status.HTTP_200_OK)
        self.assertEqual(por_nome.data["count"], 1)
        self.assertEqual(por_nome.data["results"][0]["nome"], "Mouse")
        self.assertEqual(por_codigo.data["count"], 1)
        self.assertEqual(por_codigo.data["results"][0]["nome"], "Teclado")

    def test_catalogo_filtra_por_grupo_e_ativo(self):
        outra_unidade = criar_unidade("CAT2")
        outro_grupo = GrupoContratacao.objects.create(
            nome="Almoxarifado", unidade_admin=outra_unidade
        )
        ativo_outro_grupo = ItemCatalogo.objects.create(
            tipo="material", nome="Papel", grupo=outro_grupo,
            unidade_medida="resma", valor_estimado=Decimal("30"),
        )
        inativo = ItemCatalogo.objects.create(
            tipo="material", nome="Monitor antigo", grupo=self.grupo,
            unidade_medida="un", valor_estimado=Decimal("500"), ativo=False,
        )
        admin_user = criar_usuario("cat_admin", unidade=self.unidade, is_staff=True, perfil="admin")

        self.client.force_login(self.user)
        resp_grupo = self.client.get(reverse("api:catalogo-list"), {"grupo": outro_grupo.pk})
        resp_inativo_usuario = self.client.get(reverse("api:catalogo-list"), {"ativo": "false"})

        self.assertEqual(resp_grupo.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_grupo.data["count"], 1)
        self.assertEqual(resp_grupo.data["results"][0]["id"], ativo_outro_grupo.pk)
        self.assertEqual(resp_inativo_usuario.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_inativo_usuario.data["count"], 0)

        self.client.force_login(admin_user)
        resp_inativo_admin = self.client.get(reverse("api:catalogo-list"), {"ativo": "false"})
        self.assertEqual(resp_inativo_admin.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_inativo_admin.data["count"], 1)
        self.assertEqual(resp_inativo_admin.data["results"][0]["id"], inativo.pk)

    def test_catalogo_escrita_exige_admin(self):
        self.client.force_login(self.user)

        criar = self.client.post(reverse("api:catalogo-list"), {
            "tipo": "material",
            "nome": "Cabo HDMI",
            "grupo": self.grupo.pk,
            "unidade_medida": "un",
            "valor_estimado": "25.00",
        })
        editar = self.client.patch(reverse("api:catalogo-detail", kwargs={"pk": 1}), {"nome": "Mouse 2"})
        excluir = self.client.delete(reverse("api:catalogo-detail", kwargs={"pk": 1}))
        desativar = self.client.post(reverse("api:catalogo-desativar", kwargs={"pk": 1}))

        self.assertEqual(criar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(editar.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(excluir.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(desativar.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_gerencia_catalogo_e_ativa_desativa(self):
        admin_user = criar_usuario("cat_admin2", unidade=self.unidade, is_staff=True, perfil="admin")
        self.client.force_login(admin_user)

        criar = self.client.post(reverse("api:catalogo-list"), {
            "tipo": "servico",
            "nome": "Manutencao preventiva",
            "descricao": "Servico anual",
            "codigo_catmat_catser": "SER-001",
            "grupo": self.grupo.pk,
            "unidade_medida": "servico",
            "valor_estimado": "1000.00",
        })
        self.assertEqual(criar.status_code, status.HTTP_201_CREATED)
        item_id = criar.data["id"]

        editar = self.client.patch(
            reverse("api:catalogo-detail", kwargs={"pk": item_id}),
            {"valor_estimado": "1200.00"},
        )
        self.assertEqual(editar.status_code, status.HTTP_200_OK)
        self.assertEqual(Decimal(editar.data["valor_estimado"]), Decimal("1200.00"))

        desativar = self.client.post(reverse("api:catalogo-desativar", kwargs={"pk": item_id}))
        self.assertEqual(desativar.status_code, status.HTTP_200_OK)
        self.assertFalse(desativar.data["ativo"])

        ativar = self.client.post(reverse("api:catalogo-ativar", kwargs={"pk": item_id}))
        self.assertEqual(ativar.status_code, status.HTTP_200_OK)
        self.assertTrue(ativar.data["ativo"])

        excluir = self.client.delete(reverse("api:catalogo-detail", kwargs={"pk": item_id}))
        self.assertEqual(excluir.status_code, status.HTTP_204_NO_CONTENT)

    def test_dashboard_stats(self):
        Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027
        )
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:dashboard-stats"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


class AdminRegistrationTests(APITestCase):
    def test_modelos_da_semana_1_do_miguel_registrados_no_admin(self):
        modelos = [
            Unidade,
            GrupoContratacao,
            ItemCatalogo,
            Validacao,
            DFD,
            LogAuditoria,
        ]

        for modelo in modelos:
            with self.subTest(modelo=modelo.__name__):
                self.assertIn(modelo, admin.site._registry)


class ItemDevolvidoRedPoliticaAcessoTests(APITestCase):
    def setUp(self):
        self.unidade_solicitante = criar_unidade("SOL")
        self.unidade_admin = criar_unidade("ADM")
        self.unidade_outro_admin = criar_unidade("OUT")
        self.proprietario = criar_usuario("proprietario", unidade=self.unidade_solicitante)
        self.outro_solicitante = criar_usuario("outro_solic", unidade=self.unidade_solicitante)
        self.admin_grupo = criar_usuario(
            "admin_grupo", unidade=self.unidade_admin, is_staff=True, perfil="admin"
        )
        self.admin_outro_grupo = criar_usuario(
            "admin_outro", unidade=self.unidade_outro_admin, is_staff=True, perfil="admin"
        )
        self.admin_master = criar_usuario(
            "admin_master", unidade=self.unidade_outro_admin, is_staff=True, perfil="admin_master"
        )
        self.grupo = GrupoContratacao.objects.create(
            nome="TIC", unidade_admin=self.unidade_admin
        )
        self.catalogo = ItemCatalogo.objects.create(
            tipo="material", nome="Notebook catalogado", descricao="Cat",
            grupo=self.grupo, unidade_medida="un", valor_estimado=Decimal("1000")
        )
        self.demanda = Demanda.objects.create(
            unidade=self.unidade_solicitante, usuario=self.proprietario,
            ano_referencia=2027, status=StatusDemanda.EM_ANDAMENTO
        )
        self.item_catalogado = ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=self.catalogo, tipo="material",
            nome="Notebook catalogado", descricao="Cat", unidade_medida="un",
            quantidade=1, valor_estimado=Decimal("1000"), valor_total=Decimal("1000"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        self.item_manual = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Item manual",
            descricao="Manual", unidade_medida="un", quantidade=1,
            valor_estimado=Decimal("500"), valor_total=Decimal("500"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )

    def test_politica_de_acesso_por_operacao_e_grupo_real(self):
        from apps.demandas.services import (
            OperacaoItemDemanda,
            OperacaoNaoPermitida,
            ItemNaoEncontrado,
            verificar_acesso_item_demanda,
        )

        casos = [
            (self.proprietario, self.item_catalogado, OperacaoItemDemanda.VISUALIZAR, None),
            (self.proprietario, self.item_catalogado, OperacaoItemDemanda.EDITAR, None),
            (self.proprietario, self.item_catalogado, OperacaoItemDemanda.REENVIAR, None),
            (self.outro_solicitante, self.item_catalogado, OperacaoItemDemanda.VISUALIZAR, ItemNaoEncontrado),
            (self.admin_grupo, self.item_catalogado, OperacaoItemDemanda.VISUALIZAR, None),
            (self.admin_grupo, self.item_catalogado, OperacaoItemDemanda.EDITAR, OperacaoNaoPermitida),
            (self.admin_grupo, self.item_catalogado, OperacaoItemDemanda.REENVIAR, OperacaoNaoPermitida),
            (self.admin_outro_grupo, self.item_catalogado, OperacaoItemDemanda.VISUALIZAR, ItemNaoEncontrado),
            (self.admin_master, self.item_catalogado, OperacaoItemDemanda.VISUALIZAR, None),
            (self.admin_master, self.item_catalogado, OperacaoItemDemanda.REENVIAR, OperacaoNaoPermitida),
            (self.admin_grupo, self.item_manual, OperacaoItemDemanda.VISUALIZAR, ItemNaoEncontrado),
            (self.admin_master, self.item_manual, OperacaoItemDemanda.VISUALIZAR, None),
        ]

        for usuario, item, operacao, erro in casos:
            with self.subTest(usuario=usuario.username, item=item.nome, operacao=operacao):
                if erro is None:
                    verificar_acesso_item_demanda(usuario=usuario, item=item, operacao=operacao)
                else:
                    with self.assertRaises(erro):
                        verificar_acesso_item_demanda(usuario=usuario, item=item, operacao=operacao)

    def test_api_admin_comum_nao_visualiza_item_manual(self):
        self.client.force_login(self.admin_grupo)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": self.item_manual.pk}))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_api_admin_do_grupo_visualiza_mas_nao_corrige_nem_reenvia(self):
        self.client.force_login(self.admin_grupo)
        self.assertEqual(
            self.client.get(reverse("api:item-detail", kwargs={"pk": self.item_catalogado.pk})).status_code,
            status.HTTP_200_OK,
        )
        patch_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item_catalogado.pk}),
            {"observacoes": "tentativa admin"}, format="json",
        )
        self.assertEqual(patch_resp.status_code, status.HTTP_403_FORBIDDEN)
        reenviar_resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item_catalogado.pk}))
        self.assertEqual(reenviar_resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_api_admin_de_outro_grupo_recebe_404(self):
        self.client.force_login(self.admin_outro_grupo)
        self.assertEqual(
            self.client.get(reverse("api:item-detail", kwargs={"pk": self.item_catalogado.pk})).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item_catalogado.pk})).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_api_proprietario_consegue_reenviar_item_devolvido_valido(self):
        self.client.force_login(self.proprietario)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item_catalogado.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.item_catalogado.refresh_from_db()
        self.assertEqual(self.item_catalogado.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)

    def test_api_outro_solicitante_recebe_404_ao_visualizar_editar_e_reenviar(self):
        self.client.force_login(self.outro_solicitante)
        detail_url = reverse("api:item-detail", kwargs={"pk": self.item_catalogado.pk})
        reenviar_url = reverse("api:item-reenviar", kwargs={"pk": self.item_catalogado.pk})
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            self.client.patch(detail_url, {"observacoes": "x"}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.post(reenviar_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_api_admin_master_visualiza_mas_nao_edita_nem_reenvia(self):
        self.client.force_login(self.admin_master)
        detail_url = reverse("api:item-detail", kwargs={"pk": self.item_catalogado.pk})
        reenviar_url = reverse("api:item-reenviar", kwargs={"pk": self.item_catalogado.pk})
        self.assertEqual(self.client.get(detail_url).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.patch(detail_url, {"observacoes": "admin master"}, format="json").status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(self.client.post(reenviar_url).status_code, status.HTTP_403_FORBIDDEN)


class ItemDevolvidoRedServicoSerializerTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade("RED")
        self.user = criar_usuario("red_user", unidade=self.unidade)
        self.admin = criar_usuario("red_admin", unidade=self.unidade, is_staff=True, perfil="admin")
        self.demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO
        )
        self.item = ItemDemanda.objects.create(
            demanda=self.demanda, tipo="material", nome="Item devolvido",
            descricao="Desc", unidade_medida="un", quantidade=2,
            valor_estimado=Decimal("50"), valor_total=Decimal("100"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )

    def snapshot_validacoes(self):
        from apps.validacoes.models import Validacao

        return list(
            Validacao.objects.filter(item_demanda=self.item)
            .order_by("id")
            .values("id", "item_demanda_id", "usuario_id", "acao", "comentario", "criado_em")
        )

    def test_reenviar_item_devolvido_servico_sucesso_e_repeticao(self):
        from apps.validacoes.models import Validacao
        from apps.demandas.services import TransicaoInvalida, reenviar_item_devolvido

        item = reenviar_item_devolvido(item_id=self.item.pk, usuario=self.user)
        self.assertEqual(item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.demanda.refresh_from_db()
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)
        validacoes_antes = list(Validacao.objects.filter(item_demanda=self.item).values())

        with self.assertRaises(TransicaoInvalida):
            reenviar_item_devolvido(item_id=self.item.pk, usuario=self.user)
        self.item.refresh_from_db()
        self.demanda.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.AGUARDANDO_VALIDACAO)
        self.assertEqual(self.demanda.status, StatusDemanda.AGUARDANDO_VALIDACAO)
        self.assertEqual(list(Validacao.objects.filter(item_demanda=self.item).values()), validacoes_antes)

    def test_reenviar_item_devolvido_servico_rollback_falha_sincronizacao(self):
        from apps.validacoes.models import Validacao, TipoAcao
        from apps.demandas.services import reenviar_item_devolvido

        validacao = Validacao.objects.create(
            item_demanda=self.item, usuario=self.admin,
            acao=TipoAcao.DEVOLVIDO, comentario="Corrigir"
        )
        item_atualizado_em = self.item.atualizado_em
        demanda_status = self.demanda.status
        demanda_atualizado_em = self.demanda.atualizado_em
        validacoes_antes = self.snapshot_validacoes()

        with mock.patch(
            "apps.demandas.services.sincronizar_status_macro_demanda",
            side_effect=RuntimeError("falha macro"),
        ):
            with self.assertRaises(RuntimeError):
                reenviar_item_devolvido(item_id=self.item.pk, usuario=self.user)

        self.item.refresh_from_db()
        self.demanda.refresh_from_db()
        validacao.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.DEVOLVIDA)
        self.assertEqual(self.item.atualizado_em, item_atualizado_em)
        self.assertEqual(self.demanda.status, demanda_status)
        self.assertEqual(self.demanda.atualizado_em, demanda_atualizado_em)
        self.assertEqual(validacao.comentario, "Corrigir")
        self.assertEqual(self.snapshot_validacoes(), validacoes_antes)

    def test_reenviar_api_demanda_concluida_e_cancelada_retorna_409(self):
        self.client.force_login(self.user)
        for demanda_status in [StatusDemanda.CONCLUIDA, StatusDemanda.CANCELADA]:
            with self.subTest(demanda_status=demanda_status):
                self.demanda.status = demanda_status
                self.demanda.save(update_fields=["status"])
                self.item.status = StatusItemDemanda.DEVOLVIDA
                self.item.save(update_fields=["status"])
                resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
                self.assertEqual(resp.status_code, status.HTTP_409_CONFLICT)

    def test_reenviar_api_item_status_incompativel_retorna_400(self):
        self.item.status = StatusItemDemanda.VALIDADA
        self.item.save(update_fields=["status"])
        self.client.force_login(self.user)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_reenviar_api_item_incompleto_retorna_erros_estruturados_por_campo(self):
        self.item.nome = ""
        self.item.quantidade = 0
        self.item.valor_estimado = Decimal("0")
        self.item.justificativa_necessidade = ""
        self.item.save()
        self.client.force_login(self.user)
        resp = self.client.post(reverse("api:item-reenviar", kwargs={"pk": self.item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nome", resp.data)
        self.assertIn("quantidade", resp.data)
        self.assertIn("valor_estimado", resp.data)
        self.assertIn("justificativa_necessidade", resp.data)
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, StatusItemDemanda.DEVOLVIDA)

    def test_patch_serializer_rejeita_campos_protegidos_desconhecidos_e_recalcula_total(self):
        self.client.force_login(self.user)
        protected_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"status": StatusItemDemanda.VALIDADA}, format="json",
        )
        self.assertEqual(protected_resp.status_code, status.HTTP_400_BAD_REQUEST)

        unknown_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"campo_inexistente": "x"}, format="json",
        )
        self.assertEqual(unknown_resp.status_code, status.HTTP_400_BAD_REQUEST)

        ok_resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {"quantidade": 3, "valor_estimado": "70.00"}, format="json",
        )
        self.assertEqual(ok_resp.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.valor_total, Decimal("210.00"))

    def test_patch_item_manual_permite_campos_manuais(self):
        self.client.force_login(self.user)
        resp = self.client.patch(
            reverse("api:item-detail", kwargs={"pk": self.item.pk}),
            {
                "tipo": "servico",
                "nome": "Servico manual corrigido",
                "descricao": "Descricao corrigida",
                "unidade_medida": "mes",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.tipo, "servico")
        self.assertEqual(self.item.nome, "Servico manual corrigido")
        self.assertEqual(self.item.descricao, "Descricao corrigida")
        self.assertEqual(self.item.unidade_medida, "mes")

    def test_patch_item_catalogado_bloqueia_campos_herdados(self):
        unidade_admin = criar_unidade("CATADM")
        grupo = GrupoContratacao.objects.create(nome="CAT", unidade_admin=unidade_admin)
        catalogo = ItemCatalogo.objects.create(
            tipo="material", nome="Catalogado", descricao="Catalogado",
            grupo=grupo, unidade_medida="un", valor_estimado=Decimal("30")
        )
        item_catalogado = ItemDemanda.objects.create(
            demanda=self.demanda, item_catalogo=catalogo, tipo="material",
            nome="Catalogado", descricao="Catalogado", unidade_medida="un",
            quantidade=1, valor_estimado=Decimal("30"), valor_total=Decimal("30"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        self.client.force_login(self.user)
        for campo, valor in {
            "tipo": "servico",
            "nome": "Outro nome",
            "descricao": "Outra descricao",
            "unidade_medida": "mes",
            "item_catalogo": None,
        }.items():
            with self.subTest(campo=campo):
                resp = self.client.patch(
                    reverse("api:item-detail", kwargs={"pk": item_catalogado.pk}),
                    {campo: valor}, format="json",
                )
                self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_put_item_demanda_retorna_405_para_todo_status(self):
        self.client.force_login(self.user)
        for item_status in [
            StatusItemDemanda.RASCUNHO,
            StatusItemDemanda.DEVOLVIDA,
            StatusItemDemanda.AGUARDANDO_VALIDACAO,
        ]:
            with self.subTest(item_status=item_status):
                self.item.status = item_status
                self.item.save(update_fields=["status"])
                resp = self.client.put(
                    reverse("api:item-detail", kwargs={"pk": self.item.pk}),
                    dados_item(nome="PUT rejeitado"), format="json",
                )
                self.assertEqual(resp.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class SincronizacaoMacroRedMatrizTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade("MAT")
        self.user = criar_usuario("mat_user", unidade=self.unidade)

    def criar_demanda(self, demanda_status=StatusDemanda.EM_ANDAMENTO, itens=None):
        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=demanda_status
        )
        for idx, item_status in enumerate(itens or []):
            ItemDemanda.objects.create(
                demanda=demanda, tipo="material", nome=f"Item {idx}",
                descricao="d", unidade_medida="un", quantidade=1,
                valor_estimado=Decimal("10"), valor_total=Decimal("10"),
                data_prevista=date(2027, 1, 1), prioridade="media",
                justificativa_prioridade="a", justificativa_necessidade="b",
                indicacao_orcamentaria="c", status=item_status,
            )
        return demanda

    def test_matriz_macro_com_cancelados_e_terminais(self):
        casos = [
            ("sem_itens", StatusDemanda.EM_ANDAMENTO, [], StatusDemanda.RASCUNHO),
            ("todos_cancelados_preserva", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.CANCELADA], StatusDemanda.EM_ANDAMENTO),
            ("cancelado_rascunho", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.CANCELADA, StatusItemDemanda.RASCUNHO], StatusDemanda.RASCUNHO),
            ("cancelado_aguardando", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.CANCELADA, StatusItemDemanda.AGUARDANDO_VALIDACAO], StatusDemanda.AGUARDANDO_VALIDACAO),
            ("todos_devolvidos", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.DEVOLVIDA, StatusItemDemanda.DEVOLVIDA], StatusDemanda.EM_ANDAMENTO),
            ("todos_validados", StatusDemanda.AGUARDANDO_VALIDACAO, [StatusItemDemanda.VALIDADA], StatusDemanda.EM_ANDAMENTO),
            ("todos_vinculados", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.VINCULADA_DFD], StatusDemanda.CONCLUIDA),
            ("aguardando_validado", StatusDemanda.AGUARDANDO_VALIDACAO, [StatusItemDemanda.AGUARDANDO_VALIDACAO, StatusItemDemanda.VALIDADA], StatusDemanda.EM_ANDAMENTO),
            ("validado_vinculado", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.VALIDADA, StatusItemDemanda.VINCULADA_DFD], StatusDemanda.EM_ANDAMENTO),
            ("devolvido_vinculado", StatusDemanda.EM_ANDAMENTO, [StatusItemDemanda.DEVOLVIDA, StatusItemDemanda.VINCULADA_DFD], StatusDemanda.EM_ANDAMENTO),
            ("terminal_concluida", StatusDemanda.CONCLUIDA, [StatusItemDemanda.RASCUNHO], StatusDemanda.CONCLUIDA),
            ("terminal_cancelada", StatusDemanda.CANCELADA, [StatusItemDemanda.VINCULADA_DFD], StatusDemanda.CANCELADA),
        ]
        for nome, demanda_status, itens, esperado in casos:
            with self.subTest(nome=nome):
                demanda = self.criar_demanda(demanda_status, itens)
                aplicado = sincronizar_status_macro_demanda(demanda)
                demanda.refresh_from_db()
                self.assertEqual(aplicado, esperado)
                self.assertEqual(demanda.status, esperado)


class ParecerQueriesRedTests(APITestCase):
    def setUp(self):
        self.unidade = criar_unidade("QRY")
        self.user = criar_usuario("qry_user", unidade=self.unidade)
        self.admin = criar_usuario("qry_admin", unidade=self.unidade, is_staff=True, perfil="admin")

    def criar_demanda_com_devolucoes(self, quantidade):
        from apps.validacoes.models import Validacao, TipoAcao

        demanda = Demanda.objects.create(
            unidade=self.unidade, usuario=self.user, ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO
        )
        for idx in range(quantidade):
            item = ItemDemanda.objects.create(
                demanda=demanda, tipo="material", nome=f"Item {idx}",
                descricao="d", unidade_medida="un", quantidade=1,
                valor_estimado=Decimal("10"), valor_total=Decimal("10"),
                data_prevista=date(2027, 1, 1), prioridade="media",
                justificativa_prioridade="a", justificativa_necessidade="b",
                indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
            )
            Validacao.objects.create(
                item_demanda=item, usuario=self.admin,
                acao=TipoAcao.VALIDADO, comentario="Aprovacao ignorada"
            )
            Validacao.objects.create(
                item_demanda=item, usuario=self.admin,
                acao=TipoAcao.DEVOLVIDO, comentario=f"Devolucao {idx}"
            )
        return demanda

    def test_ultima_devolucao_usa_acao_devolvido_ordenada_por_criado_em_e_id(self):
        from datetime import timezone as dt_timezone
        from apps.validacoes.models import Validacao, TipoAcao

        demanda = self.criar_demanda_com_devolucoes(0)
        item = ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item parecer",
            descricao="d", unidade_medida="un", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        from datetime import datetime
        momento_antigo = datetime(2026, 1, 1, 12, 0, tzinfo=dt_timezone.utc)
        momento_novo = datetime(2026, 1, 2, 12, 0, tzinfo=dt_timezone.utc)
        antigo = Validacao.objects.create(
            item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO,
            comentario="Devolucao antiga"
        )
        novo_id_menor = Validacao.objects.create(
            item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO,
            comentario="Devolucao nova id menor"
        )
        novo_id_maior = Validacao.objects.create(
            item_demanda=item, usuario=self.admin, acao=TipoAcao.DEVOLVIDO,
            comentario="Devolucao nova id maior"
        )
        Validacao.objects.filter(pk=antigo.pk).update(criado_em=momento_antigo)
        Validacao.objects.filter(pk__in=[novo_id_menor.pk, novo_id_maior.pk]).update(criado_em=momento_novo)

        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["ultima_devolucao"]["id"], novo_id_maior.pk)
        self.assertEqual(resp.data["ultima_devolucao"]["comentario"], "Devolucao nova id maior")

    def test_validacoes_diferentes_de_devolvido_sao_ignoradas(self):
        from apps.validacoes.models import Validacao, TipoAcao

        demanda = self.criar_demanda_com_devolucoes(0)
        item = ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item aprovado",
            descricao="d", unidade_medida="un", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        Validacao.objects.create(
            item_demanda=item, usuario=self.admin, acao=TipoAcao.VALIDADO,
            comentario="Nao deve aparecer"
        )
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data["ultima_devolucao"])
        self.assertEqual(resp.data["justificativa_devolucao"], "")

    def test_ausencia_de_devolucao_retorna_ultima_devolucao_nula(self):
        demanda = self.criar_demanda_com_devolucoes(0)
        item = ItemDemanda.objects.create(
            demanda=demanda, tipo="material", nome="Item sem parecer",
            descricao="d", unidade_medida="un", quantidade=1,
            valor_estimado=Decimal("10"), valor_total=Decimal("10"),
            data_prevista=date(2027, 1, 1), prioridade="media",
            justificativa_prioridade="a", justificativa_necessidade="b",
            indicacao_orcamentaria="c", status=StatusItemDemanda.DEVOLVIDA,
        )
        self.client.force_login(self.user)
        resp = self.client.get(reverse("api:item-detail", kwargs={"pk": item.pk}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data["ultima_devolucao"])

    def test_detail_queries_estaveis_com_1_e_10_itens(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        demanda_1 = self.criar_demanda_com_devolucoes(1)
        demanda_10 = self.criar_demanda_com_devolucoes(10)
        self.client.force_login(self.user)

        with CaptureQueriesContext(connection) as ctx1:
            resp1 = self.client.get(reverse("api:demanda-detail", kwargs={"pk": demanda_1.pk}))
        with CaptureQueriesContext(connection) as ctx10:
            resp10 = self.client.get(reverse("api:demanda-detail", kwargs={"pk": demanda_10.pk}))

        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp10.status_code, status.HTTP_200_OK)
        self.assertEqual(len(ctx1), len(ctx10))

    def test_list_queries_estaveis_com_1_e_10_demandas(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext

        self.criar_demanda_com_devolucoes(1)
        self.client.force_login(self.user)
        with CaptureQueriesContext(connection) as ctx1:
            resp1 = self.client.get(reverse("api:demanda-list"))

        for _ in range(9):
            self.criar_demanda_com_devolucoes(1)
        with CaptureQueriesContext(connection) as ctx10:
            resp10 = self.client.get(reverse("api:demanda-list"))

        self.assertEqual(resp1.status_code, status.HTTP_200_OK)
        self.assertEqual(resp10.status_code, status.HTTP_200_OK)
        self.assertEqual(len(ctx1), len(ctx10))
