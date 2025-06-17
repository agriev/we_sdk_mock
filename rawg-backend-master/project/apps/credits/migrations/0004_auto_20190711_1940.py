from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('credits', '0003_auto_20190711_1425'),
    ]

    operations = [
        migrations.AddField(
            model_name='person',
            name='auto_description_en',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='person',
            name='auto_description_ru',
            field=models.TextField(blank=True, default='', null=True),
        ),
        migrations.AddField(
            model_name='position',
            name='name_ru_genitive',
            field=models.CharField(default='', max_length=200),
        ),
    ]
