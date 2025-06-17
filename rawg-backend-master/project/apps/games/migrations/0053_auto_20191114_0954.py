from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('games', 'Collection')
    data = []
    for collection in model.objects.only('id', 'likes_count').iterator():
        collection.likes_users = collection.likes_count
        data.append(collection)
    bulk_update(data, update_fields=['likes_users'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0052_auto_20191114_0954'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
