from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0021_data_migration_copy_avatar_url'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='user',
            name='avatar',
        ),
        migrations.RenameField(
            model_name='user',
            old_name='url_avatar',
            new_name='avatar',
        )
    ]
