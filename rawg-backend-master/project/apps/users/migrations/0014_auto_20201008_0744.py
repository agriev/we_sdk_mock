import django.contrib.postgres.fields.citext
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0013_auto_20200920_2030'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='api_email',
            field=django.contrib.postgres.fields.citext.CIEmailField(blank=True, max_length=254),
        ),
        migrations.AlterField(
            model_name='user',
            name='api_key',
            field=django.contrib.postgres.fields.citext.CICharField(blank=True, max_length=32, unique=True),
        ),
    ]
