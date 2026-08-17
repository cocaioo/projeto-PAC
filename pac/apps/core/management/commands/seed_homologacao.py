"""Cria uma massa fictícia, segura e repetível para homologar o MVP do PAC."""

from __future__ import annotations

import os
from collections import Counter
from datetime import UTC, date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import check_password, make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q

from apps.catalogo.models import ItemCatalogo
from apps.core.seed_homologacao_data import (
    ANO_REFERENCIA,
    CATALOGO,
    CENARIOS,
    GRUPOS,
    JUSTIFICATIVAS,
    MOTIVOS_DEVOLUCAO,
    SEED_NAMESPACE,
    UNIDADES,
    USUARIOS_BASE,
    VALIDATION_NAMESPACE,
)
from apps.core.seed_safety import (
    PASSWORD_ENV,
    build_safe_seed_report,
    format_safe_seed_report,
    format_seed_target_check,
    validate_seed_execution,
)
from apps.demandas.models import (
    CicloPAC,
    Demanda,
    ItemDemanda,
    Prioridade,
    StatusDemanda,
    StatusItemDemanda,
)
from apps.demandas.services import sincronizar_status_macro_demanda
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil
from apps.validacoes.models import TipoAcao, Validacao


SEED_SENT_AT = datetime(2098, 10, 1, 12, tzinfo=UTC)
DFD_PREFIX = "HML-MASSA-DFD-"
SPECIAL_OWNERS = {
    ("rascunho", 1): "usuario_rascunho",
    ("aguardando", 1): "usuario_aguardando",
    ("devolvida", 1): "usuario_devolvido",
    ("reenviada", 1): "usuario_reenviado",
    ("validada", 1): "usuario_validado",
    ("consolidada", 1): "usuario_consolidado",
}
ADMIN_BY_GROUP = {
    "tic": "admin_teste",
    "infraestrutura": "admin_outro_grupo",
    "almoxarifado": "admin_almoxarifado",
    "servicos": "admin_servicos",
    "permanentes": "admin_permanentes",
}
REQUESTER_UNIT_KEYS = (
    "cmpp",
    "cce",
    "ccn",
    "ct",
    "parnaiba",
    "picos",
    "floriano",
    "computacao",
    "enfermagem",
    "administracao",
    "matematica",
    "fisica",
    "letras",
)
SCENARIO_ITEM_STATUS = {
    "rascunho": StatusItemDemanda.RASCUNHO,
    "aguardando": StatusItemDemanda.AGUARDANDO_VALIDACAO,
    "devolvida": StatusItemDemanda.DEVOLVIDA,
    "reenviada": StatusItemDemanda.AGUARDANDO_VALIDACAO,
    "validada": StatusItemDemanda.VALIDADA,
    "consolidada": StatusItemDemanda.VALIDADA,
    "cancelada": StatusItemDemanda.CANCELADA,
}


