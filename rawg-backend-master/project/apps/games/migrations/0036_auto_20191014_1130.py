from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0035_auto_20191004_1848'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='LinkedGame',
            new_name='Addition',
        ),
    ]
