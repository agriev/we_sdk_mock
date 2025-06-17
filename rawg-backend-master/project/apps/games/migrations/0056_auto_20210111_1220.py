from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0055_auto_20201216_1239'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='developer',
            index=models.Index(fields=['-games_added', '-id'], name='games_devel_games_a_c61d48_idx'),
        ),
    ]
