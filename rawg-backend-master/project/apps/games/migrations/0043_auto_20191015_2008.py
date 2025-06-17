from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0042_auto_20191015_1857'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='gameseries',
            options={'ordering': ('-id',), 'verbose_name': 'Game Series', 'verbose_name_plural': 'Game Series'},
        ),
        migrations.RenameField(
            model_name='game',
            old_name='franchises_count',
            new_name='game_series_count',
        ),
        migrations.AlterField(
            model_name='gameseries',
            name='games',
            field=models.ManyToManyField(related_name='+', to='games.Game'),
        ),
    ]
