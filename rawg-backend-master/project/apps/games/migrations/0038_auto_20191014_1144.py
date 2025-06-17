from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0037_auto_20191014_1130'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='linked_count',
            new_name='additions_count',
        ),
    ]
