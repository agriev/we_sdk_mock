from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('games', '0049_collection_is_private'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='game',
            name='events_count',
        ),
        migrations.DeleteModel(
            name='GameFeedEvent',
        ),
    ]
