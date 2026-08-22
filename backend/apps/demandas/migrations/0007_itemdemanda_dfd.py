from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("demandas", "0006_ciclopac_demanda_ciclo_pac"), ("dfd", "0003_dfd_ciclo_pac_numero_por_ciclo")]

    operations = [
        migrations.AddField(
            model_name="itemdemanda", name="dfd",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="itens_vinculados", to="dfd.dfd"),
        ),
    ]
