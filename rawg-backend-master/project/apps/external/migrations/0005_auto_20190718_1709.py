from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('external', '0004_auto_20190718_1344'),
    ]

    operations = [
        migrations.AddField(
            model_name='youtubemain',
            name='language',
            field=models.CharField(db_index=True, default='eng', editable=False, max_length=3),
        ),
        migrations.AlterField(
            model_name='twitch',
            name='language',
            field=models.CharField(db_index=True, default='eng', max_length=3),
        ),
        migrations.AlterField(
            model_name='twitchmain',
            name='language',
            field=models.CharField(db_index=True, default='eng', max_length=3),
        ),
        migrations.AlterField(
            model_name='youtube',
            name='language',
            field=models.CharField(db_index=True, default='eng', editable=False, max_length=3),
        ),
    ]
