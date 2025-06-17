import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0005_auto_20190620_1425'),
    ]

    operations = [
        migrations.AlterField(
            model_name='developer',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
        migrations.AlterField(
            model_name='game',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
        migrations.AlterField(
            model_name='genre',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
        migrations.AlterField(
            model_name='tag',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
    ]
