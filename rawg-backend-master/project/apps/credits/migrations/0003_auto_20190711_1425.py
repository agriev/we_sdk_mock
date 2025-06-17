import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('credits', '0002_auto_20190611_1425'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='display_name_en',
            field=models.CharField(blank=True, default='', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='display_name_ru',
            field=models.CharField(blank=True, default='', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='gender',
            field=models.CharField(choices=[('m', 'Male'), ('f', 'Female'), ('u', 'Unknown')], default='u',
                                   max_length=1),
        ),
        migrations.AlterField(
            model_name='person',
            name='synonyms',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=200), blank=True,
                                                            default=list, size=None),
        ),
    ]
