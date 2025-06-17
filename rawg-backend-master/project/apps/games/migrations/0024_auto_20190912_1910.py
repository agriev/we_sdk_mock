import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0023_auto_20190912_1907'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='linkedgame',
            options={'ordering': ('-id',), 'verbose_name': 'Linked Game', 'verbose_name_plural': 'Linked Games'},
        ),
        migrations.AlterField(
            model_name='linkedgame',
            name='game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='parent_games',
                                    to='games.Game'),
        ),
        migrations.AlterField(
            model_name='linkedgame',
            name='link_type',
            field=models.CharField(choices=[('DLC', 'DLC'), ('Edition', 'Edition')], default='DLC', max_length=7),
        ),
        migrations.AlterField(
            model_name='linkedgame',
            name='parent_game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='linked_games',
                                    to='games.Game'),
        ),
    ]
