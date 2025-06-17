from django.conf import settings
from django.db import migrations


def forwards_func(apps, schema_editor):
    apps.get_model('external', 'YouTube').objects.update(language=settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('external', '0002_auto_20190718_1319'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
