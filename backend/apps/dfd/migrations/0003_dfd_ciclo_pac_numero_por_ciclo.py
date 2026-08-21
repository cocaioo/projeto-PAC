from django.db import migrations, models
import django.db.models.deletion


def vincular_dfds_existentes(apps, schema_editor):
    DFD = apps.get_model("dfd", "DFD")
    CicloPAC = apps.get_model("demandas", "CicloPAC")
    for dfd in DFD.objects.all():
        item = dfd.itens_demanda.select_related("demanda__ciclo_pac").first()
        ciclo = item.demanda.ciclo_pac if item else CicloPAC.objects.order_by("-ano").first()
        if ciclo is None:
            ciclo = CicloPAC.objects.create(ano=2000, ativo=False)
        DFD.objects.filter(pk=dfd.pk).update(ciclo_pac_id=ciclo.pk)


class Migration(migrations.Migration):
    dependencies = [("dfd", "0002_initial"), ("demandas", "0006_ciclopac_demanda_ciclo_pac")]

    operations = [
        migrations.AlterField(model_name="dfd", name="numero", field=models.CharField(max_length=100, verbose_name="N\u00famero do DFD")),
        migrations.AddField(
            model_name="dfd", name="ciclo_pac",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="dfds", to="demandas.ciclopac"),
        ),
        migrations.RunPython(vincular_dfds_existentes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="dfd", name="ciclo_pac",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="dfds", to="demandas.ciclopac"),
        ),
        migrations.AddConstraint(
            model_name="dfd",
            constraint=models.UniqueConstraint(fields=("numero", "ciclo_pac"), name="uniq_dfd_numero_por_ciclo"),
        ),
    ]
