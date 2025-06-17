from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0040_auto_20191014_1159'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='linked_count',
        ),
    ]
