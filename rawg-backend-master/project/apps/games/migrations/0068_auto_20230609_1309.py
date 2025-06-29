# Generated by Django 2.2 on 2023-06-09 13:09

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0067_featured_image_mobile'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='desktop_auth_delay',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Время до открытия окна логина (desktop)'),
        ),
        migrations.AddField(
            model_name='game',
            name='mobile_auth_delay',
            field=models.PositiveIntegerField(blank=True, null=True, verbose_name='Время до открытия окна логина (mobile)'),
        ),
        migrations.AddField(
            model_name='game',
            name='play_on_desktop',
            field=models.BooleanField(null=True, verbose_name='can play on desktop version'),
        ),
        migrations.AddField(
            model_name='game',
            name='play_on_mobile',
            field=models.BooleanField(null=True, verbose_name='can play on mobile verion'),
        ),
    ]
