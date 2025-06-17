import django.contrib.postgres.fields.citext
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0002_auto_20190611_1028'),
    ]

    operations = [
        migrations.AddField(
            model_name='esrbrating',
            name='name_en',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='esrbrating',
            name='name_ru',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='name_en',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=200, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='game',
            name='name_ru',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=200, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='name_en',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='name_ru',
            field=django.contrib.postgres.fields.citext.CICharField(max_length=100, null=True, unique=True),
        ),
    ]
