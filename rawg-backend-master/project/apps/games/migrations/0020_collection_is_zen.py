from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0019_auto_20190820_1529'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='is_zen',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
