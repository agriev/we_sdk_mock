from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0015_auto_20190723_1201'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='description_ru_is_plain_text',
            field=models.BooleanField(default=None, null=True),
        ),
    ]
