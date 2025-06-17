import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0008_auto_20190716_1509'),
    ]

    operations = [
        migrations.AlterField(
            model_name='developer',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='developer',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
        migrations.AlterField(
            model_name='game',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
        migrations.AlterField(
            model_name='genre',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='genre',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='publisher',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
        migrations.AlterField(
            model_name='tag',
            name='merge_with',
            field=models.PositiveIntegerField(blank=True, default=None, editable=False, null=True),
        ),
        migrations.AlterField(
            model_name='tag',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, editable=False, size=None),
        ),
    ]
