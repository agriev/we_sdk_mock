from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stories', '0001_squashed_2'),
    ]

    operations = [
        migrations.AddField(
            model_name='story',
            name='name_en',
            field=models.CharField(max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='story',
            name='name_ru',
            field=models.CharField(max_length=100, null=True),
        ),
    ]
