import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('games', '0011_auto_20190718_1450'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='youtube_count',
        ),
        migrations.AddField(
            model_name='game',
            name='twitch_counts',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
    ]
