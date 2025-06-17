from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ('reversion', '__first__'),
        ('common', '0002_auto_20190715_1548'),
    ]

    operations = [
        migrations.RunSQL(
            'CREATE INDEX CONCURRENTLY "reversion_version_content_type_id_object_id_index" '
            'ON "reversion_version" ("content_type_id", "object_id")',
            reverse_sql='DROP INDEX reversion_version_content_type_id_object_id_index',
        ),
    ]
