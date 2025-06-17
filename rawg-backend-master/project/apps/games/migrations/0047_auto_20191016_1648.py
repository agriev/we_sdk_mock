from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0046_auto_20191015_2238'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='game_series',
            field=models.ManyToManyField(blank=True, related_name='_game_game_series_+', to='games.Game'),
        ),
        migrations.AlterField(
            model_name='game',
            name='tags',
            field=models.ManyToManyField(blank=True, to='games.Tag'),
        ),
    ]
