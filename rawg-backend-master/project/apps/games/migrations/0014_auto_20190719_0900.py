import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0013_remove_game_twitch_count'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='parent_achievements_count',
            new_name='parent_achievements_count_all',
        ),
        migrations.AddField(
            model_name='game',
            name='parent_achievements_counts',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
    ]
