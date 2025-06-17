import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0029_auto_20190918_1953'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='alternative_names_new',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            null=True, size=None,
                                                            verbose_name='Public alternative names'),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='height',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='screenshot',
            name='width',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
