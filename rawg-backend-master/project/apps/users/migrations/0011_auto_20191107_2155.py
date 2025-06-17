from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('users', '0010_user_collections_all_count'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='collections_all_count',
            field=models.PositiveIntegerField(blank=True, default=0, editable=False, null=True),
        ),
    ]
