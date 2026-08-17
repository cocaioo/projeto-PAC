from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
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


Usuario = get_user_model()


class AutorizacaoEscopoBase(APITestCase):
    def setUp(self):
        self.unidade_admin_a = self._unidade("ADA")
        self.unidade_admin_b = self._unidade("ADB")
        self.unidade_usuario_a = self._unidade("USA")
        self.unidade_usuario_b = self._unidade("USB")

        self.admin_a = self._usuario(
            "admin_a_escopo", self.unidade_admin_a, perfil="admin"
        )
        self.admin_b = self._usuario(
            "admin_b_escopo", self.unidade_admin_b, perfil="admin"
        )
        self.admin_master = self._usuario(
            "admin_master_escopo", None, perfil="admin_master"
        )
        self.usuario_a = self._usuario("usuario_a_escopo", self.unidade_usuario_a)
        self.usuario_b = self._usuario("usuario_b_escopo", self.unidade_usuario_b)

        self.grupo_a = GrupoContratacao.objects.create(
            nome="Grupo de escopo A", unidade_admin=self.unidade_admin_a
        )
        self.grupo_b = GrupoContratacao.objects.create(
            nome="Grupo de escopo B", unidade_admin=self.unidade_admin_b
        )
        self.catalogo_a = self._catalogo("AUT-A", self.grupo_a)
        self.catalogo_b = self._catalogo("AUT-B", self.grupo_b)

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
            email=f"{username}@example.invalid",
            siape=f"SIAPE-{username}",
            unidade=unidade,
            perfil=perfil,
            is_staff=perfil != "usuario",
        )

    @staticmethod
    def _catalogo(codigo, grupo, nome=None):
        return ItemCatalogo.objects.create(
            tipo="material",
            nome=nome or f"Catalogo {codigo}",
            descricao="Item para teste de autorizacao",
            codigo_catmat_catser=codigo,
            grupo=grupo,
            unidade_medida="unidade",
            valor_estimado=Decimal("100.00"),
        )

    @staticmethod
    def _demanda(usuario, observacao):
        return Demanda.objects.create(
            unidade=usuario.unidade,
            usuario=usuario,
            ano_referencia=2027,
            status=StatusDemanda.EM_ANDAMENTO,
            observacao=observacao,
        )

    @staticmethod
    def _item(
        demanda,
        nome,
        catalogo=None,
        valor=Decimal("100.00"),
        status_item=StatusItemDemanda.AGUARDANDO_VALIDACAO,
    ):
        return ItemDemanda.objects.create(
            demanda=demanda,
            item_catalogo=catalogo,
            tipo="material",
            nome=nome,
            descricao="Descricao para teste de autorizacao",
            unidade_medida="unidade",
            quantidade=1,
            valor_estimado=valor,
            valor_total=valor,
            data_prevista=date(2027, 6, 30),
            prioridade="media",
            justificativa_prioridade="",
            justificativa_necessidade="Necessidade institucional",
            indicacao_orcamentaria="Orcamento de teste",
            status=status_item,
        )

    def _login(self, usuario):
        self.client.force_login(usuario)


