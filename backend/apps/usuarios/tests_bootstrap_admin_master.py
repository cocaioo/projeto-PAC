import os
from contextlib import contextmanager
from io import StringIO
from unittest import mock

from django.contrib.auth.hashers import check_password
from django.core.management import CommandError, call_command
from django.test import TestCase

from apps.usuarios.management.commands.bootstrap_admin_master import (
    DEFAULT_BOOTSTRAP_PASSWORD,
    EMAIL_ENV,
    PASSWORD_ENV,
    USERNAME_ENV,
)
from apps.usuarios.models import Perfil, Usuario


TEST_PASSWORD = "SenhaBootstrapSegura!42"
ENV_NAMES = (USERNAME_ENV, EMAIL_ENV, PASSWORD_ENV)


@contextmanager
def bootstrap_environment(**values):
    previous = {name: os.environ.get(name) for name in ENV_NAMES}
    for name in ENV_NAMES:
        os.environ.pop(name, None)
    os.environ.update(values)
    try:
        yield
    finally:
        for name in ENV_NAMES:
            os.environ.pop(name, None)
            if previous[name] is not None:
                os.environ[name] = previous[name]


class BootstrapAdminMasterCommandTests(TestCase):
    def execute_with_environment(self, *, username, email, password=TEST_PASSWORD):
        output = StringIO()
        values = {USERNAME_ENV: username, EMAIL_ENV: email}
        if password is not None:
            values[PASSWORD_ENV] = password
        with bootstrap_environment(**values):
            call_command("bootstrap_admin_master", no_input=True, stdout=output)
        return output.getvalue()

    def test_cria_admin_master_com_flags_e_troca_obrigatoria(self):
        output = self.execute_with_environment(
            username="admin_master_producao",
            email="admin.master@ufpi.edu.br",
        )

        usuario = Usuario.objects.get()
        self.assertEqual(usuario.username, "admin_master_producao")
        self.assertEqual(usuario.email, "admin.master@ufpi.edu.br")
        self.assertEqual(usuario.perfil, Perfil.ADMIN_MASTER)
        self.assertTrue(usuario.is_staff)
        self.assertTrue(usuario.is_superuser)
        self.assertTrue(usuario.is_active)
        self.assertTrue(usuario.precisa_trocar_senha)
        self.assertTrue(check_password(TEST_PASSWORD, usuario.password))
        self.assertNotIn(TEST_PASSWORD, output)

    def test_usa_senha_temporaria_padrao_quando_override_nao_e_informado(self):
        self.execute_with_environment(
            username="admin_master_padrao",
            email="admin.padrao@ufpi.edu.br",
            password=None,
        )

        usuario = Usuario.objects.get()
        self.assertTrue(check_password(DEFAULT_BOOTSTRAP_PASSWORD, usuario.password))
        self.assertTrue(usuario.precisa_trocar_senha)

    def test_modo_interativo_usa_senha_temporaria_padrao(self):
        output = StringIO()
        with bootstrap_environment():
            with mock.patch(
                "builtins.input",
                side_effect=["admin_master_interativo", "interativo@ufpi.edu.br"],
            ):
                call_command("bootstrap_admin_master", stdout=output)

        usuario = Usuario.objects.get(username="admin_master_interativo")
        self.assertTrue(check_password(DEFAULT_BOOTSTRAP_PASSWORD, usuario.password))
        self.assertTrue(usuario.precisa_trocar_senha)
        self.assertNotIn(DEFAULT_BOOTSTRAP_PASSWORD, output.getvalue())

    def test_segunda_execucao_e_idempotente_e_preserva_dados(self):
        self.execute_with_environment(
            username="admin_master_original",
            email="original@ufpi.edu.br",
        )
        usuario = Usuario.objects.get()
        password_hash = usuario.password
        snapshot = {
            "username": usuario.username,
            "email": usuario.email,
            "perfil": usuario.perfil,
            "is_staff": usuario.is_staff,
            "is_superuser": usuario.is_superuser,
            "is_active": usuario.is_active,
            "precisa_trocar_senha": usuario.precisa_trocar_senha,
        }

        output = self.execute_with_environment(
            username="nao_deve_ser_criado",
            email="nao.deve.ser.criado@ufpi.edu.br",
            password="OutraSenhaSegura!99",
        )

        usuario.refresh_from_db()
        self.assertEqual(Usuario.objects.count(), 1)
        self.assertEqual(usuario.password, password_hash)
        self.assertEqual(
            {field: getattr(usuario, field) for field in snapshot},
            snapshot,
        )
        self.assertIn("nenhuma alteração foi feita", output)

    def test_superuser_existente_tambem_impede_nova_criacao(self):
        Usuario.objects.create_user(
            username="superuser_existente",
            email="superuser@ufpi.edu.br",
            password="SenhaExistente!42",
            is_staff=True,
            is_superuser=True,
        )

        output = self.execute_with_environment(
            username="outro_admin_master",
            email="outro.admin@ufpi.edu.br",
            password="senha-fraca",
        )

        self.assertEqual(Usuario.objects.count(), 1)
        self.assertIn("nenhuma alteração foi feita", output)

    def test_rejeita_conflito_de_username_com_usuario_nao_master(self):
        Usuario.objects.create_user(
            username="username_ocupado",
            email="usuario@ufpi.edu.br",
            password="SenhaExistente!42",
        )

        with self.assertRaisesMessage(CommandError, "username já pertence"):
            self.execute_with_environment(
                username="username_ocupado",
                email="novo.master@ufpi.edu.br",
            )

        self.assertEqual(Usuario.objects.count(), 1)
        self.assertFalse(Usuario.objects.filter(perfil=Perfil.ADMIN_MASTER).exists())

    def test_rejeita_conflito_de_email_com_usuario_nao_master(self):
        Usuario.objects.create_user(
            username="usuario_existente",
            email="email.ocupado@ufpi.edu.br",
            password="SenhaExistente!42",
        )

        with self.assertRaisesMessage(CommandError, "e-mail já pertence"):
            self.execute_with_environment(
                username="novo_admin_master",
                email="EMAIL.OCUPADO@UFPI.EDU.BR",
            )

        self.assertEqual(Usuario.objects.count(), 1)
        self.assertFalse(Usuario.objects.filter(perfil=Perfil.ADMIN_MASTER).exists())

    def test_valida_senha_com_validators_do_django(self):
        output = StringIO()
        with self.assertRaisesMessage(CommandError, "Senha inválida"):
            with bootstrap_environment(
                **{
                    USERNAME_ENV: "admin_master_fraco",
                    EMAIL_ENV: "fraco@ufpi.edu.br",
                    PASSWORD_ENV: "12345678",
                }
            ):
                call_command("bootstrap_admin_master", no_input=True, stdout=output)

        self.assertEqual(Usuario.objects.count(), 0)
        self.assertNotIn("12345678", output.getvalue())

    def test_modo_nao_interativo_exige_username_e_email(self):
        output = StringIO()
        with self.assertRaisesMessage(CommandError, f"{USERNAME_ENV}, {EMAIL_ENV}"):
            with bootstrap_environment(
                **{PASSWORD_ENV: TEST_PASSWORD}
            ):
                call_command("bootstrap_admin_master", no_input=True, stdout=output)

        self.assertEqual(Usuario.objects.count(), 0)
        self.assertNotIn(PASSWORD_ENV, output.getvalue())
