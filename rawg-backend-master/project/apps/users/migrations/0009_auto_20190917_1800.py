from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0008_auto_20190917_1653'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='subscribe_mail_recommendations',
            field=models.BooleanField(default=True),
        ),
    ]
