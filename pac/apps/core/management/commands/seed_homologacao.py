import os
from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.catalogo.models import ItemCatalogo
from apps.demandas.models import Demanda, ItemDemanda, StatusItemDemanda
from apps.dfd.models import DFD
from apps.grupos_contratacao.models import GrupoContratacao
from apps.unidades.models import Unidade
from apps.usuarios.models import Perfil


class Command(BaseCommand):
    help = "Cria usuarios e dados idempotentes para homologacao."

    def handle(self, *args, **options):
        senha = os.environ.get("HOMOLOGACAO_TEST_PASSWORD")
        solicitante_unidade, _ = Unidade.objects.get_or_create(sigla="CCN", defaults={"nome": "Centro de Ciencias da Natureza", "codigo": "CCN"})
        admin_unidade, _ = Unidade.objects.get_or_create(sigla="STI", defaults={"nome": "Superintendencia de TI", "codigo": "STI"})
        outra_unidade, _ = Unidade.objects.get_or_create(sigla="PREUNI", defaults={"nome": "Prefeitura Universitaria", "codigo": "PREUNI"})
        User = get_user_model()
        usuarios = {
            "usuario_teste": (Perfil.USUARIO, solicitante_unidade),
            "admin_teste": (Perfil.ADMIN, admin_unidade),
            "admin_outro_grupo": (Perfil.ADMIN, outra_unidade),
            "admin_master_teste": (Perfil.ADMIN_MASTER, admin_unidade),
        }
        criados = {}
        for username, (perfil, unidade) in usuarios.items():
            user, _ = User.objects.get_or_create(username=username, defaults={
                "email": f"{username}@example.com", "siape": f"HML-{username}",
                "first_name": username, "perfil": perfil, "unidade": unidade,
            })
            user.perfil, user.unidade = perfil, unidade
            user.save(update_fields=["perfil", "unidade"])
            if senha:
                user.set_password(senha)
                user.save(update_fields=["password"])
            criados[username] = user
        grupo, _ = GrupoContratacao.objects.get_or_create(nome="TIC Homologacao", defaults={"unidade_admin": admin_unidade})
        outro_grupo, _ = GrupoContratacao.objects.get_or_create(nome="Obras Homologacao", defaults={"unidade_admin": outra_unidade})
        catalogo, _ = ItemCatalogo.objects.get_or_create(nome="Notebook Homologacao", grupo=grupo, defaults={"tipo": "material", "descricao": "Notebook", "unidade_medida": "unidade", "valor_estimado": Decimal("5000")})
        outro_catalogo, _ = ItemCatalogo.objects.get_or_create(nome="Servico Outro Grupo", grupo=outro_grupo, defaults={"tipo": "servico", "descricao": "Servico", "unidade_medida": "mes", "valor_estimado": Decimal("100")})
        demanda, _ = Demanda.objects.get_or_create(unidade=solicitante_unidade, usuario=criados["usuario_teste"], ano_referencia=2027)
        def item(nome, status, catalogo_item, dfd=None):
            return ItemDemanda.objects.get_or_create(demanda=demanda, nome=nome, defaults={
                "item_catalogo": catalogo_item, "tipo": catalogo_item.tipo, "descricao": nome,
                "unidade_medida": catalogo_item.unidade_medida, "quantidade": 1, "valor_estimado": catalogo_item.valor_estimado,
                "valor_total": catalogo_item.valor_estimado, "data_prevista": date(2027, 1, 1), "prioridade": "media",
                "justificativa_prioridade": "Teste", "justificativa_necessidade": "Teste", "indicacao_orcamentaria": "Teste",
                "status": status, "dfd": dfd,
            })[0]
        item("Aguardando validacao", StatusItemDemanda.AGUARDANDO_VALIDACAO, catalogo)
        item("Devolvido", StatusItemDemanda.DEVOLVIDA, catalogo)
        item("Validado sem DFD", StatusItemDemanda.VALIDADA, catalogo)
        dfd, _ = DFD.objects.get_or_create(numero="HML-DFD-001", ciclo_pac=demanda.ciclo_pac, defaults={"grupo": grupo, "criado_por": criados["admin_teste"]})
        vinculado = item("Ja vinculado", StatusItemDemanda.VINCULADA_DFD, catalogo, dfd)
        if vinculado.dfd_id != dfd.id:
            vinculado.dfd, vinculado.status = dfd, StatusItemDemanda.VINCULADA_DFD
            vinculado.save(update_fields=["dfd", "status"])
        dfd.itens_demanda.add(vinculado)
        item("Item de outro grupo", StatusItemDemanda.VALIDADA, outro_catalogo)
        self.stdout.write(self.style.SUCCESS("Dados de homologacao configurados."))
