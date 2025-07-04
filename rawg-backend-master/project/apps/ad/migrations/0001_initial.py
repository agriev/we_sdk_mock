# Generated by Django 2.2 on 2022-12-28 12:06

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('games', '0063_playergamesessiondata'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdFoxCompanyParameter',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('company', models.CharField(choices=[('DESKTOP', 'Desktop'), ('DESKTOP_REWARDED', 'Desktop rewarded'), ('MOBILE', 'Mobile'), ('MOBILE_REWARDED', 'Mobile rewarded')], max_length=50)),
                ('name', models.CharField(max_length=3)),
                ('value', models.CharField(max_length=255)),
                ('game', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='adfox_parameters', to='games.Game')),
            ],
            options={
                'verbose_name': 'AdFox game company parameter',
                'verbose_name_plural': 'AdFox game company parameters',
                'ordering': ('game_id',),
            },
        ),
    ]
