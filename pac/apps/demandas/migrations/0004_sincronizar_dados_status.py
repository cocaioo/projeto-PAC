from django.db import migrations


def sincronizar_status_dados(apps, schema_editor):
    """
    Sincroniza os status de Demanda e ItemDemanda no banco de dados.
    Normaliza itens legados em 'consolidada' para 'vinculada_dfd' e recalcula
    o status macro de cada Demanda com base no estado real dos seus itens.
    """
    Demanda = apps.get_model("demandas", "Demanda")
    ItemDemanda = apps.get_model("demandas", "ItemDemanda")

    # 1. Normalização dos itens legados em 'consolidada' -> 'vinculada_dfd'
    for item in ItemDemanda.objects.filter(status="consolidada"):
        # Se associado a algum DFD ou se for dado legado de consolidação
        item.status = "vinculada_dfd"
        item.save(update_fields=["status"])

    # 2. Recálculo determinístico do status macro para cada Demanda
    for demanda in Demanda.objects.all():
        if demanda.status == "cancelada":
            continue

        itens = list(ItemDemanda.objects.filter(demanda_id=demanda.id))
        if not itens:
            novo_status = "rascunho"
        else:
            ativos = [i for i in itens if i.status != "cancelada"]
            if not ativos:
                novo_status = "cancelada"
            elif all(i.status == "rascunho" for i in ativos):
                novo_status = "rascunho"
            elif all(i.status == "aguardando_validacao" for i in ativos):
                novo_status = "aguardando_validacao"
            elif all(i.status in ["vinculada_dfd", "consolidada"] for i in ativos):
                novo_status = "concluida"
            else:
                novo_status = "em_andamento"

        if demanda.status != novo_status:
            demanda.status = novo_status
            demanda.save(update_fields=["status"])


def reverter_sincronizacao_dados(apps, schema_editor):
    """
    Reversão semântica aproximada da migração de dados.
    Aviso: A reversão é aproximada e não restaura exatamente dados históricos alterados.
    """
    Demanda = apps.get_model("demandas", "Demanda")
    ItemDemanda = apps.get_model("demandas", "ItemDemanda")

    ItemDemanda.objects.filter(status="vinculada_dfd").update(status="consolidada")
    Demanda.objects.filter(status="em_andamento").update(status="validada")
    Demanda.objects.filter(status="concluida").update(status="consolidada")


class Migration(migrations.Migration):

    dependencies = [
        ("demandas", "0003_alter_demanda_status_alter_itemdemanda_status"),
    ]

    operations = [
        migrations.RunPython(
            sincronizar_status_dados,
            reverse_code=reverter_sincronizacao_dados,
        ),
    ]
