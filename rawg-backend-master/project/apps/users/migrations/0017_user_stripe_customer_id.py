from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0016_auto_20201109_0907'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='stripe_customer_id',
            field=models.CharField(blank=True, db_index=True, max_length=200),
        ),
    ]
