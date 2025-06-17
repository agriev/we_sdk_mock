from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0051_auto_20191114_0939'),
    ]

    operations = [
        migrations.AlterField(
            model_name='collection',
            name='likes_users',
            field=models.PositiveIntegerField(db_index=True, default=0, editable=False),
        ),
    ]
