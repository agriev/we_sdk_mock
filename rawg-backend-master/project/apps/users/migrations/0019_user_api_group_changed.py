from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0018_auto_20210325_1728'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='api_group_changed',
            field=models.DateTimeField(blank=True, default=None, null=True, help_text='For enterprise')
        ),
    ]
