from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0048_auto_20191107_0909'),
    ]

    operations = [
        migrations.AddField(
            model_name='collection',
            name='is_private',
            field=models.BooleanField(db_index=True, default=False),
        ),
    ]
