from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('banners', '0001_squashed'),
    ]

    operations = [
        migrations.AddField(
            model_name='banner',
            name='text_en',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='banner',
            name='text_ru',
            field=models.TextField(null=True),
        ),
        migrations.AddField(
            model_name='banner',
            name='url_en',
            field=models.URLField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='banner',
            name='url_ru',
            field=models.URLField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='banner',
            name='url_text_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='banner',
            name='url_text_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
    ]
