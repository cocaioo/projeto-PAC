"""Proteções fail-closed e saídas sanitizadas para seeds de demonstração."""

from __future__ import annotations

import hashlib
import hmac
import ipaddress
import json
from dataclasses import dataclass
from typing import Any, Iterable, Mapping

from django.conf import settings
from django.core.management.base import CommandError


ALLOWED_SEED_ENVIRONMENTS = frozenset({"development", "homologation"})
PASSWORD_ENV = "HOMOLOGACAO_TEST_PASSWORD"
TARGET_FINGERPRINT_LENGTH = 24


@dataclass(frozen=True, slots=True)
class SeedTarget:
    """Metadados suficientes para confirmar um alvo sem revelar a conexão."""

    fingerprint: str
    backend: str
    is_local: bool
    environment: str

    @property
    def scope(self) -> str:
        return "local" if self.is_local else "remote"

    def as_safe_dict(self) -> dict[str, str | bool]:
        return {
            "backend": self.backend,
            "environment": self.environment or "unset",
            "fingerprint": self.fingerprint,
            "is_local": self.is_local,
            "scope": self.scope,
        }


@dataclass(frozen=True, slots=True)
class SeedReport:
    """Relatório por allowlist; não possui campo capaz de receber uma senha."""

    target: SeedTarget
    counts: Mapping[str, int]
    users_by_profile: Mapping[str, int]
    items_by_status: Mapping[str, int]
    test_users: Mapping[str, str]
    dfd_numbers: tuple[str, ...]

    def as_safe_dict(self) -> dict[str, Any]:
        return {
            "target": self.target.as_safe_dict(),
            "credentials": {
                "source": PASSWORD_ENV,
                "value": "omitted",
            },
            "counts": _integer_mapping(self.counts),
            "users_by_profile": _integer_mapping(self.users_by_profile),
            "items_by_status": _integer_mapping(self.items_by_status),
            "test_users": _string_mapping(self.test_users),
            "dfd_numbers": [str(number) for number in self.dfd_numbers],
        }


def _database_config(database_alias: str) -> Mapping[str, Any]:
    try:
        return settings.DATABASES[database_alias]
    except KeyError as exc:
        raise CommandError(f"Alias de banco desconhecido para o seed: {database_alias!r}.") from exc


def _canonical_target(database_config: Mapping[str, Any]) -> str:
    engine = str(database_config.get("ENGINE") or "").strip().lower()
    name = str(database_config.get("NAME") or "").strip()
    host = str(database_config.get("HOST") or "").strip().lower()
    port = str(database_config.get("PORT") or "").strip()

    return "\x1f".join((engine, host, port, name))


def database_target_fingerprint(database_config: Mapping[str, Any]) -> str:
    """Identifica ENGINE/HOST/PORT/NAME sem incluir usuário ou senha."""

    canonical_target = _canonical_target(database_config)
    return hashlib.sha256(canonical_target.encode("utf-8")).hexdigest()[:TARGET_FINGERPRINT_LENGTH]


def _is_loopback_host(host: str) -> bool:
    normalized = host.strip().lower().strip("[]")
    if normalized in {"", "localhost"}:
        return True
    try:
        return ipaddress.ip_address(normalized).is_loopback
    except ValueError:
        return False


def _is_local_target(database_config: Mapping[str, Any]) -> bool:
    return _is_loopback_host(str(database_config.get("HOST") or ""))


def inspect_seed_target(database_alias: str = "default") -> SeedTarget:
    """Inspeciona somente settings; não abre conexão nem consulta o banco."""

    database_config = _database_config(database_alias)
    engine = str(database_config.get("ENGINE") or "").strip().lower()
    name = str(database_config.get("NAME") or "").strip()
    if not engine or not name:
        raise CommandError(
            "Configuração de banco incompleta para o seed; ENGINE e NAME são obrigatórios."
        )
    backend = engine.rsplit(".", maxsplit=1)[-1] or "unknown"
    environment = str(getattr(settings, "PAC_ENVIRONMENT", "")).strip().lower()
    return SeedTarget(
        fingerprint=database_target_fingerprint(database_config),
        backend=backend,
        is_local=_is_local_target(database_config),
        environment=environment,
    )


def _remote_fingerprint_allowlist() -> set[str]:
    configured = getattr(settings, "HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS", ())
    if isinstance(configured, str):
        configured = configured.split(",")
    return {
        str(fingerprint).strip().lower() for fingerprint in configured if str(fingerprint).strip()
    }


def validate_seed_execution(
    *,
    apply: bool,
    confirm_target: str | None,
    database_alias: str = "default",
) -> SeedTarget:
    """Autoriza o seed somente após todas as travas explícitas."""

    target = inspect_seed_target(database_alias)
    if target.environment not in ALLOWED_SEED_ENVIRONMENTS:
        allowed = ", ".join(sorted(ALLOWED_SEED_ENVIRONMENTS))
        raise CommandError(
            f"Seed bloqueado: PAC_ENVIRONMENT deve ser explicitamente um de [{allowed}]."
        )

    if getattr(settings, "ALLOW_HOMOLOGACAO_SEED", False) is not True:
        raise CommandError(
            "Seed bloqueado: defina ALLOW_HOMOLOGACAO_SEED=True somente no ambiente autorizado."
        )

    if not apply:
        raise CommandError("Seed bloqueado: a gravação exige a opção explícita --apply.")

    confirmation = (confirm_target or "").strip().lower()
    if not confirmation or not hmac.compare_digest(
        confirmation,
        target.fingerprint,
    ):
        raise CommandError(
            "Seed bloqueado: --confirm-target não corresponde ao fingerprint mostrado por --check."
        )

    if not target.is_local and target.fingerprint not in _remote_fingerprint_allowlist():
        raise CommandError(
            "Seed bloqueado: banco remoto não consta em HOMOLOGACAO_SEED_REMOTE_FINGERPRINTS."
        )

    return target


def format_seed_target_check(database_alias: str = "default") -> str:
    """Retorna uma linha segura para o modo --check."""

    target = inspect_seed_target(database_alias)
    opt_in = getattr(settings, "ALLOW_HOMOLOGACAO_SEED", False) is True
    return (
        f"environment={target.environment or 'unset'} "
        f"backend={target.backend} scope={target.scope} "
        f"fingerprint={target.fingerprint} "
        f"opt_in={'enabled' if opt_in else 'disabled'} "
        "credentials=omitted"
    )


def build_safe_seed_report(
    *,
    counts: Mapping[str, int],
    users_by_profile: Mapping[str, int],
    items_by_status: Mapping[str, int],
    test_users: Mapping[str, str],
    dfd_numbers: Iterable[str],
    database_alias: str = "default",
) -> SeedReport:
    """Monta um relatório com campos fixos e sem entrada para credenciais."""

    return SeedReport(
        target=inspect_seed_target(database_alias),
        counts=_integer_mapping(counts),
        users_by_profile=_integer_mapping(users_by_profile),
        items_by_status=_integer_mapping(items_by_status),
        test_users=_string_mapping(test_users),
        dfd_numbers=tuple(str(number) for number in dfd_numbers),
    )


def format_safe_seed_report(report: SeedReport) -> str:
    return json.dumps(
        report.as_safe_dict(),
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    )


def _integer_mapping(values: Mapping[str, int]) -> dict[str, int]:
    return {str(key): int(value) for key, value in values.items()}


def _string_mapping(values: Mapping[str, str]) -> dict[str, str]:
    return {str(key): str(value) for key, value in values.items()}
