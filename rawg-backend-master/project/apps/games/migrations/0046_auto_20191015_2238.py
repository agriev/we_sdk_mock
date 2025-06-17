from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0045_game_game_series'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='franchises_count',
        ),
        migrations.DeleteModel(
            name='GameSeries',
        ),
    ]
