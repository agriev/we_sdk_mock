from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('common', '0001_squashed_1'),
    ]

    operations = [
        migrations.AddField(
            model_name='catalogfilter',
            name='description_en',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='catalogfilter',
            name='description_ru',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='catalogfilter',
            name='name_en',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='catalogfilter',
            name='name_ru',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='catalogfilter',
            name='title_en',
            field=models.CharField(max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='catalogfilter',
            name='title_ru',
            field=models.CharField(max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='name_en',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='name_ru',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='title_en',
            field=models.CharField(blank=True, default='', max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='list',
            name='title_ru',
            field=models.CharField(blank=True, default='', max_length=200, null=True),
        ),
    ]
