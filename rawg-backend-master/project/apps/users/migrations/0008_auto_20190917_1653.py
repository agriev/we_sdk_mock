from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0007_user_subscribe_mail_recommendations'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='subscribe_mail_recommendations',
            field=models.BooleanField(null=True),
        ),
    ]
