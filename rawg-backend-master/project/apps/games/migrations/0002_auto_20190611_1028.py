import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0001_squashed_3'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='created',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='game',
            name='updated',
            field=models.DateTimeField(db_index=True),
        ),
    ]