class RecursosReferenciaAutorizacaoTests(AutorizacaoEscopoBase):
    def test_unidade_tem_leitura_autenticada_e_escrita_exclusiva_do_master(self):
        url_lista = reverse("api:unidade-list")

        self._login(self.usuario_a)
        self.assertEqual(self.client.get(url_lista).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(
                url_lista,
                {"nome": "Negada", "sigla": "NEG-U", "codigo": "NEG-U"},
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self._login(self.admin_a)
        self.assertEqual(
            self.client.patch(
                reverse("api:unidade-detail", kwargs={"pk": self.unidade_usuario_a.pk}),
                {"nome": "Alteracao negada"},
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self._login(self.admin_master)
        criada = self.client.post(
            url_lista,
            {"nome": "Unidade criada pelo master", "sigla": "MAS-U", "codigo": "MAS-U"},
        )
        self.assertEqual(criada.status_code, status.HTTP_201_CREATED)
        detalhe = reverse("api:unidade-detail", kwargs={"pk": criada.data["id"]})
        self.assertEqual(
            self.client.patch(detalhe, {"nome": "Unidade atualizada"}).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(self.client.delete(detalhe).status_code, status.HTTP_204_NO_CONTENT)

    def test_grupo_tem_leitura_autenticada_e_escrita_exclusiva_do_master(self):
        url_lista = reverse("api:grupo-list")
        payload = {
            "nome": "Grupo temporario",
            "descricao": "Teste",
            "unidade_admin": self.unidade_admin_a.pk,
            "ativo": True,
        }

        self._login(self.usuario_a)
        self.assertEqual(self.client.get(url_lista).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(url_lista, payload).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self._login(self.admin_a)
        self.assertEqual(
            self.client.patch(
                reverse("api:grupo-detail", kwargs={"pk": self.grupo_a.pk}),
                {"descricao": "Alteracao negada"},
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self._login(self.admin_master)
        criado = self.client.post(url_lista, payload)
        self.assertEqual(criado.status_code, status.HTTP_201_CREATED)
        detalhe = reverse("api:grupo-detail", kwargs={"pk": criado.data["id"]})
        self.assertEqual(
            self.client.patch(detalhe, {"descricao": "Atualizado"}).status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(self.client.delete(detalhe).status_code, status.HTTP_204_NO_CONTENT)


class CatalogoEscopoEscritaTests(AutorizacaoEscopoBase):
    @staticmethod
    def _payload_catalogo(grupo_id, codigo):
        return {
            "tipo": "material",
            "nome": f"Item {codigo}",
            "descricao": "Item criado no teste",
            "codigo_catmat_catser": codigo,
            "grupo": grupo_id,
            "unidade_medida": "unidade",
            "valor_estimado": "250.00",
            "ativo": True,
        }

    def test_admin_so_cria_no_grupo_administrado_por_sua_unidade(self):
        self._login(self.admin_a)

        permitido = self.client.post(
            reverse("api:catalogo-list"),
            self._payload_catalogo(self.grupo_a.pk, "AUT-NOVO-A"),
        )
        negado = self.client.post(
            reverse("api:catalogo-list"),
            self._payload_catalogo(self.grupo_b.pk, "AUT-NOVO-B"),
        )

        self.assertEqual(permitido.status_code, status.HTTP_201_CREATED)
        self.assertEqual(negado.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(
            ItemCatalogo.objects.filter(codigo_catmat_catser="AUT-NOVO-B").exists()
        )

    def test_admin_nao_altera_move_desativa_ou_exclui_item_fora_do_escopo(self):
        self._login(self.admin_a)
        detalhe_fora = reverse(
            "api:catalogo-detail", kwargs={"pk": self.catalogo_b.pk}
        )

        self.assertEqual(
            self.client.patch(detalhe_fora, {"nome": "Invasao"}).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.post(
                reverse("api:catalogo-desativar", kwargs={"pk": self.catalogo_b.pk})
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.delete(detalhe_fora).status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertEqual(
            self.client.patch(
                reverse("api:catalogo-detail", kwargs={"pk": self.catalogo_a.pk}),
                {"grupo": self.grupo_b.pk},
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.catalogo_a.refresh_from_db()
        self.catalogo_b.refresh_from_db()
        self.assertEqual(self.catalogo_a.grupo, self.grupo_a)
        self.assertEqual(self.catalogo_b.nome, "Catalogo AUT-B")
        self.assertTrue(self.catalogo_b.ativo)

    def test_admin_master_gerencia_catalogo_globalmente(self):
        self._login(self.admin_master)
        detalhe = reverse("api:catalogo-detail", kwargs={"pk": self.catalogo_b.pk})

        alterado = self.client.patch(detalhe, {"nome": "Item global"})
        desativado = self.client.post(
            reverse("api:catalogo-desativar", kwargs={"pk": self.catalogo_b.pk})
        )

        self.assertEqual(alterado.status_code, status.HTTP_200_OK)
        self.assertEqual(desativado.status_code, status.HTTP_200_OK)
        self.assertEqual(desativado.data["nome"], "Item global")
        self.assertFalse(desativado.data["ativo"])


class DemandaEscopoAdministrativoTests(AutorizacaoEscopoBase):
    def setUp(self):
        super().setUp()
        self.demanda_usuario_a = self._demanda(self.usuario_a, "Propria do usuario A")
        self._item(self.demanda_usuario_a, "Fora de A", self.catalogo_b)

        self.demanda_grupo_a = self._demanda(self.usuario_b, "No grupo A")
        self._item(self.demanda_grupo_a, "Item A", self.catalogo_a)

        self.demanda_grupo_b = self._demanda(self.usuario_b, "No grupo B")
        self._item(self.demanda_grupo_b, "Item B", self.catalogo_b)

        self.demanda_propria_admin = self._demanda(self.admin_a, "Propria do admin")
        self._item(self.demanda_propria_admin, "Item proprio B", self.catalogo_b)

        self.demanda_mista = self._demanda(self.usuario_b, "Demanda mista")
        self.item_misto_a = self._item(
            self.demanda_mista, "Item misto A", self.catalogo_a
        )
        self.item_misto_b = self._item(
            self.demanda_mista,
            "Item misto B",
            self._catalogo("AUT-B-2", self.grupo_b),
        )

        self.demanda_manual = self._demanda(self.usuario_b, "Somente manual")
        self._item(self.demanda_manual, "Item manual")

    def _ids_listados(self, usuario):
        self._login(usuario)
        resposta = self.client.get(reverse("api:demanda-list"))
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        return {demanda["id"] for demanda in resposta.data["results"]}

    def test_usuario_comum_lista_e_detalha_somente_as_proprias_demandas(self):
        self.assertEqual(
            self._ids_listados(self.usuario_a), {self.demanda_usuario_a.pk}
        )

        fora = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_grupo_a.pk})
        )
        self.assertEqual(fora.status_code, status.HTTP_404_NOT_FOUND)

        self.assertEqual(
            self._ids_listados(self.usuario_b),
            {
                self.demanda_grupo_a.pk,
                self.demanda_grupo_b.pk,
                self.demanda_mista.pk,
                self.demanda_manual.pk,
            },
        )
        propria_mista = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_mista.pk})
        )
        self.assertEqual(
            {item["id"] for item in propria_mista.data["itens"]},
            {self.item_misto_a.pk, self.item_misto_b.pk},
        )

    def test_admin_lista_proprias_e_demandas_com_ao_menos_um_item_do_seu_grupo(self):
        self.assertEqual(
            self._ids_listados(self.admin_a),
            {
                self.demanda_grupo_a.pk,
                self.demanda_propria_admin.pk,
                self.demanda_mista.pk,
            },
        )

        permitida = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_mista.pk})
        )
        fora = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_grupo_b.pk})
        )
        manual = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_manual.pk})
        )
        self.assertEqual(permitida.status_code, status.HTTP_200_OK)
        self.assertEqual(fora.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(manual.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            {item["id"] for item in permitida.data["itens"]},
            {self.item_misto_a.pk},
        )
        self.assertEqual(Decimal(permitida.data["valor_total"]), Decimal("100.00"))

        itens = self.client.get(
            reverse("api:demanda-itens", kwargs={"pk": self.demanda_mista.pk})
        )
        self.assertEqual(itens.status_code, status.HTTP_200_OK)
        self.assertEqual({item["id"] for item in itens.data}, {self.item_misto_a.pk})

    def test_admin_nao_cancela_demanda_totalmente_fora_do_escopo(self):
        self._login(self.admin_a)
        resposta = self.client.post(
            reverse("api:demanda-cancelar", kwargs={"pk": self.demanda_grupo_b.pk})
        )

        self.assertEqual(resposta.status_code, status.HTTP_404_NOT_FOUND)
        self.demanda_grupo_b.refresh_from_db()
        self.assertNotEqual(self.demanda_grupo_b.status, StatusDemanda.CANCELADA)

    def test_admin_nao_cancela_demanda_mista_com_itens_fora_do_escopo(self):
        self._login(self.admin_a)
        resposta = self.client.post(
            reverse("api:demanda-cancelar", kwargs={"pk": self.demanda_mista.pk})
        )

        self.assertEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)
        self.demanda_mista.refresh_from_db()
        self.item_misto_a.refresh_from_db()
        self.item_misto_b.refresh_from_db()
        self.assertNotEqual(self.demanda_mista.status, StatusDemanda.CANCELADA)
        self.assertNotEqual(self.item_misto_a.status, StatusItemDemanda.CANCELADA)
        self.assertNotEqual(self.item_misto_b.status, StatusItemDemanda.CANCELADA)

    def test_admin_pode_cancelar_demanda_composta_so_por_seu_grupo(self):
        self._login(self.admin_a)
        resposta = self.client.post(
            reverse("api:demanda-cancelar", kwargs={"pk": self.demanda_grupo_a.pk})
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.demanda_grupo_a.refresh_from_db()
        self.assertEqual(self.demanda_grupo_a.status, StatusDemanda.CANCELADA)
        self.assertTrue(
            all(
                item.status == StatusItemDemanda.CANCELADA
                for item in self.demanda_grupo_a.itens.all()
            )
        )

    def test_admin_master_lista_e_detalha_todas_as_demandas(self):
        esperadas = {
            self.demanda_usuario_a.pk,
            self.demanda_grupo_a.pk,
            self.demanda_grupo_b.pk,
            self.demanda_propria_admin.pk,
            self.demanda_mista.pk,
            self.demanda_manual.pk,
        }
        self.assertEqual(self._ids_listados(self.admin_master), esperadas)
        detalhe = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_manual.pk})
        )
        self.assertEqual(detalhe.status_code, status.HTTP_200_OK)
        mista = self.client.get(
            reverse("api:demanda-detail", kwargs={"pk": self.demanda_mista.pk})
        )
        self.assertEqual(
            {item["id"] for item in mista.data["itens"]},
            {self.item_misto_a.pk, self.item_misto_b.pk},
        )


