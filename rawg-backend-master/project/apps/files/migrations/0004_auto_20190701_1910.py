from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('files', '0003_auto_20190701_1038'),
    ]

    operations = [
        migrations.AlterField(
            model_name='file',
            name='file_size',
            field=models.BigIntegerField(default=0),
        ),
    ]
