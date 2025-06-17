import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('recommendations', '0002_auto_20190904_1524'),
    ]

    operations = [
        migrations.AddField(
            model_name='userrecommendation',
            name='related_id',
            field=models.CharField(blank=True, default=None, max_length=30, null=True),
        ),
        migrations.AlterField(
            model_name='userrecommendation',
            name='sources',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=13), db_index=True,
                                                            default=list, size=None),
        ),
    ]
