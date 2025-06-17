from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('games', '0056_auto_20210111_1220'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AddIndex(
                    model_name='game',
                    index=models.Index(fields=['-metacritic', '-id'], name='games_game_metacri_6420a0_idx'),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    'CREATE INDEX CONCURRENTLY "games_game_metacri_6420a0_idx" '
                    'ON "games_game" ("metacritic" DESC, "id" DESC)',
                    reverse_sql='DROP INDEX games_game_metacri_6420a0_idx',
                ),
            ],
        ),
    ]
