import django.contrib.postgres.fields.jsonb
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0003_auto_20190611_1425'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='files_count',
            field=django.contrib.postgres.fields.jsonb.JSONField(blank=True, editable=False, null=True),
        ),
    ]
