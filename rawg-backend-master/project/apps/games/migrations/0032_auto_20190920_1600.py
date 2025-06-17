from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0031_auto_20190920_1554'),
    ]

    operations = [
        migrations.RenameField(
            model_name='game',
            old_name='alternative_names',
            new_name='alternative_names_old',
        ),
        migrations.RenameField(
            model_name='game',
            old_name='alternative_names_new',
            new_name='alternative_names',
        ),
    ]
