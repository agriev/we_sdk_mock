from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0003_auto_20190628_0941'),
    ]

    operations = [
        migrations.AddField(
            model_name='reaction',
            name='title_en',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='reaction',
            name='title_ru',
            field=models.CharField(max_length=100, null=True),
        ),
    ]