class DashboardEscopoTests(AutorizacaoEscopoBase):
    def setUp(self):
        super().setUp()
        demanda_usuario = self._demanda(self.usuario_a, "Dashboard usuario")
        item_usuario = self._item(
            demanda_usuario,
            "Item proprio fora do grupo A",
            self.catalogo_b,
            Decimal("100.00"),
            StatusItemDemanda.VINCULADA_DFD,
        )

        demanda_escopo = self._demanda(self.usuario_b, "Dashboard grupo A")
        item_escopo = self._item(
            demanda_escopo,
            "Item do grupo A",
            self.catalogo_a,
            Decimal("200.00"),
            StatusItemDemanda.VINCULADA_DFD,
        )

        demanda_fora = self._demanda(self.usuario_b, "Dashboard grupo B")
        item_fora = self._item(
            demanda_fora,
            "Item do grupo B",
            self.catalogo_b,
            Decimal("300.00"),
            StatusItemDemanda.VINCULADA_DFD,
        )
        self._item(
            demanda_fora,
            "Item manual fora",
            valor=Decimal("500.00"),
            status_item=StatusItemDemanda.DEVOLVIDA,
        )

        demanda_admin = self._demanda(self.admin_a, "Dashboard proprio admin")
        item_admin = self._item(
            demanda_admin,
            "Item proprio do admin fora do grupo A",
            self._catalogo("AUT-B-ADMIN", self.grupo_b),
            Decimal("400.00"),
            StatusItemDemanda.VINCULADA_DFD,
        )

        self._vincular_dfd("DFD-AUT-1", item_usuario, self.grupo_b)
        self._vincular_dfd("DFD-AUT-2", item_escopo, self.grupo_a)
        self._vincular_dfd("DFD-AUT-3", item_fora, self.grupo_b)
        self._vincular_dfd("DFD-AUT-4", item_admin, self.grupo_b)

    def _vincular_dfd(self, numero, item, grupo):
        dfd = DFD.objects.create(
            numero=numero,
            grupo=grupo,
            ciclo_pac=item.demanda.ciclo_pac,
            criado_por=self.admin_master,
        )
        item.dfd = dfd
        item.save(update_fields=["dfd"])
        dfd.itens_demanda.add(item)

    def _stats(self, usuario):
        self._login(usuario)
        resposta = self.client.get(reverse("api:dashboard-stats"))
        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        return resposta.data

    def test_usuario_ve_somente_indicadores_dos_proprios_dados(self):
        dados = self._stats(self.usuario_a)

        self.assertEqual(dados["total_demandas"], 1)
        self.assertEqual(dados["total_itens"], 1)
        self.assertEqual(Decimal(dados["valor_total_estimado"]), Decimal("100.00"))
        self.assertEqual(dados["consolidados"], 1)
        self.assertEqual(dados["total_dfds"], 1)

    def test_admin_ve_grupos_administrados_mais_os_proprios_dados(self):
        dados = self._stats(self.admin_a)

        self.assertEqual(dados["total_demandas"], 2)
        self.assertEqual(dados["total_itens"], 2)
        self.assertEqual(Decimal(dados["valor_total_estimado"]), Decimal("600.00"))
        self.assertEqual(dados["consolidados"], 2)
        self.assertEqual(dados["total_dfds"], 2)

    def test_admin_master_ve_indicadores_globais(self):
        dados = self._stats(self.admin_master)

        self.assertEqual(dados["total_demandas"], 4)
        self.assertEqual(dados["total_itens"], 5)
        self.assertEqual(Decimal(dados["valor_total_estimado"]), Decimal("1500.00"))
        self.assertEqual(dados["consolidados"], 4)
        self.assertEqual(dados["total_dfds"], 4)
