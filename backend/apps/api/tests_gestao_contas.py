from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from unittest.mock import patch
from apps.usuarios.models import SolicitacaoAcesso, StatusSolicitacao, Perfil
from apps.unidades.models import Unidade

User = get_user_model()

class GestaoContasTestCase(APITestCase):
    def setUp(self):
        self.unidade = Unidade.objects.create(nome="Unidade Teste", sigla="UT", ativo=True)
        self.admin_master = User.objects.create(
            username="admin_master",
            email="admin_master@ufpi.edu.br",
            first_name="Admin Master",
            perfil=Perfil.ADMIN_MASTER,
            unidade=self.unidade,
            is_active=True
        )
        self.admin_master.set_password("admin_senha")
        self.admin_master.save()
        
        self.comum_user = User.objects.create(
            username="comum",
            email="comum@ufpi.edu.br",
            first_name="Comum",
            perfil=Perfil.USUARIO,
            unidade=self.unidade,
            is_active=True
        )
        self.comum_user.set_password("comum_senha")
        self.comum_user.save()

    def test_solicitar_acesso_valido(self):
        data = {
            "nome_completo": "Novo Usuario",
            "email": "novo@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura"
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        
        solicitacao = SolicitacaoAcesso.objects.get(email="novo@ufpi.edu.br")
        self.assertEqual(solicitacao.status, StatusSolicitacao.PENDENTE)
        self.assertTrue(solicitacao.senha_hash != "senha_segura")

    def test_solicitar_acesso_dominio_invalido(self):
        data = {
            "nome_completo": "Novo Usuario",
            "email": "novo@gmail.com",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura"
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_duplicidade_solicitacao(self):
        SolicitacaoAcesso.objects.create(
            nome_completo="Novo Usuario",
            email="novo@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="hash",
            status=StatusSolicitacao.PENDENTE
        )
        data = {
            "nome_completo": "Outro",
            "email": "novo@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura"
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_aprovar_solicitacao(self, mock_email):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Aprovado User",
            email="aprovado@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        
        solicitacao.refresh_from_db()
        self.assertEqual(solicitacao.status, StatusSolicitacao.APROVADO)
        
        usuario = User.objects.get(email="aprovado@ufpi.edu.br")
        self.assertTrue(usuario.is_active)
        self.assertEqual(usuario.perfil, Perfil.USUARIO)
        mock_email.assert_called_once()

    @patch("apps.usuarios.services.enviar_email_rejeicao")
    def test_rejeitar_solicitacao(self, mock_email):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Rejeitado User",
            email="rejeitado@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-rejeitar", kwargs={"pk": solicitacao.id})
        data = {"justificativa": "Sem justificativa"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 200)
        
        solicitacao.refresh_from_db()
        self.assertEqual(solicitacao.status, StatusSolicitacao.REJEITADO)
        mock_email.assert_called_once()

    def test_autorizacao_acesso_admin(self):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="User",
            email="user@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE
        )
        self.client.force_login(self.comum_user)
        url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)

    def test_criar_usuario_admin(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")
        data = {
            "nome_completo": "Novo Admin",
            "email": "novo_admin@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.ADMIN,
            "senha_temporaria": "temp_senha"
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)
        
        novo_admin = User.objects.get(email="novo_admin@ufpi.edu.br")
        self.assertTrue(novo_admin.precisa_trocar_senha)
        self.assertEqual(novo_admin.perfil, Perfil.ADMIN)

    def test_protecao_desativar_ultimo_admin_master(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-status", kwargs={"pk": self.admin_master.id})
        data = {"is_active": False}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, 400)
        
        self.admin_master.refresh_from_db()
        self.assertTrue(self.admin_master.is_active)
