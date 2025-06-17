from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0016_game_description_ru_is_plain_text'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='description_ru_is_plain_text',
            field=models.BooleanField(default=False),
        ),
    ]
