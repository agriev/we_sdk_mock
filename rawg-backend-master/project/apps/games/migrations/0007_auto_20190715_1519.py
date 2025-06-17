from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0006_auto_20190711_1425'),
    ]

    operations = [
        migrations.AddField(
            model_name='developer',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='developer',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='esrbrating',
            name='description_en',
            field=models.CharField(max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='esrbrating',
            name='description_ru',
            field=models.CharField(max_length=1000, null=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='genre',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='platform',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='platform',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='platformparent',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='platformparent',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='publisher',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='publisher',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='store',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='store',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
    ]
