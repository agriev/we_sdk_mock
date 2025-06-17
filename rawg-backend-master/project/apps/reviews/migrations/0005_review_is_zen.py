from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0004_auto_20190701_1418'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_zen',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
