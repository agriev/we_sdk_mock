from bulk_update.helper import bulk_update
from django.db import migrations


def forwards_func(apps, schema_editor):
    model = apps.get_model('reviews', 'Review')
    data = []
    for review in model.objects.filter(title=None).iterator():
        review.title = ''
        data.append(review)
    bulk_update(data, update_fields=['title'], batch_size=2000)


def reverse_func(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ('reviews', '0006_review_title'),
    ]

    operations = [
        migrations.RunPython(
            forwards_func,
            reverse_func
        )
    ]
