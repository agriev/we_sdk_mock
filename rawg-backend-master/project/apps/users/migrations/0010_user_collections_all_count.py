from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0009_auto_20190917_1800'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='collections_all_count',
            field=models.PositiveIntegerField(blank=True, editable=False, null=True),
        ),
    ]
