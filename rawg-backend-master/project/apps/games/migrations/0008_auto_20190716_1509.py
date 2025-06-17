from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0007_auto_20190715_1519'),
    ]

    operations = [
        migrations.AddField(
            model_name='tag',
            name='language',
            field=models.CharField(db_index=True, default='', editable=False, max_length=3),
        ),
        migrations.AddField(
            model_name='tag',
            name='language_detection',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
    ]
