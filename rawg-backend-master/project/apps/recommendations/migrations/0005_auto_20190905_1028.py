import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('recommendations', '0004_auto_20190905_1018'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='userrecommendation',
            name='related_id',
        ),
        migrations.AddField(
            model_name='userrecommendation',
            name='related_ids',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=30), default=list,
                                                            size=None),
        ),
    ]