class Command(BaseCommand):
    help = "Cria dados fictícios e determinísticos para desenvolvimento/homologação."

    def add_arguments(self, parser):
        parser.add_argument(
            "--check",
            action="store_true",
            help="Mostra o alvo sanitizado e não abre conexão nem grava dados.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Autoriza explicitamente a gravação após as demais travas.",
        )
        parser.add_argument(
            "--confirm-target",
            help="Fingerprint exibido por --check.",
        )

    def handle(self, *args, **options):
        if options["check"]:
            self.stdout.write(format_seed_target_check())
            return

        target = validate_seed_execution(
            apply=options["apply"],
            confirm_target=options["confirm_target"],
        )
        senha = os.environ.get(PASSWORD_ENV)
        if not senha:
            raise CommandError(
                f"Defina {PASSWORD_ENV} no ambiente antes de executar o seed."
            )

        specs = self._demand_specs()
        with transaction.atomic():
            unidades = self._upsert_unidades()
            usuarios = self._upsert_usuarios(unidades, senha, specs)
            grupos = self._upsert_grupos(unidades)
            catalogo = self._upsert_catalogo(grupos)
            ciclo = self._get_or_create_cycle()
            demandas = self._upsert_demandas(
                specs=specs,
                ciclo=ciclo,
                usuarios=usuarios,
                unidades=unidades,
                catalogo=catalogo,
            )
            self._reconcile_validacoes(
                demandas=demandas,
                usuarios=usuarios,
            )
            self._reconcile_dfds(
                demandas=demandas,
                ciclo=ciclo,
                grupos=grupos,
                usuarios=usuarios,
            )
            self._sincronizar_status(demandas)
            report = self._build_report(usuarios=usuarios)
            if report.target != target:
                raise CommandError("O alvo do banco mudou durante a execução do seed.")

        self.stdout.write(self.style.SUCCESS("Massa de homologação configurada."))
        self.stdout.write(format_safe_seed_report(report))

    @staticmethod
    def _demand_specs():
        specs = []
        ordinal = 0
        for scenario_index, (scenario, amount) in enumerate(CENARIOS):
            for scenario_number in range(1, amount + 1):
                ordinal += 1
                owner = SPECIAL_OWNERS.get(
                    (scenario, scenario_number),
                    f"hml_{scenario}_{scenario_number:02d}",
                )
                specs.append(
                    {
                        "ordinal": ordinal,
                        "scenario_index": scenario_index,
                        "scenario": scenario,
                        "scenario_number": scenario_number,
                        "owner": owner,
                        "unit_key": REQUESTER_UNIT_KEYS[(ordinal - 1) % len(REQUESTER_UNIT_KEYS)],
                        "marker": (
                            f"{SEED_NAMESPACE} "
                            f"{scenario}:{scenario_number:02d} — demanda fictícia para testes."
                        ),
                    }
                )
        return specs

    @staticmethod
    def _upsert_unidades():
        unidades = {}
        for key, sigla, nome in UNIDADES:
            unidade, _ = Unidade.objects.update_or_create(
                sigla=sigla,
                defaults={
                    "nome": nome,
                    "codigo": sigla,
                    "ativo": True,
                },
            )
            unidades[key] = unidade
        return unidades

    def _upsert_usuarios(self, unidades, senha, specs):
        definitions = list(USUARIOS_BASE)
        known = {definition[0] for definition in definitions}
        for spec in specs:
            username = spec["owner"]
            if username in known:
                continue
            first_name, last_name = self._requester_name(spec)
            definitions.append(
                (
                    username,
                    first_name,
                    last_name,
                    Perfil.USUARIO,
                    spec["unit_key"],
                    False,
                )
            )
            known.add(username)

        User = get_user_model()
        encoded_password = make_password(senha)
        password_matches = {}
        usuarios = {}
        for index, definition in enumerate(definitions, start=1):
            username, first_name, last_name, perfil, unit_key, is_staff = definition
            email = f"{username}@homologacao.invalid"
            siape = f"HML-{index:05d}"
            existing = User.objects.filter(username=username).first()
            if existing and not existing.email.endswith("@homologacao.invalid"):
                raise CommandError(
                    f"Colisão segura: o usuário {username!r} não pertence ao seed."
                )
            if User.objects.filter(email=email).exclude(username=username).exists():
                raise CommandError(f"Colisão segura no e-mail reservado de {username!r}.")
            if User.objects.filter(siape=siape).exclude(username=username).exists():
                raise CommandError(f"Colisão segura no SIAPE reservado de {username!r}.")

            user, created = User.objects.update_or_create(
                username=username,
                defaults={
                    "email": email,
                    "siape": siape,
                    "first_name": first_name,
                    "last_name": last_name,
                    "perfil": perfil,
                    "unidade": unidades[unit_key],
                    "is_active": True,
                    "is_staff": is_staff,
                    "is_superuser": False,
                },
            )
            if created:
                current_hash_matches = True
            elif user.password in password_matches:
                current_hash_matches = password_matches[user.password]
            else:
                current_hash_matches = check_password(senha, user.password)
                password_matches[user.password] = current_hash_matches
            if created or not current_hash_matches:
                user.password = encoded_password
                user.save(update_fields=["password"])
            usuarios[username] = user
        return usuarios

    @staticmethod
    def _requester_name(spec):
        labels = {
            "rascunho": "Rascunho",
            "aguardando": "Aguardando",
            "parcial": "Parcial",
            "devolvida": "Devolvida",
            "reenviada": "Reenviada",
            "validada": "Validada",
            "consolidada": "Consolidada",
            "cancelada": "Cancelada",
        }
        return (
            "Pessoa",
            f"{labels[spec['scenario']]} {spec['scenario_number']:02d}",
        )

    @staticmethod
    def _get_or_create_cycle():
        ciclo, created = CicloPAC.objects.get_or_create(
            ano=ANO_REFERENCIA,
            defaults={"ativo": True},
        )
        if created:
            return ciclo

        # Ciclos ativos são infraestrutura compartilhada: o seed acrescenta
        # somente seus registros namespaced e preserva as demandas existentes.
        if ciclo.ativo:
            return ciclo

        seed_demands = ciclo.demandas.filter(
            Q(observacao__startswith=SEED_NAMESPACE)
            | Q(observacao__startswith="[SEED HOMOLOGACAO]")
        )
        seed_dfds = ciclo.dfds.filter(
            Q(numero__startswith=DFD_PREFIX) | Q(numero="HML-DFD-001")
        )
        foreign_demands = ciclo.demandas.exclude(pk__in=seed_demands)
        foreign_dfds = ciclo.dfds.exclude(pk__in=seed_dfds)
        has_seed_data = seed_demands.exists() or seed_dfds.exists()
        if foreign_demands.exists() or foreign_dfds.exists() or not has_seed_data:
            raise CommandError(
                f"Colisão segura: o ciclo inativo {ANO_REFERENCIA} não pode ser "
                "reativado sem exclusividade do seed."
            )
        ciclo.ativo = True
        ciclo.save(update_fields=["ativo"])
        return ciclo

    @staticmethod
    def _single_or_none(queryset, label):
        matches = list(queryset.order_by("pk")[:2])
        if len(matches) > 1:
            raise CommandError(
                f"Colisão segura: há mais de um registro para {label}; corrija antes do seed."
            )
        return matches[0] if matches else None

    def _upsert_grupos(self, unidades):
        grupos = {}
        for key, nome, descricao, unit_key in GRUPOS:
            grupo = self._single_or_none(
                GrupoContratacao.objects.filter(nome=nome),
                f"grupo {nome!r}",
            )
            defaults = {
                "descricao": descricao,
                "unidade_admin": unidades[unit_key],
                "ativo": True,
            }
            if grupo is None:
                grupo = GrupoContratacao.objects.create(nome=nome, **defaults)
            else:
                for field, value in defaults.items():
                    setattr(grupo, field, value)
                grupo.save(update_fields=[*defaults, "atualizado_em"])
            grupos[key] = grupo
        return grupos

    def _upsert_catalogo(self, grupos):
        catalogo = {}
        for definition in CATALOGO:
            code = definition["codigo"]
            item = self._single_or_none(
                ItemCatalogo.objects.filter(codigo_catmat_catser=code),
                f"item de catálogo {code!r}",
            )
            defaults = {
                "tipo": definition["tipo"],
                "nome": definition["nome"],
                "descricao": definition["descricao"],
                "grupo": grupos[definition["grupo"]],
                "unidade_medida": definition["unidade_medida"],
                "valor_estimado": definition["valor_estimado"],
                "ativo": definition["ativo"],
            }
            if item is None:
                item = ItemCatalogo.objects.create(
                    codigo_catmat_catser=code,
                    **defaults,
                )
            else:
                for field, value in defaults.items():
                    setattr(item, field, value)
                item.save(update_fields=[*defaults, "atualizado_em"])
            catalogo[code] = item
        return catalogo

    def _upsert_demandas(self, *, specs, ciclo, usuarios, unidades, catalogo):
        active_catalog = [
            catalogo[definition["codigo"]]
            for definition in CATALOGO
            if definition["ativo"]
        ]
        catalog_by_group = {}
        for item in active_catalog:
            catalog_by_group.setdefault(item.grupo_id, []).append(item)

        demandas = []
        for spec in specs:
            user = usuarios[spec["owner"]]
            existing = Demanda.objects.filter(
                usuario=user,
                ano_referencia=ANO_REFERENCIA,
            )
            reserved = existing.filter(observacao__startswith=SEED_NAMESPACE)
            demanda = self._single_or_none(
                reserved,
                f"demanda reservada de {user.username!r}/{ANO_REFERENCIA}",
            )
            # Cada owner de cenário é uma conta exclusiva do seed. Isso permite
            # recuperar o registro mesmo se a observação tiver sido editada.
            if demanda is None and existing.count() == 1:
                demanda = existing.first()
            if demanda is None and existing.exists():
                raise CommandError(
                    f"Colisão segura: {user.username!r} possui demanda não reservada em "
                    f"{ANO_REFERENCIA}."
                )
            values = {
                "unidade": user.unidade,
                "ciclo_pac": ciclo,
                "status": StatusDemanda.RASCUNHO,
                "observacao": spec["marker"],
                "enviada_em": None
                if spec["scenario"] == "rascunho"
                else SEED_SENT_AT,
            }
            if demanda is None:
                demanda = Demanda.objects.create(
                    usuario=user,
                    ano_referencia=ANO_REFERENCIA,
                    **values,
                )
            else:
                if not (
                    demanda.observacao.startswith(SEED_NAMESPACE)
                    or demanda.observacao.startswith("[SEED HOMOLOGACAO]")
                ):
                    raise CommandError(
                        f"Colisão segura: demanda {demanda.pk} não pertence ao seed."
                    )
                for field, value in values.items():
                    setattr(demanda, field, value)
                demanda.save(update_fields=[*values, "atualizado_em"])

            self._reconcile_items(
                demanda=demanda,
                spec=spec,
                active_catalog=active_catalog,
                catalog_by_group=catalog_by_group,
            )
            demandas.append((spec, demanda))
        return demandas

    def _reconcile_items(self, *, demanda, spec, active_catalog, catalog_by_group):
        scenario = spec["scenario"]
        desired_count = 1 + ((spec["ordinal"] * 3 + spec["scenario_index"]) % 8)
        if scenario == "parcial":
            desired_count = max(2, desired_count)
        allow_manual = scenario in {"rascunho", "cancelada"}
        manual_count = 1 if allow_manual and desired_count > 1 else 0
        catalog_count = desired_count - manual_count

        if scenario == "consolidada":
            group_key = GRUPOS[(spec["scenario_number"] - 1) % len(GRUPOS)][0]
            group_name = next(group[1] for group in GRUPOS if group[0] == group_key)
            group_id = GrupoContratacao.objects.get(nome=group_name).id
            pool = catalog_by_group[group_id]
            catalog_count = min(max(1, catalog_count), len(pool))
        else:
            pool = active_catalog

        start = (spec["ordinal"] * 5) % len(pool)
        selected = [pool[(start + index) % len(pool)] for index in range(catalog_count)]
        desired_keys = {f"catalog:{item.pk}" for item in selected}
        if manual_count:
            desired_keys.add("manual:1")

        existing_items = list(demanda.itens.select_related("item_catalogo"))
        kept_manual = False
        for existing in existing_items:
            key = (
                f"catalog:{existing.item_catalogo_id}"
                if existing.item_catalogo_id
                else "manual:1"
            )
            duplicate_manual = key == "manual:1" and kept_manual
            if key == "manual:1":
                kept_manual = True
            if key not in desired_keys or duplicate_manual:
                existing.delete()

        for index, catalog_item in enumerate(selected, start=1):
            self._upsert_item(
                demanda=demanda,
                spec=spec,
                item_index=index,
                catalog_item=catalog_item,
            )
        if manual_count:
            self._upsert_item(
                demanda=demanda,
                spec=spec,
                item_index=catalog_count + 1,
                catalog_item=None,
            )

    @staticmethod
    def _item_status(spec, item_index):
        if spec["scenario"] == "parcial":
            return (
                StatusItemDemanda.VALIDADA
                if item_index % 2
                else StatusItemDemanda.AGUARDANDO_VALIDACAO
            )
        return SCENARIO_ITEM_STATUS[spec["scenario"]]

    def _upsert_item(self, *, demanda, spec, item_index, catalog_item):
        priority = (Prioridade.BAIXA, Prioridade.MEDIA, Prioridade.ALTA)[
            (spec["ordinal"] + item_index) % 3
        ]
        quantity_options = (1, 2, 5, 10, 25, 50, 75, 100)
        quantity = quantity_options[(spec["ordinal"] + item_index) % len(quantity_options)]
        if catalog_item is None:
            lookup = {"demanda": demanda, "item_catalogo": None}
            item_type = "servico" if spec["ordinal"] % 2 else "material"
            name = f"Item manual fictício {spec['ordinal']:02d}"
            description = (
                "Item fora do catálogo incluído apenas para testar o preenchimento manual "
                "e o comportamento das telas de rascunho/cancelamento."
            )
            unit = "serviço" if item_type == "servico" else "unidade"
            unit_value = Decimal("875.50") + Decimal(spec["ordinal"] * 10)
        else:
            lookup = {"demanda": demanda, "item_catalogo": catalog_item}
            item_type = catalog_item.tipo
            name = catalog_item.nome
            description = catalog_item.descricao
            unit = catalog_item.unidade_medida
            unit_value = catalog_item.valor_estimado

        defaults = {
            "tipo": item_type,
            "nome": name,
            "descricao": description,
            "unidade_medida": unit,
            "quantidade": quantity,
            "valor_estimado": unit_value,
            "valor_total": unit_value * quantity,
            "data_prevista": date(ANO_REFERENCIA, 3 + (item_index % 9), 15),
            "prioridade": priority,
            "justificativa_prioridade": (
                "Prioridade alta justificada pelo calendário acadêmico e pelo risco operacional."
                if priority == Prioridade.ALTA
                else ""
            ),
            "justificativa_necessidade": JUSTIFICATIVAS[
                (spec["ordinal"] + item_index) % len(JUSTIFICATIVAS)
            ],
            "indicacao_orcamentaria": (
                f"Planejamento fictício {ANO_REFERENCIA} — fonte de teste {spec['ordinal']:02d}"
            ),
            "observacoes": (
                "Observação curta."
                if item_index % 2
                else "Observação fictícia mais longa para verificar quebra de linha, "
                "truncamento e leitura em tabelas e cartões responsivos do front-end."
            ),
            "status": self._item_status(spec, item_index),
            "dfd": None,
        }
        item, _ = ItemDemanda.objects.update_or_create(
            **lookup,
            defaults=defaults,
        )
        return item

    def _reconcile_validacoes(self, *, demandas, usuarios):
        for spec, demanda in demandas:
            for item_index, item in enumerate(demanda.itens.order_by("pk"), start=1):
                desired_action = None
                desired_comment = None
                if spec["scenario"] == "parcial" and item.status == StatusItemDemanda.VALIDADA:
                    desired_action = TipoAcao.VALIDADO
                    desired_comment = "Item parcial aprovado pelo administrador responsável."
                elif spec["scenario"] in {"devolvida", "reenviada"}:
                    desired_action = TipoAcao.DEVOLVIDO
                    desired_comment = MOTIVOS_DEVOLUCAO[
                        (spec["ordinal"] + item_index) % len(MOTIVOS_DEVOLUCAO)
                    ]
                elif spec["scenario"] in {"validada", "consolidada"}:
                    desired_action = TipoAcao.VALIDADO
                    desired_comment = "Item aprovado para consolidação no PAC fictício."

                seed_history = list(
                    item.validacoes.filter(
                        comentario__startswith=VALIDATION_NAMESPACE
                    ).order_by("pk")
                )
                if desired_action is None:
                    for validation in seed_history:
                        validation.delete()
                    continue

                admin = self._admin_for_item(item=item, usuarios=usuarios)
                comment = f"{VALIDATION_NAMESPACE} {desired_comment}"
                if seed_history:
                    validation = seed_history[0]
                    validation.usuario = admin
                    validation.acao = desired_action
                    validation.comentario = comment
                    validation.save(update_fields=["usuario", "acao", "comentario"])
                    for duplicate in seed_history[1:]:
                        duplicate.delete()
                else:
                    Validacao.objects.create(
                        item_demanda=item,
                        usuario=admin,
                        acao=desired_action,
                        comentario=comment,
                    )

    @staticmethod
    def _admin_for_item(*, item, usuarios):
        if item.item_catalogo_id is None:
            return usuarios["admin_master_teste"]
        group_key = next(
            key
            for key, group_name, *_ in GRUPOS
            if group_name == item.item_catalogo.grupo.nome
        )
        return usuarios[ADMIN_BY_GROUP[group_key]]

    def _reconcile_dfds(self, *, demandas, ciclo, grupos, usuarios):
        consolidated = [pair for pair in demandas if pair[0]["scenario"] == "consolidada"]
        seed_item_ids = list(
            ItemDemanda.objects.filter(
                demanda__observacao__startswith=SEED_NAMESPACE,
                demanda__ano_referencia=ANO_REFERENCIA,
            ).values_list("pk", flat=True)
        )
        DFD.itens_demanda.through.objects.filter(
            itemdemanda_id__in=seed_item_ids
        ).delete()

        for index, (spec, demanda) in enumerate(consolidated, start=1):
            group_key = GRUPOS[(index - 1) % len(GRUPOS)][0]
            number = f"{DFD_PREFIX}{index:03d}"
            dfd = DFD.objects.filter(
                numero=number,
                ciclo_pac=ciclo,
            ).first()
            if dfd is not None and not dfd.observacao.startswith(SEED_NAMESPACE):
                raise CommandError(
                    f"Colisão segura: o DFD {number!r} não pertence ao seed."
                )
            if dfd is not None:
                foreign_fk = ItemDemanda.objects.filter(dfd=dfd).exclude(
                    pk__in=seed_item_ids
                )
                foreign_m2m = dfd.itens_demanda.exclude(pk__in=seed_item_ids)
                if foreign_fk.exists() or foreign_m2m.exists():
                    raise CommandError(
                        f"Colisão segura: o DFD {number!r} possui itens fora do seed."
                    )

            values = {
                "grupo": grupos[group_key],
                "criado_por": usuarios[ADMIN_BY_GROUP[group_key]],
                "numero_processo": f"23111.{index:06d}/{ANO_REFERENCIA}-01",
                "link_publico": f"https://example.invalid/dfd/{index:03d}",
                "observacao": f"{SEED_NAMESPACE} Documento fictício consolidado.",
            }
            if dfd is None:
                dfd = DFD.objects.create(
                    numero=number,
                    ciclo_pac=ciclo,
                    **values,
                )
            else:
                for field, value in values.items():
                    setattr(dfd, field, value)
                dfd.save(update_fields=[*values, "atualizado_em"])

            items = list(demanda.itens.order_by("pk"))
            demanda.itens.update(
                dfd=dfd,
                status=StatusItemDemanda.VINCULADA_DFD,
            )
            dfd.itens_demanda.set(items)

        active_numbers = {
            f"{DFD_PREFIX}{index:03d}" for index in range(1, len(consolidated) + 1)
        }
        stale_dfds = DFD.objects.filter(
            numero__startswith=DFD_PREFIX,
            ciclo_pac=ciclo,
        ).exclude(numero__in=active_numbers)
        if stale_dfds.exists():
            raise CommandError(
                "Há DFDs antigos do namespace do seed; revise-os antes de continuar."
            )

    @staticmethod
    def _sincronizar_status(demandas):
        for spec, demanda in demandas:
            if spec["scenario"] == "cancelada":
                demanda.status = StatusDemanda.CANCELADA
                demanda.save(update_fields=["status", "atualizado_em"])
            else:
                demanda.status = StatusDemanda.RASCUNHO
                demanda.save(update_fields=["status", "atualizado_em"])
                sincronizar_status_macro_demanda(demanda)

    @staticmethod
    def _build_report(*, usuarios):
        demand_qs = Demanda.objects.filter(
            observacao__startswith=SEED_NAMESPACE,
            ano_referencia=ANO_REFERENCIA,
        )
        item_qs = ItemDemanda.objects.filter(demanda__in=demand_qs)
        catalog_codes = [definition["codigo"] for definition in CATALOGO]
        catalog_qs = ItemCatalogo.objects.filter(
            codigo_catmat_catser__in=catalog_codes
        )
        dfd_qs = DFD.objects.filter(
            numero__startswith=DFD_PREFIX,
            ciclo_pac__ano=ANO_REFERENCIA,
        )
        validation_qs = Validacao.objects.filter(item_demanda__in=item_qs)
        scenario_counts = Counter(
            observation.removeprefix(SEED_NAMESPACE).strip().split(":", maxsplit=1)[0]
            for observation in demand_qs.values_list("observacao", flat=True)
        )
        counts = {
            "unidades": Unidade.objects.filter(
                sigla__in=[definition[1] for definition in UNIDADES]
            ).count(),
            "grupos": GrupoContratacao.objects.filter(
                nome__in=[definition[1] for definition in GRUPOS]
            ).count(),
            "usuarios": len(usuarios),
            "catalogo": catalog_qs.count(),
            "catalogo_ativo": catalog_qs.filter(ativo=True).count(),
            "catalogo_inativo": catalog_qs.filter(ativo=False).count(),
            "demandas": demand_qs.count(),
            "itens_demanda": item_qs.count(),
            "itens_manuais": item_qs.filter(item_catalogo__isnull=True).count(),
            "validacoes": validation_qs.count(),
            "dfds": dfd_qs.count(),
            **{f"cenario_{name}": amount for name, amount in sorted(scenario_counts.items())},
        }
        users_by_profile = Counter(
            user.perfil for user in usuarios.values()
        )
        items_by_status = Counter(item_qs.values_list("status", flat=True))
        test_users = {
            "usuario_comum": "usuario_teste",
            "usuario_sem_demanda": "usuario_sem_demanda",
            "usuario_rascunho": "usuario_rascunho",
            "usuario_aguardando": "usuario_aguardando",
            "usuario_devolvido": "usuario_devolvido",
            "usuario_reenviado": "usuario_reenviado",
            "usuario_validado": "usuario_validado",
            "usuario_consolidado": "usuario_consolidado",
            "admin_tic": "admin_teste",
            "admin_outro_grupo": "admin_outro_grupo",
            "admin_master": "admin_master_teste",
        }
        return build_safe_seed_report(
            counts=counts,
            users_by_profile=users_by_profile,
            items_by_status=items_by_status,
            test_users=test_users,
            dfd_numbers=dfd_qs.order_by("numero").values_list("numero", flat=True),
        )
