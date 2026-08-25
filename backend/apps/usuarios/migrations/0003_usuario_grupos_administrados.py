from django.db import migrations, models


def preservar_escopo_dos_admins_existentes(apps, schema_editor):
    Usuario = apps.get_model("usuarios", "Usuario")
    GrupoContratacao = apps.get_model("grupos_contratacao", "GrupoContratacao")
    through = Usuario._meta.get_field("grupos_administrados").remote_field.through

    relacoes = []
    grupos_por_unidade = {}
    for usuario in Usuario.objects.filter(perfil="admin").exclude(unidade_id=None):
        grupos = grupos_por_unidade.setdefault(
            usuario.unidade_id,
            list(GrupoContratacao.objects.filter(unidade_admin_id=usuario.unidade_id)),
        )
        relacoes.extend(
            through(usuario_id=usuario.pk, grupocontratacao_id=grupo.pk)
            for grupo in grupos
        )
    through.objects.bulk_create(relacoes, ignore_conflicts=True)


def remover_escopos_preservados(apps, schema_editor):
    Usuario = apps.get_model("usuarios", "Usuario")
    through = Usuario._meta.get_field("grupos_administrados").remote_field.through
    through.objects.filter(usuario__perfil="admin").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("grupos_contratacao", "0001_initial"),
        ("usuarios", "0002_usuario_precisa_trocar_senha_alter_usuario_siape_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="usuario",
            name="grupos_administrados",
            field=models.ManyToManyField(
                blank=True,
                related_name="administradores",
                to="grupos_contratacao.grupocontratacao",
                verbose_name="Grupos de contratação administrados",
            ),
        ),
        migrations.RunPython(
            preservar_escopo_dos_admins_existentes,
            remover_escopos_preservados,
        ),
    ]
