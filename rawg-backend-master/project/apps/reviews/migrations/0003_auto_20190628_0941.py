from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0002_editorialreview'),
    ]

    operations = [
        migrations.AddField(
            model_name='editorialreview',
            name='display_name',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='editorialreview',
            name='original_username',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
