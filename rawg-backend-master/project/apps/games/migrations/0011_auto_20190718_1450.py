from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0010_game_youtube_counts'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='description_en',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='game',
            name='description_ru',
            field=models.TextField(blank=True, null=True),
        ),
    ]
