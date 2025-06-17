import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('files', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='file',
            name='platforms',
        ),
        migrations.AddField(
            model_name='cheatcode',
            name='languages',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=2), blank=True,
                                                            default=list, size=None),
        ),
        migrations.AddField(
            model_name='file',
            name='windows',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=5), blank=True,
                                                            default=list, size=None),
        ),
    ]
