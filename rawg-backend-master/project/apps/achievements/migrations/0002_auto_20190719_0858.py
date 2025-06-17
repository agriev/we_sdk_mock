from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('achievements', '0001_squashed_1'),
    ]

    operations = [
        migrations.AddField(
            model_name='parentachievement',
            name='language',
            field=models.CharField(db_index=True, default=None, editable=False, max_length=3, null=True),
        ),
        migrations.AddField(
            model_name='parentachievement',
            name='language_detection',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
    ]
