from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0036_auto_20191014_1130'),
    ]

    operations = [
        migrations.AlterField(
            model_name='addition',
            name='link_type',
            field=models.CharField(blank=True, choices=[('dlc', 'DLC'), ('edition', 'Edition')], default=None,
                                   max_length=7, null=True),
        ),
    ]
