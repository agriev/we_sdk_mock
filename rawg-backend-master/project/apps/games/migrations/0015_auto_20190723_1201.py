from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0014_auto_20190719_0900'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='description_is_plain_text',
            new_name='description_en_is_plain_text',
        ),
    ]
