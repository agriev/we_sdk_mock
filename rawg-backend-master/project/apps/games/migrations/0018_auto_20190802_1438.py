from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0017_auto_20190723_1352'),
    ]

    operations = [
        migrations.AddField(
            model_name='gamestore',
            name='url_en',
            field=models.URLField(max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='gamestore',
            name='url_ru',
            field=models.URLField(max_length=500, null=True),
        ),
    ]
