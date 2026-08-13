from django.db import migrations, models
import django.db.models.deletion


def criar_ciclos_existentes(apps, schema_editor):
    CicloPAC = apps.get_model("demandas", "CicloPAC")
    Demanda = apps.get_model("demandas", "Demanda")
    for demanda in Demanda.objects.all().only("id", "ano_referencia"):
        ciclo, _ = CicloPAC.objects.get_or_create(ano=demanda.ano_referencia)
        Demanda.objects.filter(pk=demanda.pk).update(ciclo_pac_id=ciclo.pk)


class Migration(migrations.Migration):
    dependencies = [("demandas", "0005_itemdemanda_observacoes")]

    operations = [
        migrations.CreateModel(
            name="CicloPAC",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ano", models.PositiveIntegerField(unique=True)),
                ("ativo", models.BooleanField(default=True)),
            ],
            options={"ordering": ["-ano"]},
        ),
        migrations.AddField(
            model_name="demanda", name="ciclo_pac",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.PROTECT, related_name="demandas", to="demandas.ciclopac"),
        ),
        migrations.RunPython(criar_ciclos_existentes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="demanda", name="ciclo_pac",
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="demandas", to="demandas.ciclopac"),
        ),
    ]
