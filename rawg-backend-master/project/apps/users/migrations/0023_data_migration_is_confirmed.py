from django.db import migrations


def fill_is_confirmed(apps, schema_editor):
    user_model = apps.get_model('users', 'User')
    user_model.objects.filter(emailaddress__primary=True, emailaddress__verified=True).update(is_confirmed=True)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0022_replace_avatar_with_new_avatar'),
    ]

    operations = [
        migrations.RunPython(fill_is_confirmed, migrations.RunPython.noop)
    ]
