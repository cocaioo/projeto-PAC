from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil


Usuario = get_user_model()


class UsuarioAutenticadoViewTests(APITestCase):
    def setUp(self):
        self.unidade_admin = Unidade.objects.create(
            nome="Superintendencia de TI",
            sigla="STI",
            codigo="STI-01",
        )
        self.unidade_solicitante = Unidade.objects.create(
            nome="Biblioteca Central",
            sigla="BCE",
            codigo="BCE-01",
        )
        self.grupo_tic = GrupoContratacao.objects.create(
            nome="TIC",
            unidade_admin=self.unidade_admin,
        )
        self.grupo_software = GrupoContratacao.objects.create(
            nome="Software e Licencas",
            unidade_admin=self.unidade_admin,
        )
        self.outro_grupo = GrupoContratacao.objects.create(
            nome="Obras",
            unidade_admin=self.unidade_solicitante,
        )
        self.admin = Usuario.objects.create_user(
            username="admin.sti",
            password="senha-segura",
            email="admin.sti@ufpi.edu.br",
            first_name="Admin",
            last_name="STI",
            siape="1001",
            unidade=self.unidade_admin,
            perfil=Perfil.ADMIN,
        )
        self.usuario = Usuario.objects.create_user(
            username="usuario.bce",
            password="senha-segura",
            email="usuario.bce@ufpi.edu.br",
            first_name="Usuario",
            last_name="BCE",
            siape="2002",
            unidade=self.unidade_solicitante,
            perfil=Perfil.USUARIO,
        )
        self.admin_master = Usuario.objects.create_user(
            username="master",
            password="senha-segura",
            email="master@ufpi.edu.br",
            first_name="Admin",
            last_name="Master",
            siape="3003",
            perfil=Perfil.ADMIN_MASTER,
        )

    def test_rejeita_usuario_nao_autenticado(self):
        resposta = self.client.get(reverse("api:me"))
        self.assertEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)

    def test_retorna_apenas_os_dados_do_usuario_autenticado(self):
        self.client.force_login(self.usuario)
        resposta = self.client.get(
            reverse("api:me"),
            {"id": self.admin.id},
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["id"], self.usuario.id)
        self.assertEqual(resposta.data["username"], "usuario.bce")
        self.assertEqual(resposta.data["email"], "usuario.bce@ufpi.edu.br")
        self.assertNotEqual(resposta.data["id"], self.admin.id)

    def test_retorna_contexto_de_autorizacao_do_admin_baseado_na_unidade(self):
        self.client.force_login(self.admin)
        resposta = self.client.get(reverse("api:me"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["perfil"], Perfil.ADMIN)
        self.assertEqual(resposta.data["perfil_display"], "Admin")
        self.assertEqual(resposta.data["status_conta"], "ativa")
        self.assertEqual(
            resposta.data["unidade_detalhe"],
            {
                "id": self.unidade_admin.id,
                "nome": "Superintendencia de TI",
                "sigla": "STI",
                "codigo": "STI-01",
                "ativo": True,
            },
        )
        self.assertFalse(resposta.data["escopo_administrativo_global"])
        self.assertEqual(
            [grupo["nome"] for grupo in resposta.data["grupos_administrados"]],
            ["Software e Licencas", "TIC"],
        )
        self.assertEqual(
            [grupo["id"] for grupo in resposta.data["grupos_associados"]],
            [self.grupo_software.id, self.grupo_tic.id],
        )
        self.assertNotIn(
            self.outro_grupo.id,
            [grupo["id"] for grupo in resposta.data["grupos_administrados"]],
        )

    def test_usuario_comum_nao_recebe_grupos_administrados(self):
        self.client.force_login(self.usuario)
        resposta = self.client.get(reverse("api:me"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["perfil"], Perfil.USUARIO)
        self.assertEqual(resposta.data["grupos_administrados"], [])
        self.assertEqual(resposta.data["grupos_associados"], [])

    def test_admin_master_recebe_escopo_global_sem_expor_outro_usuario(self):
        self.client.force_login(self.admin_master)
        resposta = self.client.get(reverse("api:me"))

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertEqual(resposta.data["perfil"], Perfil.ADMIN_MASTER)
        self.assertTrue(resposta.data["escopo_administrativo_global"])
        self.assertEqual(resposta.data["grupos_administrados"], [])
        self.assertEqual(resposta.data["grupos_associados"], [])
