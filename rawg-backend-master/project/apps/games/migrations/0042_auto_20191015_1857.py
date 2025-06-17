from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0041_remove_game_linked_count'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='Franchise',
            new_name='GameSeries',
        ),
    ]
