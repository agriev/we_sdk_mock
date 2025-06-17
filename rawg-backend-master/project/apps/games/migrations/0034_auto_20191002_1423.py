from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0033_auto_20190920_1746'),
    ]

    operations = [
        migrations.AddField(
            model_name='franchise',
            name='games_added',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='franchise',
            name='games_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
    ]
