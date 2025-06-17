from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stat', '0005_auto_20190911_0851'),
    ]

    operations = [
        migrations.AddField(
            model_name='recommendedgameadding',
            name='referer',
            field=models.CharField(blank=True, default=None, editable=False, max_length=500, null=True),
        ),
        migrations.AddField(
            model_name='recommendedgamevisit',
            name='referer',
            field=models.CharField(blank=True, default=None, editable=False, max_length=500, null=True),
        ),
    ]
