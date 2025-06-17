import pymongo
from django.conf import settings
from django.core.management.base import BaseCommand

from apps.games.models import GameStore


class Command(BaseCommand):
    help = 'Load Top steam games ids to mongo'

    def add_arguments(self, parser):
        parser.add_argument('-o', '--offset', action='store', dest='offset', default=0, type=int)

    def handle(self, *args, **options):
        start = options['offset']
        end = start + 4000

        client = pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)
        db = client['games']
        collection = 'steam_ids'
        document_name = 'steam'

        gamestore_ids = GameStore.objects \
            .only('store_internal_id') \
            .filter(
                store__slug='steam',
                store_internal_id__isnull=False
            ) \
            .exclude(store_internal_id__exact='') \
            .order_by('-game__added') \
            .values_list('store_internal_id', flat=True)[start:end]
        gamestore_ids = list(gamestore_ids)

        document = db[collection].find_one({'name': document_name})
        if document:
            db[collection].update_one(
                {'_id': document['_id']},
                {"$set": {'ids': gamestore_ids}},
                upsert=False
            )
        else:
            db[collection].insert(
                {
                    'name': document_name,
                    'ids': gamestore_ids
                }
            )
        client.close()
        self.stdout.write(self.style.SUCCESS('OK'))
