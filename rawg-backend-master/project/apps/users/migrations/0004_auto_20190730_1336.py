from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('users', 'User')
    data = []
    for user in model.objects.only('id').iterator():
        user.source_language = 'en'
        data.append(user)
    bulk_update(data, update_fields=['source_language'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0003_user_source_language'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
