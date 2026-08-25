"""Bootstrap explícito e seguro do primeiro Admin Master."""

from __future__ import annotations

import os

from django.contrib.auth.password_validation import validate_password
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.db.models import Q

from apps.usuarios.models import Perfil, Usuario


USERNAME_ENV = "PAC_BOOTSTRAP_ADMIN_USERNAME"
EMAIL_ENV = "PAC_BOOTSTRAP_ADMIN_EMAIL"
PASSWORD_ENV = "PAC_BOOTSTRAP_ADMIN_PASSWORD"
DEFAULT_BOOTSTRAP_PASSWORD = "PacBootstrap!2026"
BOOTSTRAP_ENV_VARS = (USERNAME_ENV, EMAIL_ENV, PASSWORD_ENV)


class Command(BaseCommand):
    help = "Cria explicitamente o primeiro Admin Master e exige troca de senha no primeiro acesso."

    def add_arguments(self, parser):
        parser.add_argument(
            "--no-input",
            "--noinput",
            "--non-interactive",
            dest="no_input",
            action="store_true",
            help=(
                "Usa PAC_BOOTSTRAP_ADMIN_USERNAME, PAC_BOOTSTRAP_ADMIN_EMAIL "
                "e, opcionalmente, PAC_BOOTSTRAP_ADMIN_PASSWORD sem solicitar entrada. "
                "Sem a senha opcional, usa a senha temporaria padrao documentada."
            ),
        )

    def handle(self, *args, **options):
        # This fast path avoids asking for credentials when the command is run
        # again after the initial bootstrap.
        if self._has_effective_admin_master():
            self.stdout.write(
                "Já existe um Admin Master ou superuser; nenhuma alteração foi feita."
            )
            return

        no_input = options["no_input"] or self._has_bootstrap_environment()
        username, email, password = self._read_credentials(no_input=no_input)
        candidate = Usuario(
            username=username,
            email=email,
            first_name="Admin Master",
            perfil=Perfil.ADMIN_MASTER,
        )
        self._validate_identity(candidate)
        self._validate_password(candidate, password)

        try:
            with transaction.atomic():
                # ContentType is a migrated, single-row sentinel that lets
                # concurrent bootstrap commands serialize before the first
                # privileged user is inserted.
                self._lock_bootstrap_sentinel()

                if self._has_effective_admin_master():
                    self.stdout.write(
                        "Já existe um Admin Master ou superuser; nenhuma alteração foi feita."
                    )
                    return

                self._reject_non_master_conflicts(username=username, email=email)

                candidate.set_password(password)
                candidate.is_staff = True
                candidate.is_superuser = True
                candidate.is_active = True
                candidate.precisa_trocar_senha = True
                candidate.save(force_insert=True)
        except IntegrityError as exc:
            # Keep database details (and any credential values) out of the
            # command output while preserving the all-or-nothing transaction.
            raise CommandError(
                "Não foi possível criar o Admin Master: username ou e-mail já está em uso."
            ) from exc

        self.stdout.write(
            self.style.SUCCESS(
                f"Admin Master '{username}' criado; a senha deverá ser trocada no primeiro acesso."
            )
        )

    @staticmethod
    def _has_bootstrap_environment():
        return any(os.environ.get(name) is not None for name in BOOTSTRAP_ENV_VARS)

    def _read_credentials(self, *, no_input):
        if no_input:
            values = {name: os.environ.get(name) for name in BOOTSTRAP_ENV_VARS}
            missing = [
                name
                for name in (USERNAME_ENV, EMAIL_ENV)
                if not values[name]
            ]
            if missing:
                raise CommandError(
                    "Modo não interativo exige as variáveis: "
                    + ", ".join(missing)
                    + "."
                )
            return (
                values[USERNAME_ENV].strip(),
                values[EMAIL_ENV].strip(),
                values[PASSWORD_ENV] or DEFAULT_BOOTSTRAP_PASSWORD,
            )

        username = input("Username: ").strip()
        email = input("E-mail: ").strip()
        return (
            username,
            email,
            os.environ.get(PASSWORD_ENV) or DEFAULT_BOOTSTRAP_PASSWORD,
        )

    @staticmethod
    def _validation_message(error):
        return " ".join(str(message) for message in error.messages)

    def _validate_identity(self, candidate):
        try:
            Usuario._meta.get_field("username").clean(
                candidate.username,
                candidate,
            )
            Usuario._meta.get_field("email").clean(candidate.email, candidate)
        except ValidationError as exc:
            raise CommandError(
                f"Username ou e-mail inválido: {self._validation_message(exc)}"
            ) from exc

    def _validate_password(self, candidate, password):
        try:
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError(
                f"Senha inválida: {self._validation_message(exc)}"
            ) from exc

    @staticmethod
    def _has_effective_admin_master():
        return Usuario.objects.filter(
            Q(perfil=Perfil.ADMIN_MASTER) | Q(is_superuser=True)
        ).exists()

    @staticmethod
    def _lock_bootstrap_sentinel():
        content_type = ContentType.objects.get_for_model(Usuario)
        ContentType.objects.select_for_update().get(pk=content_type.pk)

    @staticmethod
    def _reject_non_master_conflicts(*, username, email):
        username_conflict = Usuario.objects.filter(username__iexact=username).exists()
        email_conflict = Usuario.objects.filter(email__iexact=email).exists()
        conflicts = []
        if username_conflict:
            conflicts.append("username")
        if email_conflict:
            conflicts.append("e-mail")
        if conflicts:
            raise CommandError(
                "Conflito: "
                + " e ".join(conflicts)
                + " já pertence a usuário que não é Admin Master."
            )
