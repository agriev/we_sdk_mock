from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0011_auto_20191107_2155'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='collections_all_count',
            field=models.PositiveIntegerField(default=0, editable=False),
        ),
    ]
