from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('games', '0002_alter_game_launch_url'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='opens',
            field=models.PositiveIntegerField(default=0),
        ),
    ] 