from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('merger', '0002_auto_20190625_1600'),
    ]

    operations = [
        migrations.AlterField(
            model_name='mergedslug',
            name='old_slug',
            field=models.SlugField(max_length=100),
        ),
    ]
