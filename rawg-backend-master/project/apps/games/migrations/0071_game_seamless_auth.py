# Generated by Django 2.2 on 2023-08-03 11:52

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0070_game_plays'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='seamless_auth',
            field=models.BooleanField(blank=True, null=True, verbose_name='бесшовная авторизация'),
        ),
    ]
