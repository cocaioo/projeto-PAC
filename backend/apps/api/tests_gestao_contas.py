from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model, authenticate
from django.urls import reverse
from unittest.mock import patch
from apps.usuarios.models import SolicitacaoAcesso, StatusSolicitacao, Perfil
from apps.unidades.models import Unidade
from apps.grupos_contratacao.models import GrupoContratacao

User = get_user_model()


class GestaoContasTestCase(APITestCase):
    def setUp(self):
        self.unidade = Unidade.objects.create(
            nome="Superintendência de TI",
            sigla="STI",
            codigo="STI01",
            ativo=True,
        )
        self.unidade_outro = Unidade.objects.create(
            nome="Centro de Ciências Humanas",
            sigla="CCHL",
            codigo="CCHL01",
            ativo=True,
        )
        self.grupo_tic = GrupoContratacao.objects.create(
            nome="TIC - Tecnologia",
            descricao="Demandas de Tecnologia",
            unidade_admin=self.unidade,
            ativo=True,
        )

        self.admin_master = User.objects.create(
            username="admin_master",
            email="admin_master@ufpi.edu.br",
            first_name="Admin Master",
            perfil=Perfil.ADMIN_MASTER,
            unidade=self.unidade,
            is_active=True,
        )
        self.admin_master.set_password("admin_senha")
        self.admin_master.save()

        self.comum_user = User.objects.create(
            username="comum",
            email="comum@ufpi.edu.br",
            first_name="Comum",
            perfil=Perfil.USUARIO,
            unidade=self.unidade,
            is_active=True,
        )
        self.comum_user.set_password("comum_senha")
        self.comum_user.save()

    # =========================================================================
    # 1. Solicitação de Acesso
    # =========================================================================

    def test_solicitar_acesso_valido(self):
        data = {
            "nome_completo": "Novo Usuario",
            "email": "novo@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura",
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)

        solicitacao = SolicitacaoAcesso.objects.get(email="novo@ufpi.edu.br")
        self.assertEqual(solicitacao.status, StatusSolicitacao.PENDENTE)
        self.assertTrue(solicitacao.senha_hash != "senha_segura")
        self.assertTrue(solicitacao.senha_hash.startswith("pbkdf2_"))

    def test_solicitar_acesso_dominio_invalido(self):
        data = {
            "nome_completo": "Novo Usuario",
            "email": "novo@gmail.com",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura",
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_duplicidade_solicitacao_pendente(self):
        SolicitacaoAcesso.objects.create(
            nome_completo="Novo Usuario",
            email="novo@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="hash",
            status=StatusSolicitacao.PENDENTE,
        )
        data = {
            "nome_completo": "Outro",
            "email": "novo@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura",
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_solicitar_acesso_com_email_usuario_existente_rejeitada(self):
        data = {
            "nome_completo": "Comum Duplicado",
            "email": "comum@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "senha_segura",
        }
        url = reverse("api:solicitar-acesso")
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    # =========================================================================
    # 2. Aprovação e Rejeição de Solicitações
    # =========================================================================

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_aprovar_solicitacao(self, mock_email):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Aprovado User",
            email="aprovado@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE,
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)

        solicitacao.refresh_from_db()
        self.assertEqual(solicitacao.status, StatusSolicitacao.APROVADO)
        self.assertEqual(solicitacao.analisado_por, self.admin_master)
        self.assertIsNotNone(solicitacao.analisado_em)

        usuario = User.objects.get(email="aprovado@ufpi.edu.br")
        self.assertTrue(usuario.is_active)
        self.assertEqual(usuario.perfil, Perfil.USUARIO)
        self.assertEqual(solicitacao.usuario_criado, usuario)
        mock_email.assert_called_once()

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_aprovar_solicitacao_ja_processada_rejeita(self, mock_email):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Aprovado User",
            email="aprovado_dup@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.APROVADO,
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        mock_email.assert_not_called()

    @patch("apps.usuarios.services.enviar_email_rejeicao")
    def test_rejeitar_solicitacao(self, mock_email):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="Rejeitado User",
            email="rejeitado@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE,
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-rejeitar", kwargs={"pk": solicitacao.id})
        data = {"justificativa": "Documentação incompleta"}
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 200)

        solicitacao.refresh_from_db()
        self.assertEqual(solicitacao.status, StatusSolicitacao.REJEITADO)
        self.assertEqual(solicitacao.justificativa_rejeicao, "Documentação incompleta")
        self.assertEqual(solicitacao.analisado_por, self.admin_master)
        mock_email.assert_called_once()

    def test_autorizacao_acesso_admin(self):
        solicitacao = SolicitacaoAcesso.objects.create(
            nome_completo="User",
            email="user@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="dummy_hash",
            status=StatusSolicitacao.PENDENTE,
        )
        self.client.force_login(self.comum_user)
        url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        response = self.client.post(url)
        self.assertEqual(response.status_code, 403)

    # =========================================================================
    # 3. Criação de Usuário via Admin Master (/api/admin/usuarios/)
    # =========================================================================

    def test_criar_usuario_admin(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")
        data = {
            "nome_completo": "Novo Admin",
            "email": "novo_admin@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.ADMIN,
            "senha_temporaria": "temp_senha",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 201)

        novo_admin = User.objects.get(email="novo_admin@ufpi.edu.br")
        self.assertTrue(novo_admin.precisa_trocar_senha)
        self.assertEqual(novo_admin.perfil, Perfil.ADMIN)
        self.assertTrue(novo_admin.is_active)
        self.assertTrue(novo_admin.check_password("temp_senha"))

    def test_criar_usuario_admin_master_e_usuario_comum(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")

        # Criar admin master
        res1 = self.client.post(url, {
            "nome_completo": "Outro Master",
            "email": "outro_master@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.ADMIN_MASTER,
            "senha_temporaria": "MasterSenha123!",
        })
        self.assertEqual(res1.status_code, 201)
        user_master = User.objects.get(email="outro_master@ufpi.edu.br")
        self.assertEqual(user_master.perfil, Perfil.ADMIN_MASTER)

        # Criar usuario comum
        res2 = self.client.post(url, {
            "nome_completo": "Criado Comum",
            "email": "criado_comum@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.USUARIO,
            "senha_temporaria": "ComumSenha123!",
        })
        self.assertEqual(res2.status_code, 201)
        user_comum = User.objects.get(email="criado_comum@ufpi.edu.br")
        self.assertEqual(user_comum.perfil, Perfil.USUARIO)

    def test_criar_usuario_com_email_existente_rejeitado(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")
        data = {
            "nome_completo": "Duplicado",
            "email": "comum@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.USUARIO,
            "senha_temporaria": "temp_senha123",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_criar_usuario_perfil_invalido_rejeitado(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")
        data = {
            "nome_completo": "Perfil Invalido",
            "email": "invalido@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": "super_god_mode",
            "senha_temporaria": "temp_senha123",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 400)

    def test_usuario_comum_nao_pode_criar_usuario_admin(self):
        self.client.force_login(self.comum_user)
        url = reverse("api:admin-usuarios")
        data = {
            "nome_completo": "Tentativa Invalida",
            "email": "tentativa@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.USUARIO,
            "senha_temporaria": "temp_senha123",
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, 403)

    # =========================================================================
    # 4. Status de Usuário & Proteção de Último Admin Master
    # =========================================================================

    def test_protecao_desativar_ultimo_admin_master(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-status", kwargs={"pk": self.admin_master.id})
        data = {"is_active": False}
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, 400)

        self.admin_master.refresh_from_db()
        self.assertTrue(self.admin_master.is_active)

    def test_ativar_e_desativar_usuario_comum(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-status", kwargs={"pk": self.comum_user.id})

        # Desativar
        res_desat = self.client.patch(url, {"is_active": False})
        self.assertEqual(res_desat.status_code, 200)
        self.comum_user.refresh_from_db()
        self.assertFalse(self.comum_user.is_active)

        # Login deve falhar quando inativo
        self.client.logout()
        res_login = self.client.post(reverse("api:login"), {
            "username": "comum@ufpi.edu.br",
            "password": "comum_senha",
        })
        self.assertEqual(res_login.status_code, 401)

        # Reativar
        self.client.force_login(self.admin_master)
        res_ativ = self.client.patch(url, {"is_active": True})
        self.assertEqual(res_ativ.status_code, 200)
        self.comum_user.refresh_from_db()
        self.assertTrue(self.comum_user.is_active)

        # Login volta a funcionar
        self.client.logout()
        res_login_ok = self.client.post(reverse("api:login"), {
            "username": "comum@ufpi.edu.br",
            "password": "comum_senha",
        })
        self.assertEqual(res_login_ok.status_code, 200)

    # =========================================================================
    # 5. Fluxos Completos de Autenticação e Verificações de Senha / Identificador
    # =========================================================================

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_fluxo_completo_solicitacao_aprovacao_e_login_com_email(self, mock_email):
        # 1. Usuário solicita acesso
        solicitar_url = reverse("api:solicitar-acesso")
        solicitar_data = {
            "nome_completo": "Carlos Servidor",
            "email": "carlos.servidor@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "MinhaSenhaForte2026!",
        }
        res_solicitar = self.client.post(solicitar_url, solicitar_data)
        self.assertEqual(res_solicitar.status_code, 201)

        solicitacao = SolicitacaoAcesso.objects.get(email="carlos.servidor@ufpi.edu.br")

        # 2. Admin Master aprova
        self.client.force_login(self.admin_master)
        aprovar_url = reverse("api:admin-aprovar", kwargs={"pk": solicitacao.id})
        res_aprovar = self.client.post(aprovar_url)
        self.assertEqual(res_aprovar.status_code, 200)

        # 3. Usuário faz login com EMAIL institucional e a senha cadastrada
        self.client.logout()
        login_url = reverse("api:login")
        res_login = self.client.post(login_url, {
            "username": "carlos.servidor@ufpi.edu.br",
            "password": "MinhaSenhaForte2026!",
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertEqual(res_login.data["email"], "carlos.servidor@ufpi.edu.br")

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_login_com_username_e_senha(self, mock_email):
        # Solicitação e aprovação
        self.client.post(reverse("api:solicitar-acesso"), {
            "nome_completo": "Ana Paula",
            "email": "ana.paula@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "SenhaValida123!",
        })
        solic = SolicitacaoAcesso.objects.get(email="ana.paula@ufpi.edu.br")
        self.client.force_login(self.admin_master)
        self.client.post(reverse("api:admin-aprovar", kwargs={"pk": solic.id}))
        self.client.logout()

        novo_usuario = User.objects.get(email="ana.paula@ufpi.edu.br")
        # Username gerado a partir do email prefix
        self.assertEqual(novo_usuario.username, "anapaula")

        # Login usando o username gerado
        res_login = self.client.post(reverse("api:login"), {
            "username": novo_usuario.username,
            "password": "SenhaValida123!",
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertEqual(res_login.data["username"], novo_usuario.username)

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_login_com_payload_campo_email(self, mock_email):
        self.client.post(reverse("api:solicitar-acesso"), {
            "nome_completo": "Marcos Lima",
            "email": "marcos.lima@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "SenhaValida123!",
        })
        solic = SolicitacaoAcesso.objects.get(email="marcos.lima@ufpi.edu.br")
        self.client.force_login(self.admin_master)
        self.client.post(reverse("api:admin-aprovar", kwargs={"pk": solic.id}))
        self.client.logout()

        # Envia { "email": ..., "password": ... } sem a chave "username"
        res_login = self.client.post(reverse("api:login"), {
            "email": "marcos.lima@ufpi.edu.br",
            "password": "SenhaValida123!",
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertEqual(res_login.data["email"], "marcos.lima@ufpi.edu.br")

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_login_com_email_case_insensitive(self, mock_email):
        self.client.post(reverse("api:solicitar-acesso"), {
            "nome_completo": "Joana Dark",
            "email": "joana.dark@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "SenhaForte123!",
        })
        solic = SolicitacaoAcesso.objects.get(email="joana.dark@ufpi.edu.br")
        self.client.force_login(self.admin_master)
        self.client.post(reverse("api:admin-aprovar", kwargs={"pk": solic.id}))
        self.client.logout()

        # Login com email em UPPERCASE
        res_login = self.client.post(reverse("api:login"), {
            "username": "JOANA.DARK@UFPI.EDU.BR",
            "password": "SenhaForte123!",
        })
        self.assertEqual(res_login.status_code, 200)
        self.assertEqual(res_login.data["email"], "joana.dark@ufpi.edu.br")

    def test_login_usuario_criado_via_admin_com_email_e_username(self):
        self.client.force_login(self.admin_master)
        res_create = self.client.post(reverse("api:admin-usuarios"), {
            "nome_completo": "Secretario Admin",
            "email": "secretario.admin@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.ADMIN,
            "senha_temporaria": "TempSecret123!",
        })
        self.assertEqual(res_create.status_code, 201)
        self.client.logout()

        novo_admin = User.objects.get(email="secretario.admin@ufpi.edu.br")

        # 1. Login via email
        res1 = self.client.post(reverse("api:login"), {
            "username": "secretario.admin@ufpi.edu.br",
            "password": "TempSecret123!",
        })
        self.assertEqual(res1.status_code, 200)
        self.assertTrue(res1.data["precisa_trocar_senha"])
        self.client.logout()

        # 2. Login via username
        res2 = self.client.post(reverse("api:login"), {
            "username": novo_admin.username,
            "password": "TempSecret123!",
        })
        self.assertEqual(res2.status_code, 200)

    def test_login_senha_incorreta_retorna_401(self):
        res_login = self.client.post(reverse("api:login"), {
            "username": "comum@ufpi.edu.br",
            "password": "SenhaCompletamenteIncorreta!",
        })
        self.assertEqual(res_login.status_code, 401)
        self.assertEqual(res_login.data["detail"], "Credenciais inválidas.")

    def test_login_sem_credenciais_retorna_400(self):
        res = self.client.post(reverse("api:login"), {})
        self.assertEqual(res.status_code, 400)

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_deduplicacao_de_username_colisao_slug(self, mock_email):
        # Usuário 1: ana.clara@ufpi.edu.br -> username 'anaclara'
        self.client.post(reverse("api:solicitar-acesso"), {
            "nome_completo": "Ana Clara 1",
            "email": "ana.clara@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": "Senha123!",
        })
        s1 = SolicitacaoAcesso.objects.get(email="ana.clara@ufpi.edu.br")
        self.client.force_login(self.admin_master)
        self.client.post(reverse("api:admin-aprovar", kwargs={"pk": s1.id}))

        u1 = User.objects.get(email="ana.clara@ufpi.edu.br")
        self.assertEqual(u1.username, "anaclara")

        # Usuário 2 criado via admin com email diferente
        res_u2 = self.client.post(reverse("api:admin-usuarios"), {
            "nome_completo": "Ana Clara 2",
            "email": "ana.clara.secundaria@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.USUARIO,
            "senha_temporaria": "SenhaTemp123!",
        })
        self.assertEqual(res_u2.status_code, 201)
        u2 = User.objects.get(email="ana.clara.secundaria@ufpi.edu.br")
        self.assertEqual(u2.username, "anaclarasecundaria")

        # Usuário 3 criado direto com slug que colide
        User.objects.create(
            username="testecolisao",
            email="testecolisao1@ufpi.edu.br",
            first_name="Teste Colisao 1",
            unidade=self.unidade,
        )
        self.client.post(reverse("api:admin-usuarios"), {
            "nome_completo": "Teste Colisao 2",
            "email": "testecolisao@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "perfil": Perfil.USUARIO,
            "senha_temporaria": "SenhaTemp123!",
        })
        u3 = User.objects.get(email="testecolisao@ufpi.edu.br")
        self.assertEqual(u3.username, "testecolisao1")

    @patch("apps.usuarios.services.enviar_email_aprovacao")
    def test_verificacao_integridade_hash_senha_sem_double_hashing(self, mock_email):
        senha_plana = "MinhaSenhaComplexa#2026"
        self.client.post(reverse("api:solicitar-acesso"), {
            "nome_completo": "Roberto Carlos",
            "email": "roberto.carlos@ufpi.edu.br",
            "unidade_id": self.unidade.id,
            "senha": senha_plana,
        })
        solic = SolicitacaoAcesso.objects.get(email="roberto.carlos@ufpi.edu.br")
        self.assertTrue(solic.senha_hash.startswith("pbkdf2_sha256$"))

        # Aprova
        self.client.force_login(self.admin_master)
        self.client.post(reverse("api:admin-aprovar", kwargs={"pk": solic.id}))

        user = User.objects.get(email="roberto.carlos@ufpi.edu.br")
        # Garante que o hash do usuário é idêntico ao hash gerado na solicitação
        self.assertEqual(user.password, solic.senha_hash)
        # Garante que authenticate direto do Django resolve sem double-hashing
        auth_user = authenticate(username="roberto.carlos@ufpi.edu.br", password=senha_plana)
        self.assertIsNotNone(auth_user)
        self.assertEqual(auth_user.pk, user.pk)

    def test_auth_me_e_logout(self):
        # Login
        self.client.post(reverse("api:login"), {
            "username": "comum@ufpi.edu.br",
            "password": "comum_senha",
        })

        # Teste /api/auth/me/
        res_me = self.client.get(reverse("api:me"))
        self.assertEqual(res_me.status_code, 200)
        self.assertEqual(res_me.data["email"], "comum@ufpi.edu.br")

        # Teste /api/auth/logout/
        res_logout = self.client.post(reverse("api:logout"))
        self.assertEqual(res_logout.status_code, 204)

        # Acesso subsequente a /api/auth/me/ retorna 403
        res_me_after = self.client.get(reverse("api:me"))
        self.assertEqual(res_me_after.status_code, 403)

    def test_admin_usuarios_list_e_filtros(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuarios")

        # Lista geral
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(len(res.data), 2)

        # Filtro por perfil
        res_perfil = self.client.get(url, {"perfil": Perfil.ADMIN_MASTER})
        self.assertEqual(res_perfil.status_code, 200)
        for u in res_perfil.data:
            self.assertEqual(u["perfil"], Perfil.ADMIN_MASTER)

        # Filtro por unidade
        res_unidade = self.client.get(url, {"unidade": self.unidade.id})
        self.assertEqual(res_unidade.status_code, 200)
        for u in res_unidade.data:
            self.assertEqual(u["unidade"], self.unidade.id)

    def test_admin_solicitacoes_list_e_filtros(self):
        SolicitacaoAcesso.objects.create(
            nome_completo="Pendente 1",
            email="pendente1@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="hash",
            status=StatusSolicitacao.PENDENTE,
        )
        SolicitacaoAcesso.objects.create(
            nome_completo="Rejeitado 1",
            email="rejeitado1@ufpi.edu.br",
            unidade=self.unidade,
            senha_hash="hash",
            status=StatusSolicitacao.REJEITADO,
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-solicitacoes")

        # Filtro pendente
        res_p = self.client.get(url, {"status": "pendente"})
        self.assertEqual(res_p.status_code, 200)
        for s in res_p.data:
            self.assertEqual(s["status"], StatusSolicitacao.PENDENTE)

    # =========================================================================
    # 6. Exclusão de Contas de Usuário (Admin Master)
    # =========================================================================

    def test_excluir_usuario_comum_com_sucesso(self):
        usuario_alvo = User.objects.create(
            username="usuario.deletavel",
            email="usuario.deletavel@ufpi.edu.br",
            first_name="Usuario Deletavel",
            unidade=self.unidade,
            perfil=Perfil.USUARIO,
            is_active=True
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-detail", kwargs={"pk": usuario_alvo.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["message"], "Usuário excluído com sucesso.")
        self.assertFalse(User.objects.filter(id=usuario_alvo.id).exists())

    def test_usuario_comum_nao_pode_excluir_usuario(self):
        usuario_alvo = User.objects.create(
            username="outro.usuario",
            email="outro.usuario@ufpi.edu.br",
            first_name="Outro Usuario",
            unidade=self.unidade,
            perfil=Perfil.USUARIO,
        )
        self.client.force_login(self.comum_user)
        url = reverse("api:admin-usuario-detail", kwargs={"pk": usuario_alvo.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 403)
        self.assertTrue(User.objects.filter(id=usuario_alvo.id).exists())

    def test_admin_master_nao_pode_excluir_a_si_mesmo(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-detail", kwargs={"pk": self.admin_master.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 400)
        self.assertIn("sua própria conta", res.data["error"])
        self.assertTrue(User.objects.filter(id=self.admin_master.id).exists())

    def test_nao_pode_excluir_unico_admin_master(self):
        # Cria um segundo admin master para fazer a requisição
        segundo_master = User.objects.create(
            username="segundo_master",
            email="master2@ufpi.edu.br",
            first_name="Master 2",
            unidade=self.unidade,
            perfil=Perfil.ADMIN_MASTER,
        )
        # Apaga o self.admin_master para sobrar apenas segundo_master
        # Quando só tiver 1 master e tentar apagar ele:
        self.admin_master.perfil = Perfil.USUARIO
        self.admin_master.save()

        self.client.force_login(self.admin_master)
        # Força status master no solicitante da request
        self.admin_master.is_superuser = True
        self.admin_master.save()

        url = reverse("api:admin-usuario-detail", kwargs={"pk": segundo_master.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 400)
        self.assertIn("único Admin Master", res.data["error"])

    def test_excluir_usuario_com_demandas_vinculadas_retorna_400_com_orientacao(self):
        from apps.demandas.models import Demanda
        demanda = Demanda.objects.create(
            usuario=self.comum_user,
            unidade=self.unidade,
            ano_referencia=2026,
        )
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-detail", kwargs={"pk": self.comum_user.id})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 400)
        self.assertIn("registros vinculados", res.data["error"])
        self.assertTrue(User.objects.filter(id=self.comum_user.id).exists())

    def test_excluir_usuario_inexistente_retorna_404(self):
        self.client.force_login(self.admin_master)
        url = reverse("api:admin-usuario-detail", kwargs={"pk": 999999})
        res = self.client.delete(url)
        self.assertEqual(res.status_code, 404)


