from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stripe', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='subscription_id',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
    ]
