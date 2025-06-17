from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('games', 'Game')
    data = []
    for game in model.objects.only('id', 'twitch_counts').iterator():
        game.twitch_counts = {'eng': game.twitch_count, 'rus': 0}
        data.append(game)
    bulk_update(data, update_fields=['twitch_counts'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('external', '0005_auto_20190718_1709'),
        ('games', '0012_auto_20190718_1709'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
