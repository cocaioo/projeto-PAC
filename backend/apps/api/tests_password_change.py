import json

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


Usuario = get_user_model()


class TrocaObrigatoriaDeSenhaTests(APITestCase):
    senha_temporaria = "Temporaria#2026"

    def setUp(self):
        self.usuario_temporario = Usuario.objects.create_user(
            username="usuario.temporario",
            email="usuario.temporario@ufpi.edu.br",
            password=self.senha_temporaria,
            first_name="Usuario Temporario",
            precisa_trocar_senha=True,
        )
        self.login_url = reverse("api:login")
        self.me_url = reverse("api:me")
        self.logout_url = reverse("api:logout")
        self.change_password_url = reverse("api:change-password")
        self.dashboard_url = reverse("api:dashboard-stats")

    def _login_temporario(self):
        return self.client.post(
            self.login_url,
            {
                "username": self.usuario_temporario.username,
                "password": self.senha_temporaria,
            },
        )

    def test_login_informa_flag_e_permite_me_e_logout(self):
        resposta_login = self._login_temporario()

        self.assertEqual(resposta_login.status_code, status.HTTP_200_OK)
        self.assertTrue(resposta_login.data["precisa_trocar_senha"])
        self.assertNotIn("password", resposta_login.data)

        resposta_me = self.client.get(self.me_url)
        self.assertEqual(resposta_me.status_code, status.HTTP_200_OK)
        self.assertTrue(resposta_me.data["precisa_trocar_senha"])

        resposta_logout = self.client.post(self.logout_url)
        self.assertEqual(resposta_logout.status_code, status.HTTP_204_NO_CONTENT)

    def test_usuario_temporario_e_bloqueado_em_outros_endpoints_api(self):
        self.assertEqual(self._login_temporario().status_code, status.HTTP_200_OK)

        resposta = self.client.get(self.dashboard_url)

        self.assertEqual(resposta.status_code, status.HTTP_403_FORBIDDEN)
        payload = json.loads(resposta.content)
        self.assertEqual(payload["code"], "password_change_required")
        self.assertNotIn("password", payload)

    def test_troca_valida_limpa_flag_preserva_sessao_e_libera_acesso(self):
        self.assertEqual(self._login_temporario().status_code, status.HTTP_200_OK)
        nova_senha = "NovaSenhaSegura#2026"

        resposta = self.client.post(
            self.change_password_url,
            {
                "senha_atual": self.senha_temporaria,
                "nova_senha": nova_senha,
                "confirmacao_senha": nova_senha,
            },
        )

        self.assertEqual(resposta.status_code, status.HTTP_200_OK)
        self.assertFalse(resposta.data["precisa_trocar_senha"])
        self.assertNotIn("password", resposta.data)
        self.assertNotIn("senha_atual", resposta.data)
        self.assertNotIn("nova_senha", resposta.data)
        self.assertNotIn("confirmacao_senha", resposta.data)

        self.usuario_temporario.refresh_from_db()
        self.assertFalse(self.usuario_temporario.precisa_trocar_senha)
        self.assertTrue(self.usuario_temporario.check_password(nova_senha))

        resposta_me = self.client.get(self.me_url)
        self.assertEqual(resposta_me.status_code, status.HTTP_200_OK)
        self.assertFalse(resposta_me.data["precisa_trocar_senha"])

        resposta_dashboard = self.client.get(self.dashboard_url)
        self.assertEqual(resposta_dashboard.status_code, status.HTTP_200_OK)

    def test_troca_rejeita_senha_atual_invalida(self):
        self.assertEqual(self._login_temporario().status_code, status.HTTP_200_OK)

        resposta = self.client.post(
            self.change_password_url,
            {
                "senha_atual": "SenhaAtualErrada#2026",
                "nova_senha": "NovaSenhaSegura#2026",
                "confirmacao_senha": "NovaSenhaSegura#2026",
            },
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("senha_atual", resposta.data)
        self.usuario_temporario.refresh_from_db()
        self.assertTrue(self.usuario_temporario.precisa_trocar_senha)
        self.assertTrue(self.usuario_temporario.check_password(self.senha_temporaria))

    def test_troca_rejeita_confirmacao_diferente(self):
        self.assertEqual(self._login_temporario().status_code, status.HTTP_200_OK)

        resposta = self.client.post(
            self.change_password_url,
            {
                "senha_atual": self.senha_temporaria,
                "nova_senha": "NovaSenhaSegura#2026",
                "confirmacao_senha": "OutraSenhaSegura#2026",
            },
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirmacao_senha", resposta.data)

    def test_troca_aplica_validadores_de_senha_do_django(self):
        self.assertEqual(self._login_temporario().status_code, status.HTTP_200_OK)

        resposta = self.client.post(
            self.change_password_url,
            {
                "senha_atual": self.senha_temporaria,
                "nova_senha": "12345678",
                "confirmacao_senha": "12345678",
            },
        )

        self.assertEqual(resposta.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nova_senha", resposta.data)

    def test_usuario_sem_flag_continua_com_acesso_normal(self):
        usuario_existente = Usuario.objects.create_user(
            username="usuario.existente",
            email="usuario.existente@ufpi.edu.br",
            password="SenhaExistente#2026",
            first_name="Usuario Existente",
        )

        resposta_login = self.client.post(
            self.login_url,
            {
                "username": usuario_existente.username,
                "password": "SenhaExistente#2026",
            },
        )

        self.assertEqual(resposta_login.status_code, status.HTTP_200_OK)
        self.assertFalse(resposta_login.data["precisa_trocar_senha"])
        self.assertEqual(self.client.get(self.dashboard_url).status_code, status.HTTP_200_OK)
