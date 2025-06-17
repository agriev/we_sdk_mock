from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0015_user_api_group'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='api_group',
            field=models.CharField(
                choices=[
                    ('free', 'Free'),
                    ('business', 'Business'),
                    ('enterprise', 'Enterprise'),
                    ('unlimited', 'Unlimited')
                ],
                default='free',
                max_length=10
            ),
        ),
    ]
