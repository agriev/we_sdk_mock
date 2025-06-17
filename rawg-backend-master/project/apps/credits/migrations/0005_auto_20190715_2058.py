from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('credits', '0004_auto_20190711_1940'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
    ]
