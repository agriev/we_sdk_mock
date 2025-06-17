import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0009_auto_20190717_1242'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='youtube_counts',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
    ]
