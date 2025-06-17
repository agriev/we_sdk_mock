from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0007_auto_20190823_1119'),
    ]

    operations = [
        migrations.AlterField(
            model_name='review',
            name='title',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
