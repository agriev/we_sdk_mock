import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0039_game_linked_count'),
    ]

    operations = [
        migrations.AlterField(
            model_name='addition',
            name='parent_game',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='additions',
                                    to='games.Game'),
        ),
    ]
