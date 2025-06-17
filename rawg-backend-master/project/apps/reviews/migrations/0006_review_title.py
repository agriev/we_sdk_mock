from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0005_review_is_zen'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='title',
            field=models.CharField(blank=True, default=None, null=True, max_length=100),
        ),
    ]
