from django.core.management.base import BaseCommand

from apps.feed.signals import MODELS_OPTIONS
from apps.games import tasks
from apps.games.models import Collection, CollectionFeed
from apps.utils.tasks import detect_language


class Command(BaseCommand):
    help = 'Rebuild the collections fields'

    def handle(self, *args, **options):
        for collection in Collection.objects.only('id').all():
            tasks.update_collection(collection.id)
            tasks.update_likes_totals(collection.id)
            detect_language(collection.id, Collection._meta.app_label, Collection._meta.model_name,
                            MODELS_OPTIONS[Collection]['language'](collection))
        for collection_feed in CollectionFeed.objects.only('id', 'text').iterator():
            try:
                collection_feed.save()
            except CollectionFeed.DoesNotExist:
                continue
            if collection_feed.text:
                detect_language(collection_feed.id, CollectionFeed._meta.app_label,
                                CollectionFeed._meta.model_name,
                                MODELS_OPTIONS[CollectionFeed]['language'](collection_feed))
        self.stdout.write(self.style.SUCCESS('OK'))
