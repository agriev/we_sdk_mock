import timeit
from collections import OrderedDict

import pymongo
import reversion
from celery_haystack.utils import enqueue_task
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import translation

from apps.credits.tasks import update_person
from apps.games import models, tasks
from apps.merger.merger import create_store, find_game, update
from apps.merger.models import DeletedGame, SimilarGame
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    class WriteLockedGameError(Exception):
        pass

    help = 'Load games from mongo'
    crawlers = OrderedDict([
        ('steam', {'platforms': ['pc', 'macos', 'linux']}),
        ('gog', {'platforms': ['pc', 'macos', 'linux']}),
        ('playstation',
         {'platforms': ['playstation3', 'playstation4', 'ps-vita', 'psp'], 'store': 'playstation-store'}),
        ('xbox360', {'platforms': ['xbox360']}),
        ('xbox', {'platforms': ['xbox-one'], 'store': 'xbox-store'}),
        ('ios', {'platforms': ['ios', 'macos'], 'store': 'apple-appstore'}),
        ('nintendo',
         {'platforms': ['nintendo-switch', 'nintendo-3ds', 'nintendo-ds', 'nintendo-dsi', 'wii-u', 'wii', 'neogeo']}),
        ('android', {'platforms': ['android'], 'store': 'google-play'}),
        ('itch', {'platforms': ['pc', 'macos', 'linux', 'android', 'ios', 'web']}),
        ('old', {'platforms': False}),
    ])
    add_collection = {
        'old': {
            'merge_by_date': True,
            'suffix_in_synonyms': False,
        },
        'itch': {
            'merge_by_date': False,
            'suffix_in_synonyms': True,
        },
    }
    indie = ('itch',)
    important_descriptions = ('steam',)
    small_images = ('ios', 'nintendo', 'xbox360', 'android')
    process_num = 0
    processes = 0
    limit = 0

    def add_arguments(self, parser):
        parser.add_argument('crawlers', type=str)
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)
        parser.add_argument('-c', '--limit', action='store', dest='limit', default=0, type=int)
        parser.add_argument('-f', '--fields', action='store', dest='fields', default='', type=str)

    def handle(self, *args, **options):
        try:
            if options['crawlers'] == 'all':
                crawlers = self.crawlers.keys()
            else:
                self.process_num = options['num']
                self.processes = options['len']
                self.limit = options['limit']
                crawlers = [c for c in options['crawlers'].split(',') if c in self.crawlers.keys()]
            self.fields = options['fields'].split(',') if options['fields'] else None
            self.process(crawlers)
        except Exception as e:
            capture_exception(e, raise_on_debug=False, raise_on_tests=False)
            raise

    def get_extra_params(self, collection):
        store = None
        similar_list = None
        add_collection = collection if collection in self.add_collection.keys() else ''
        merge_by_date = self.add_collection.get(collection, {}).get('merge_by_date', True)
        suffix_in_synonyms = self.add_collection.get(collection, {}).get('suffix_in_synonyms', True)
        platforms = self.crawlers[collection]['platforms']
        if platforms:
            store, similar_list = create_store(self.crawlers[collection].get('store', collection), platforms)
        return store, similar_list, add_collection, merge_by_date, suffix_in_synonyms

    def update_pipeline_and_count(self, pipeline, items):
        pipeline.append({'$addFields': {'m': {'$mod': ['$id', self.processes]}}})
        pipeline.append({'$match': {'m': self.process_num}})
        if self.limit:
            pipeline.append({'$limit': self.limit})
        count = items.find({'new': 1}).where(
            'this.id % {} == {}'.format(self.processes, self.process_num)
        ).count()
        return pipeline, count

    def print_status_message(self, collection, index, count, start, game, created):
        status = 'added  ' if created else 'updated'
        text = '{} {}/{} {} {:.2f}s <GAME> {}'.format(
            collection, index, count, status, timeit.default_timer() - start, game.name
        )
        self.stdout.write(self.style.SUCCESS(text))

    def is_deleted_game(self, item):
        name = item['name'].strip()[0:200]
        return DeletedGame.objects.filter(game_name=name).exists()

    def is_skippable_game(self, game):
        return bool(game.promo or game.can_play)

    def try_get_game_instance(self, item, similar_list, add_collection, merge_by_date, store, suffix_in_synonyms):
        try:
            if not item.get('game_id'):
                raise models.Game.DoesNotExist
            game = models.Game.objects.get(id=item.get('game_id'))
            created = False
            add_similar = False
        except models.Game.DoesNotExist:
            game, created, add_similar = find_game(
                item,
                similar_list,
                add_collection,
                merge_by_date,
                store,
                suffix_in_synonyms,
            )
        return game, created, add_similar

    def load_game(self, item, similar_list, add_collection, merge_by_date, store, suffix_in_synonyms, items):
        with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
            start = timeit.default_timer()
            game, created, add_similar = self.try_get_game_instance(
                item,
                similar_list,
                add_collection,
                merge_by_date,
                store,
                suffix_in_synonyms,
            )

            if self.is_skippable_game(game):
                raise self.WriteLockedGameError()

            filtered_item = item
            if not created and self.fields:
                filtered_item = {key: value for key, value in item.items() if key in self.fields}
            game = update(game, created, filtered_item, store, self.important_descriptions, self.small_images)
            reversion.set_comment('Changed by the crawler merger.')

        if add_similar:
            SimilarGame.write_games(add_similar)

        data = {'new': 0}
        if not item.get('game_id') or item.get('game_id') != game.id:
            data['game_id'] = game.id
        items.update({'_id': item['_id']}, {'$set': data})
        return start, game, created, items, data

    def process(self, crawlers):
        client = pymongo.MongoClient(settings.MONGO_HOST, settings.MONGO_PORT)
        index = 0
        count = sum([client.games[collection].count({'new': 1}) for collection in crawlers])

        bulk_update = {}
        self.bulk_update(bulk_update)

        for collection in crawlers:
            store, similar_list, add_collection, merge_by_date, suffix_in_synonyms = self.get_extra_params(
                collection,
            )
            items = client.games[collection]
            pipeline = [{'$match': {'new': 1}}]
            if self.processes > 1:
                pipeline, count = self.update_pipeline_and_count(pipeline, items)
            pipeline.append({'$sort': {'created': pymongo.ASCENDING}})
            data = items.aggregate(pipeline, allowDiskUse=True)
            for item in data:
                try:
                    if self.is_deleted_game(item):  # Avoid recreating already deleted game
                        continue
                    start, game, created, items, data = self.load_game(
                        item,
                        similar_list,
                        add_collection,
                        merge_by_date,
                        store,
                        suffix_in_synonyms,
                        items,
                    )

                    tasks.update_game_seo_fields(game.id)
                    tasks.update_last_modified(game.id, run_index_update=False)
                    tasks.update_game_json_field(game.id, None, run_index_update=False)
                    tasks.update_game_totals(game.id, None, run_index_update=False)
                    enqueue_task('update', game)

                    for key in bulk_update:
                        if key == 'persons':
                            continue
                        for object_id in getattr(game, key).values_list('id', flat=True):
                            bulk_update[key].add(object_id)
                    for person_id in game.gameperson_set.values_list('person_id', flat=True):
                        bulk_update['persons'].add(person_id)

                    index += 1
                    self.print_status_message(collection, index, count, start, game, created)
                except self.WriteLockedGameError as e:
                    continue
                except Exception as e:
                    capture_exception(e, raise_on_debug=True, raise_on_tests=False)
                    self.stdout.write(self.style.ERROR(str(e)))
                if index and index % 50 == 0:
                    self.bulk_update(bulk_update)

        self.bulk_update(bulk_update)

    def bulk_update(self, bulk_update):
        start = timeit.default_timer()

        for key, ids in bulk_update.items():
            if key == 'persons':
                continue
            if not ids:
                continue
            tasks.update_game_item('games', key[:-1], ids)
        for person_id in bulk_update.get('persons') or []:
            update_person(person_id)

        bulk_update['stores'] = set()
        bulk_update['platforms'] = set()
        bulk_update['genres'] = set()
        bulk_update['tags'] = set()
        bulk_update['developers'] = set()
        bulk_update['publishers'] = set()
        bulk_update['persons'] = set()

        self.stdout.write(self.style.SUCCESS('{:.2f}s <ITEMS>'.format(timeit.default_timer() - start)))
