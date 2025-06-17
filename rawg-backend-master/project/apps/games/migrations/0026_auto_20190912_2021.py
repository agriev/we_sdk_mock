from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('games', 'LinkedGame')
    for linked_game in model.objects.all():
        linked_game.link_type = linked_game.link_type.lower()
        linked_game.save(update_fields=['link_type'])


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0025_auto_20190912_2020'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
