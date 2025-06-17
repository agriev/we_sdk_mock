from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0018_auto_20190802_1438'),
    ]

    operations = [
        migrations.AlterField(
            model_name='game',
            name='website',
            field=models.URLField(blank=True, default='', max_length=500),
        ),
    ]
