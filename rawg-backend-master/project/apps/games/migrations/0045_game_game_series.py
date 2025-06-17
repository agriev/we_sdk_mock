from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0044_game_franchises_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='game_series',
            field=models.ManyToManyField(related_name='_game_game_series_+', to='games.Game'),
        ),
    ]
