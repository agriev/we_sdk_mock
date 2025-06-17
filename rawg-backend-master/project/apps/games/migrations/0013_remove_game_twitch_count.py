from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0012_auto_20190718_1709'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='twitch_count',
        ),
    ]
