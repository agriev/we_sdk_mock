from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('games', 'Game')
    data = []
    for game in model.objects.only('id', 'youtube_counts').iterator():
        game.youtube_counts = {'eng': game.youtube_count, 'rus': 0}
        data.append(game)
    bulk_update(data, update_fields=['youtube_counts'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('external', '0003_auto_20190718_1325'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
