import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0021_delete_promofeatured'),
    ]

    operations = [
        migrations.AddField(
            model_name='gameplatform',
            name='requirements_en',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='gameplatform',
            name='requirements_ru',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, null=True),
        ),
    ]
