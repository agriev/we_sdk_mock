from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0020_collection_is_zen'),
    ]

    operations = [
        migrations.DeleteModel(
            name='PromoFeatured',
        ),
    ]
