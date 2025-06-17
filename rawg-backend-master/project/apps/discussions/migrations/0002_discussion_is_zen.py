from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('discussions', '0001_squashed_1'),
    ]

    operations = [
        migrations.AddField(
            model_name='discussion',
            name='is_zen',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
