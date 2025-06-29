# Generated by Django 2.2.27 on 2022-09-15 21:02

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0058_game_iframe'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='can_play',
            field=models.BooleanField(default=False, verbose_name='можно играть'),
        ),
        migrations.AddField(
            model_name='game',
            name='secret_key',
            field=models.CharField(editable=False, max_length=50, null=True, unique=True, validators=[django.core.validators.MinLengthValidator(40)], verbose_name='секретный ключ'),
        ),
        migrations.AlterField(
            model_name='game',
            name='iframe',
            field=models.URLField(blank=True, verbose_name='ссылка для запуска игры'),
        ),
    ]
