import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0032_auto_20190920_1600'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='alternative_names_old',
        ),
        migrations.AlterField(
            model_name='game',
            name='alternative_names',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None,
                                                            verbose_name='Public alternative names'),
        ),
    ]
