from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('stripe', '0002_payment_subscription_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='invoice_id',
            field=models.CharField(default='', max_length=100),
            preserve_default=False,
        ),
    ]
