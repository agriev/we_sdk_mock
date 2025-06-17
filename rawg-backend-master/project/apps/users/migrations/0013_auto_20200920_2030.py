from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0012_auto_20191107_2201'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='api_description',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='user',
            name='api_key',
            field=models.CharField(blank=True, max_length=32),
        ),
        migrations.AddField(
            model_name='user',
            name='api_url',
            field=models.URLField(blank=True),
        ),
    ]
