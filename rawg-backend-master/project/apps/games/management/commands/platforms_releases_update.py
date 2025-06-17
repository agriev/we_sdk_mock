from django.conf import settings
from django.core.management.base import BaseCommand
from pymongo import MongoClient

from apps.games.models import GamePlatform
from apps.merger.merger import date


class Command(BaseCommand):
    help = 'Update game platforms release dates'
    platforms_release_collection_name = 'platforms_release'
    tbd_release_date = 'tbd'

    def update_game_platform_with_tbd_release_date(self, qs_for_update):
        try:
            updated = qs_for_update.update(tba=True)
            return updated
        except KeyError:
            return

    def update_game_platform_release_date(self, item):
        qs = GamePlatform.objects.filter(game__name=item['name'], platform__slug=item['platform'])
        if item.get('release_date', None) == self.tbd_release_date:
            return self.update_game_platform_with_tbd_release_date(qs)

        try:
            updated = qs.update(released_at=date(item['release_date']))
            return updated
        except KeyError:
            return

    def print_status_message(self, item, total_count, updates_count):
        text = 'Updated {}/{} -- {}-{}'.format(updates_count, total_count, item['name'], item['platform'])
        self.stdout.write(self.style.SUCCESS(text))

    def load_updated_platforms_from_mongo(self):
        with MongoClient(settings.MONGO_HOST, settings.MONGO_PORT) as client:
            db_collection = client.games[self.platforms_release_collection_name]
            updates_count = 0
            total_count = db_collection.find().count()
            for item in db_collection.find():
                updated = self.update_game_platform_release_date(item)
                if updated:
                    updates_count += 1
                    self.print_status_message(item, total_count, updates_count)

    def handle(self, *args, **options):
        self.load_updated_platforms_from_mongo()
