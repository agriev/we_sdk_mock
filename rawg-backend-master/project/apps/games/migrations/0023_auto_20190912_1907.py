from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0022_auto_20190910_1156'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='LinkedStuff',
            new_name='LinkedGame',
        ),
        migrations.DeleteModel(
            name='GamePicked',
        ),
    ]
