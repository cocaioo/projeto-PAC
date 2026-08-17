from pathlib import Path

from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from apps.core.seed_safety import (
    TARGET_FINGERPRINT_LENGTH,
    build_safe_seed_report,
    database_target_fingerprint,
    format_safe_seed_report,
    format_seed_target_check,
    inspect_seed_target,
    validate_seed_execution,
)


SQLITE_DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(Path("pac") / "test-seed-safety.sqlite3"),
        "USER": "usuario-que-nao-deve-aparecer",
        "PASSWORD": "senha-que-nao-deve-aparecer",
    }
}

REMOTE_DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "pac_homologacao_privado",
        "HOST": "banco-homologacao.interno.example",
        "PORT": "5432",
        "USER": "usuario_privado",
        "PASSWORD": "senha_privada",
    }
}


class SeedSafetyFingerprintTests(SimpleTestCase):
    def test_fingerprint_ignora_credenciais_mas_identifica_o_alvo(self):
        original = REMOTE_DATABASES["default"]
        outras_credenciais = {
            **original,
            "USER": "outro_usuario",
            "PASSWORD": "outra_senha",
        }
        outro_banco = {**original, "NAME": "outro_banco"}

        fingerprint = database_target_fingerprint(original)

        self.assertEqual(
            fingerprint,
            database_target_fingerprint(outras_credenciais),
        )
        self.assertNotEqual(
            fingerprint,
            database_target_fingerprint(outro_banco),
        )
        self.assertEqual(len(fingerprint), TARGET_FINGERPRINT_LENGTH)

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="development",
        ALLOW_HOMOLOGACAO_SEED=False,
    )
    def test_inspecao_e_check_sao_locais_e_nao_expoem_configuracao(self):
        target = inspect_seed_target()
        output = format_seed_target_check()

        self.assertEqual(target.backend, "sqlite3")
        self.assertTrue(target.is_local)
        self.assertEqual(target.environment, "development")
        self.assertIn(f"fingerprint={target.fingerprint}", output)
        self.assertIn("scope=local", output)
        self.assertIn("credentials=omitted", output)
        self.assertNotIn(SQLITE_DATABASES["default"]["USER"], output)
        self.assertNotIn(SQLITE_DATABASES["default"]["PASSWORD"], output)
        self.assertNotIn(SQLITE_DATABASES["default"]["NAME"], output)

    @override_settings(
        DATABASES=REMOTE_DATABASES,
        PAC_ENVIRONMENT="homologation",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_inspecao_classifica_host_nao_loopback_como_remoto(self):
        target = inspect_seed_target()

        self.assertEqual(target.backend, "postgresql")
        self.assertFalse(target.is_local)
        self.assertEqual(target.scope, "remote")

    def test_alias_desconhecido_falha_sem_tentar_conectar(self):
        with self.assertRaisesMessage(CommandError, "Alias de banco desconhecido"):
            inspect_seed_target("inexistente")

    @override_settings(DATABASES={"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ""}})
    def test_configuracao_incompleta_falha_fechada(self):
        with self.assertRaisesMessage(CommandError, "ENGINE e NAME"):
            inspect_seed_target()


class SeedSafetyValidationTests(SimpleTestCase):
    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="production",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_recusa_producao_mesmo_com_opt_in_e_confirmacao(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "PAC_ENVIRONMENT"):
            validate_seed_execution(apply=True, confirm_target=fingerprint)

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_recusa_ambiente_ausente(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "PAC_ENVIRONMENT"):
            validate_seed_execution(apply=True, confirm_target=fingerprint)

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="development",
        ALLOW_HOMOLOGACAO_SEED=False,
    )
    def test_recusa_sem_opt_in(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "ALLOW_HOMOLOGACAO_SEED"):
            validate_seed_execution(apply=True, confirm_target=fingerprint)

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="development",
        ALLOW_HOMOLOGACAO_SEED="False",
    )
    def test_opt_in_textual_nao_contorna_a_validacao_fail_closed(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "ALLOW_HOMOLOGACAO_SEED"):
            validate_seed_execution(apply=True, confirm_target=fingerprint)

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="development",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_exige_apply_e_confirmacao_exata(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "--apply"):
            validate_seed_execution(apply=False, confirm_target=fingerprint)
        with self.assertRaisesMessage(CommandError, "--confirm-target"):
            validate_seed_execution(apply=True, confirm_target=None)
        with self.assertRaisesMessage(CommandError, "--confirm-target"):
            validate_seed_execution(apply=True, confirm_target="fingerprint-errado")

    @override_settings(
        DATABASES=SQLITE_DATABASES,
        PAC_ENVIRONMENT="development",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_autoriza_alvo_local_com_todas_as_travas(self):
        fingerprint = inspect_seed_target().fingerprint

        target = validate_seed_execution(
            apply=True,
            confirm_target=fingerprint.upper(),
        )

        self.assertEqual(target.fingerprint, fingerprint)

    @override_settings(
        DATABASES=REMOTE_DATABASES,
        PAC_ENVIRONMENT="homologation",
        ALLOW_HOMOLOGACAO_SEED=True,
        HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS=(),
    )
    def test_recusa_banco_remoto_fora_da_allowlist(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.assertRaisesMessage(CommandError, "banco remoto"):
            validate_seed_execution(apply=True, confirm_target=fingerprint)

    @override_settings(
        DATABASES=REMOTE_DATABASES,
        PAC_ENVIRONMENT="homologation",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_autoriza_banco_remoto_presente_na_allowlist(self):
        fingerprint = inspect_seed_target().fingerprint

        with self.settings(HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS=[fingerprint.upper()]):
            target = validate_seed_execution(
                apply=True,
                confirm_target=fingerprint,
            )

        self.assertFalse(target.is_local)


class SeedSafetyReportTests(SimpleTestCase):
    @override_settings(
        DATABASES=REMOTE_DATABASES,
        PAC_ENVIRONMENT="homologation",
        ALLOW_HOMOLOGACAO_SEED=True,
    )
    def test_relatorio_tem_campos_fixos_e_omite_segredos(self):
        report = build_safe_seed_report(
            counts={"unidades": 16, "demandas": 38},
            users_by_profile={"usuario": 8, "admin": 3},
            items_by_status={"validada": 20, "devolvida": 5},
            test_users={"usuario_teste": "usuario", "admin_teste": "admin"},
            dfd_numbers=["HML-DFD-001"],
        )

        data = report.as_safe_dict()
        output = format_safe_seed_report(report)

        self.assertEqual(
            data["credentials"],
            {
                "source": "HOMOLOGACAO_TEST_PASSWORD",
                "value": "omitted",
            },
        )
        self.assertEqual(data["counts"]["demandas"], 38)
        self.assertEqual(data["items_by_status"]["validada"], 20)
        self.assertIn("HML-DFD-001", output)
        for secret in (
            REMOTE_DATABASES["default"]["NAME"],
            REMOTE_DATABASES["default"]["HOST"],
            REMOTE_DATABASES["default"]["USER"],
            REMOTE_DATABASES["default"]["PASSWORD"],
        ):
            self.assertNotIn(secret, output)
