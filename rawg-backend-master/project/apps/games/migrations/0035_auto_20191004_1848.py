from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0034_auto_20191002_1423'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='comments_count',
        ),
        migrations.RemoveField(
            model_name='game',
            name='comments_last',
        ),
        migrations.RemoveField(
            model_name='game',
            name='comments_parent_count',
        ),
    ]
