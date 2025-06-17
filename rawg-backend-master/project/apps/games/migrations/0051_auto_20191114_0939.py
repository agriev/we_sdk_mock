from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0050_auto_20191113_1055'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='likes_users',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
        migrations.AddField(
            model_name='collectionlike',
            name='count',
            field=models.IntegerField(default=1),
        ),
        migrations.AlterField(
            model_name='collectionlike',
            name='positive',
            field=models.BooleanField(default=True),
        ),
    ]
