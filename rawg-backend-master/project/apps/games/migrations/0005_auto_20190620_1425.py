import django.contrib.postgres.indexes
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0004_game_files_count'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='game',
            index=django.contrib.postgres.indexes.GinIndex(fields=['synonyms'], name='games_game_synonym_ad9725_gin'),
        ),
    ]
