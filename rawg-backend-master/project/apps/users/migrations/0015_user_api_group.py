from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0014_auto_20201008_0744'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='api_group',
            field=models.CharField(
                choices=[
                    ('free', 'Free'),
                    ('business', 'Business'),
                    ('enterprise', 'Enterprise'),
                    ('unlimited', 'Unlimited'),
                ],
                max_length=10,
                blank=True,
                null=True,
            ),
        ),
    ]
