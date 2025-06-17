from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0038_auto_20191014_1144'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='linked_count',
            field=models.PositiveIntegerField(blank=True, editable=False, null=True),
        ),
    ]
