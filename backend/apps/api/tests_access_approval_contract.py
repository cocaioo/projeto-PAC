from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil, SolicitacaoAcesso, StatusSolicitacao


User = get_user_model()


class AccessApprovalContractTests(APITestCase):
    """Contract tests for the real HTTP approval flow used by the SPA.

    These tests intentionally live in a new module so they do not overlap with
    the feature agents' unit-test files.  The approval payload is the contract
    emitted by ``AdminUsuarios``: ``perfil`` plus the selected group ids.
    """

    def setUp(self):
        self.requester_unit = Unidade.objects.create(
            nome="Unidade Solicitante do Contrato",
            sigla="USC",
            codigo="USC-INT",
            ativo=True,
        )
        self.admin_unit = Unidade.objects.create(
            nome="Unidade Administradora do Contrato",
            sigla="UAC",
            codigo="UAC-INT",
            ativo=True,
        )
        self.group = GrupoContratacao.objects.create(
            nome="Grupo de Contratação do Contrato",
            descricao="Grupo usado no contrato HTTP de aprovação.",
            unidade_admin=self.admin_unit,
            ativo=True,
        )
        self.admin_master = User.objects.create_user(
            username="master-approval-contract",
            email="master-approval-contract@ufpi.edu.br",
            password="MasterPassword123!",
            first_name="Master de Integração",
            perfil=Perfil.ADMIN_MASTER,
            unidade=self.admin_unit,
            is_active=True,
        )

    def _create_request(self, email="solicitante-approval-contract@ufpi.edu.br"):
        response = self.client.post(
            reverse("api:solicitar-acesso"),
            {
                "nome_completo": "Solicitante do Contrato",
                "email": email,
                "unidade_id": self.requester_unit.pk,
                "senha": "SenhaSolicitante123!",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return SolicitacaoAcesso.objects.get(email=email)

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_admin_master_aprova_com_perfil_e_grupo_escolhidos(self, mock_email):
        solicitacao = self._create_request()
        self.client.force_login(self.admin_master)

        response = self.client.post(
            reverse("api:admin-aprovar", kwargs={"pk": solicitacao.pk}),
            {
                "perfil": Perfil.ADMIN,
                "grupos_administrados": [self.group.pk],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        usuario = User.objects.get(email=solicitacao.email)
        self.assertEqual(usuario.perfil, Perfil.ADMIN)
        self.assertTrue(
            usuario.grupos_administrados.filter(pk=self.group.pk).exists()
        )

        solicitacao.refresh_from_db()
        self.assertEqual(solicitacao.status, StatusSolicitacao.APROVADO)
        self.assertEqual(solicitacao.usuario_criado_id, usuario.pk)
        mock_email.assert_called_once()

    def test_lista_de_solicitacoes_nao_expoe_hash_da_senha(self):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Solicitante sem vazamento",
            email="sem-vazamento@ufpi.edu.br",
            unidade=self.requester_unit,
            senha_hash="pbkdf2_sha256$600000$secret$hash",
            status=StatusSolicitacao.PENDENTE,
        )
        self.client.force_login(self.admin_master)

        response = self.client.get(
            reverse("api:admin-solicitacoes"),
            {"status": StatusSolicitacao.PENDENTE},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next(entry for entry in response.data if entry["id"] == solicitacao.pk)
        self.assertNotIn("senha_hash", item)
