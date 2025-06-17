from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0043_auto_20191015_2008'),
    ]

    operations = [
        migrations.AddField(
            model_name='game',
            name='franchises_count',
            field=models.PositiveIntegerField(blank=True, editable=False, null=True),
        ),
    ]
