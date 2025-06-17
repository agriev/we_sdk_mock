from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0017_user_stripe_customer_id'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='stripe_customer_id',
            field=models.CharField(blank=True, db_index=True, default='', max_length=200),
        ),
    ]
