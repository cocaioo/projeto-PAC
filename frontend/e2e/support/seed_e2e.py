"""Cria somente os dados-base da suite Playwright em um banco descartavel."""

import os
import sys
from decimal import Decimal
from pathlib import Path


REPOSITORY_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = REPOSITORY_DIR / "backend"
sys.path.insert(0, str(BACKEND_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.db import transaction  # noqa: E402

from apps.catalogo.models import ItemCatalogo  # noqa: E402
from apps.grupos_contratacao.models import GrupoContratacao  # noqa: E402
from apps.unidades.models import Unidade  # noqa: E402
from apps.usuarios.models import Perfil  # noqa: E402


PASSWORD = os.environ["PAC_E2E_PASSWORD"]


@transaction.atomic
def seed():
    unidade_usuario, _ = Unidade.objects.update_or_create(
        sigla="E2E-CCN",
        defaults={"nome": "Unidade Solicitante E2E", "codigo": "E2E-CCN", "ativo": True},
    )
    unidade_admin, _ = Unidade.objects.update_or_create(
        sigla="E2E-STI",
        defaults={"nome": "Unidade Administradora E2E", "codigo": "E2E-STI", "ativo": True},
    )
    unidade_outro_admin, _ = Unidade.objects.update_or_create(
        sigla="E2E-PREUNI",
        defaults={"nome": "Outra Unidade Administradora E2E", "codigo": "E2E-PREUNI", "ativo": True},
    )

    grupo_principal, _ = GrupoContratacao.objects.update_or_create(
        nome="Tecnologia E2E",
        unidade_admin=unidade_admin,
        defaults={"descricao": "Grupo usado exclusivamente pelos E2E.", "ativo": True},
    )
    grupo_outro, _ = GrupoContratacao.objects.update_or_create(
        nome="Obras E2E",
        unidade_admin=unidade_outro_admin,
        defaults={"descricao": "Grupo fora do escopo do administrador principal.", "ativo": True},
    )

    ItemCatalogo.objects.update_or_create(
        nome="Notebook E2E",
        grupo=grupo_principal,
        defaults={
            "tipo": "material",
            "descricao": "Notebook institucional para o fluxo automatizado.",
            "codigo_catmat_catser": "E2E-CAT-001",
            "unidade_medida": "unidade",
            "valor_estimado": Decimal("5000.00"),
            "ativo": True,
        },
    )
    ItemCatalogo.objects.update_or_create(
        nome="Servico predial E2E",
        grupo=grupo_outro,
        defaults={
            "tipo": "servico",
            "descricao": "Item de outro grupo para validar o isolamento por escopo.",
            "codigo_catmat_catser": "E2E-CAT-002",
            "unidade_medida": "mes",
            "valor_estimado": Decimal("2500.00"),
            "ativo": True,
        },
    )

    usuarios = (
        ("usuario_e2e", Perfil.USUARIO, unidade_usuario, False),
        ("admin_e2e", Perfil.ADMIN, unidade_admin, True),
        ("admin_outro_e2e", Perfil.ADMIN, unidade_outro_admin, True),
        ("admin_master_e2e", Perfil.ADMIN_MASTER, unidade_admin, True),
    )
    Usuario = get_user_model()
    for indice, (username, perfil, unidade, is_staff) in enumerate(usuarios, start=1):
        usuario, _ = Usuario.objects.update_or_create(
            username=username,
            defaults={
                "first_name": username.replace("_", " ").title(),
                "last_name": "Playwright",
                "email": f"{username}@e2e.invalid",
                "siape": f"E2E-{indice:04d}",
                "perfil": perfil,
                "unidade": unidade,
                "is_active": True,
                "is_staff": is_staff,
                "is_superuser": False,
            },
        )
        usuario.set_password(PASSWORD)
        usuario.save(update_fields=["password"])

    # O escopo dos validadores E2E precisa ser explícito, sem depender do
    # fallback legado pela unidade administrativa.
    Usuario.objects.get(username="admin_e2e").grupos_administrados.set([grupo_principal])
    Usuario.objects.get(username="admin_outro_e2e").grupos_administrados.set([grupo_outro])


if __name__ == "__main__":
    seed()
    print("Massa E2E criada no banco descartavel.")
