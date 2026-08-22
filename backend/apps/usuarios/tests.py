"""
Testes automatizados para autenticação e integração com o SIPAC.
"""

import json
from io import BytesIO
from unittest import mock
from django.test import TestCase, override_settings
from django.contrib.auth import authenticate, get_user_model

from apps.unidades.models import Unidade
from apps.usuarios.backends import SipacAuthBackend
from apps.usuarios.sipac import SipacClient

Usuario = get_user_model()


class SipacClientTests(TestCase):
    def setUp(self):
        self.client_sipac = SipacClient(
            base_url="https://sipac.ufpi.br/api",
            client_id="test_client_id",
            client_secret="test_client_secret",
            timeout=5,
        )

    def test_init_defaults(self):
        client = SipacClient()
        self.assertIsNotNone(client.base_url)
        self.assertIsInstance(client.timeout, int)

    def test_autenticar_sem_dados(self):
        self.assertIsNone(self.client_sipac.autenticar_e_obter_dados("", ""))
        self.assertIsNone(self.client_sipac.autenticar_e_obter_dados("user", ""))
        self.assertIsNone(self.client_sipac.autenticar_e_obter_dados("", "pass"))

    @mock.patch("urllib.request.urlopen")
    def test_autenticar_e_obter_dados_sucesso(self, mock_urlopen):
        resposta_mock = {
            "siape": "1234567",
            "nome": "João da Silva",
            "email": "joao.silva@ufpi.edu.br",
            "codigo_unidade": "STI01",
            "nome_unidade": "Superintendência de TI",
            "sigla_unidade": "STI",
        }
        mock_response = mock.MagicMock()
        mock_response.status = 200
        mock_response.read.return_value = json.dumps(resposta_mock).encode("utf-8")
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        resultado = self.client_sipac.autenticar_e_obter_dados("joao.silva", "senha123")
        self.assertIsNotNone(resultado)
        self.assertEqual(resultado["siape"], "1234567")
        self.assertEqual(resultado["nome"], "João da Silva")
        self.assertEqual(resultado["email"], "joao.silva@ufpi.edu.br")
        self.assertEqual(resultado["sigla_unidade"], "STI")

    @mock.patch("urllib.request.urlopen")
    def test_autenticar_e_obter_dados_falha_http(self, mock_urlopen):
        import urllib.error
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url="https://sipac.ufpi.br/api/auth/login/",
            code=401,
            msg="Unauthorized",
            hdrs={},
            fp=BytesIO(b'{"detail": "Credenciais invalidas"}'),
        )

        resultado = self.client_sipac.autenticar_e_obter_dados("joao.silva", "senha_errada")
        self.assertIsNone(resultado)

    def test_sincronizar_unidade_sem_codigo(self):
        self.assertIsNone(self.client_sipac.sincronizar_unidade(None))
        self.assertIsNone(self.client_sipac.sincronizar_unidade(""))

    def test_sincronizar_unidade_nova(self):
        unidade = self.client_sipac.sincronizar_unidade(
            codigo_unidade="U999",
            nome_unidade="Unidade de Teste",
            sigla_unidade="UTEST",
        )
        self.assertIsNotNone(unidade)
        self.assertEqual(unidade.codigo, "U999")
        self.assertEqual(unidade.nome, "Unidade de Teste")
        self.assertEqual(unidade.sigla, "UTEST")
        self.assertTrue(unidade.ativo)

    def test_sincronizar_unidade_existente_atualiza(self):
        Unidade.objects.create(
            codigo="U888",
            nome="Nome Antigo",
            sigla="UANTIGA",
        )
        unidade = self.client_sipac.sincronizar_unidade(
            codigo_unidade="U888",
            nome_unidade="Nome Atualizado",
            sigla_unidade="UATUAL",
        )
        self.assertEqual(unidade.codigo, "U888")
        self.assertEqual(unidade.nome, "Nome Atualizado")
        self.assertEqual(unidade.sigla, "UATUAL")


