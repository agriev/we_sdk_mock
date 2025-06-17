from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0010_game_youtube_counts'),
        ('external', '0001_squashed_1'),
    ]

    operations = [
        migrations.AddField(
            model_name='youtube',
            name='language',
            field=models.CharField(db_index=True, default=None, editable=False, max_length=3, null=True),
        ),
        migrations.AlterUniqueTogether(
            name='youtube',
            unique_together={('game', 'external_id', 'language')},
        ),
    ]
