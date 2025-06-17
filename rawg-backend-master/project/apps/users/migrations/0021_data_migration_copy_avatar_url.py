from django.db import migrations, models


def copy_avatar_url_to_new_field(apps, schema_editor):
    user_model = apps.get_model('users', 'User')
    user_model.objects.update(url_avatar=models.F('avatar'))


def reverse(apps, schema_editor):
    user_model = apps.get_model('users', 'User')
    user_model.objects.update(avatar=models.F('url_avatar'))


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0020_add_fields_for_knbauth_model'),
    ]

    operations = [
        migrations.RunPython(copy_avatar_url_to_new_field, reverse)
    ]
