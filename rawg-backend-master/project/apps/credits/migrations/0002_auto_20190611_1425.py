import django.contrib.postgres.fields.citext
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('credits', '0001_squashed_2'),
    ]

    operations = [
        migrations.AddField(
            model_name='position',
            name='name_en',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=200, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='position',
            name='name_ru',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=200, null=True, unique=True),
        ),
    ]
