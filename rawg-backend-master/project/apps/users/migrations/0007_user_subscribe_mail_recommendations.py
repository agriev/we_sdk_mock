from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0006_auto_20190815_1306'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='subscribe_mail_recommendations',
            field=models.BooleanField(default=None, blank=True, null=True),
        ),
    ]