class SipacAuthBackendTests(TestCase):
    def setUp(self):
        self.backend = SipacAuthBackend()
        self.unidade = Unidade.objects.create(
            codigo="STI01",
            nome="Superintendência de TI",
            sigla="STI",
        )
        self.usuario_local = Usuario.objects.create_user(
            username="maria_local",
            password="senha_local_123",
            email="maria.local@ufpi.edu.br",
            siape="9876543",
            unidade=self.unidade,
            first_name="Maria",
            last_name="Local",
        )

    def test_autenticacao_sem_credenciais_retorna_none(self):
        self.assertIsNone(self.backend.authenticate(None, username="", password=""))
        self.assertIsNone(self.backend.authenticate(None, username="user", password=""))
        self.assertIsNone(self.backend.authenticate(None, username="", password="pass"))

    @override_settings(SIPAC_AUTH_ENABLED=False)
    def test_fallback_local_com_sipac_desabilitado(self):
        user = authenticate(username="maria_local", password="senha_local_123")
        self.assertIsNotNone(user)
        self.assertEqual(user.pk, self.usuario_local.pk)

    @override_settings(SIPAC_AUTH_ENABLED=True)
    @mock.patch.object(SipacClient, "autenticar_e_obter_dados")
    def test_autenticacao_sipac_sucesso_provisiona_usuario_novo(self, mock_auth):
        mock_auth.return_value = {
            "siape": "1122334",
            "nome": "Carlos Drummond de Andrade",
            "email": "carlos.drummond@ufpi.edu.br",
            "codigo_unidade": "CCHL01",
            "nome_unidade": "Centro de Ciências Humanas e Letras",
            "sigla_unidade": "CCHL",
        }

        user = authenticate(username="carlos.drummond", password="senha_sipac_123")
        self.assertIsNotNone(user)
        self.assertEqual(user.username, "carlos.drummond")
        self.assertEqual(user.siape, "1122334")
        self.assertEqual(user.email, "carlos.drummond@ufpi.edu.br")
        self.assertEqual(user.first_name, "Carlos")
        self.assertEqual(user.last_name, "Drummond de Andrade")
        self.assertIsNotNone(user.unidade)
        self.assertEqual(user.unidade.sigla, "CCHL")
        self.assertEqual(user.unidade.codigo, "CCHL01")

    @override_settings(SIPAC_AUTH_ENABLED=True)
    @mock.patch.object(SipacClient, "autenticar_e_obter_dados")
    def test_autenticacao_sipac_sucesso_atualiza_usuario_existente(self, mock_auth):
        mock_auth.return_value = {
            "siape": "9876543",
            "nome": "Maria Local Atualizada",
            "email": "maria.novoemail@ufpi.edu.br",
            "codigo_unidade": "STI01",
            "nome_unidade": "Superintendência de TI",
            "sigla_unidade": "STI",
        }

        user = authenticate(username="maria_local", password="senha_nova_sipac")
        self.assertIsNotNone(user)
        self.assertEqual(user.pk, self.usuario_local.pk)
        self.usuario_local.refresh_from_db()
        self.assertEqual(self.usuario_local.first_name, "Maria")
        self.assertEqual(self.usuario_local.last_name, "Local Atualizada")
        self.assertEqual(self.usuario_local.email, "maria.novoemail@ufpi.edu.br")

    @override_settings(SIPAC_AUTH_ENABLED=True)
    @mock.patch.object(SipacClient, "autenticar_e_obter_dados")
    def test_autenticacao_sipac_falha_faz_fallback_para_local(self, mock_auth):
        mock_auth.return_value = None  # SIPAC rejeitou

        user = authenticate(username="maria_local", password="senha_local_123")
        self.assertIsNotNone(user)
        self.assertEqual(user.pk, self.usuario_local.pk)

    @override_settings(SIPAC_AUTH_ENABLED=True)
    @mock.patch.object(SipacClient, "autenticar_e_obter_dados")
    def test_autenticacao_falha_ambos_retorna_none(self, mock_auth):
        mock_auth.return_value = None

        user = authenticate(username="inexistente", password="qualquer_senha")
        self.assertIsNone(user)
