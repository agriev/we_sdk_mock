from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('contenttypes', '0002_remove_content_type_name'),
        ('merger', '0003_auto_20190626_1419'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='mergedslug',
            unique_together={('old_slug', 'content_type')},
        ),
    ]
