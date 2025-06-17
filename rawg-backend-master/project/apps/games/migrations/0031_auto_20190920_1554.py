from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('games', 'Game')
    data = []
    for game in model.objects.only('id', 'alternative_names', 'alternative_names_new').iterator():
        game.alternative_names_new = list(game.alternative_names or [])
        data.append(game)
    bulk_update(data, update_fields=['alternative_names_new'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0030_auto_20190920_1553'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
