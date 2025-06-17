from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('banners', '0002_auto_20190807_2010'),
    ]

    operations = [
        migrations.AlterField(
            model_name='banner',
            name='text',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='banner',
            name='text_en',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='banner',
            name='text_ru',
            field=models.TextField(blank=True, null=True),
        ),
    ]
