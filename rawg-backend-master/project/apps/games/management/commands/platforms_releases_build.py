from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Count, F, Q
from pymongo import MongoClient

from apps.games.models import GamePlatform


class Command(BaseCommand):
    help = 'Generate mongo collection for platform release dates update'
    platforms_release_collection_name = 'platforms_release'

    def get_queryset(self):
        queryset = (
            GamePlatform.objects
            .annotate(stores_count=Count('game__stores'))
            .filter(
                ~Q(game__stores__name='itch.io'),
                ~Q(platform__slug__in=['ios', 'android']),
                game__released=F('released_at'),
                stores_count__gte=2,
            )
            .select_related('game', 'platform', 'platform__parent')
        )
        return queryset

    def get_platforms_collection_mapping(self, platform):
        nintendo_platforms = [
            'nintendo-switch', 'nintendo-3ds', 'nintendo-ds', 'nintendo-dsi', 'wii-u', 'wii', 'neogeo',
        ]
        if platform.slug in ['playstation3', 'playstation4', 'ps-vita', 'psp']:
            return 'playstation'
        elif platform.slug in ['xbox360']:
            return 'xbox360'
        elif platform.slug in ['pc', 'macos', 'linux', 'mac']:
            return 'steam'
        elif platform.slug in nintendo_platforms:
            return 'nintendo'
        elif platform.slug in ['xbox-one']:
            return 'xbox'

    def print_status_message(self, total_count, loads_count):
        text = 'Loaded {}/{}'.format(loads_count, total_count)
        self.stdout.write(self.style.SUCCESS(text))

    def print_error_message(self, text, item, count, total_count):
        self.stdout.write(self.style.ERROR('{} {} {}/{}'.format(text, item, count, total_count)))

    def get_game_dict(self, item):
        game_dict = {
            'name': item.game.name,
            'platform': item.platform.slug,
        }
        return game_dict

    def get_statistic_counters(self, queryset):
        loads_count = 0
        no_mongo_item_count = 0
        no_collection_count = 0
        total_count = queryset.count()
        return loads_count, no_mongo_item_count, no_collection_count, total_count

    def print_result_statistic(self, loads_count, no_mongo_item_count, no_collection_count, total_count):
        self.stdout.write(self.style.SUCCESS('Loaded {}/{}'.format(loads_count, total_count)))
        self.stdout.write(self.style.ERROR('No mongo items {}/{}'.format(no_mongo_item_count, total_count)))
        self.stdout.write(self.style.ERROR('No collection {}/{}'.format(no_collection_count, total_count)))

    def load_gameplatforms_to_mogno(self):
        with MongoClient(settings.MONGO_HOST, settings.MONGO_PORT) as client:
            db_collection = client.games[self.platforms_release_collection_name]
            queryset = self.get_queryset()
            loads_count, no_mongo_item_count, no_collection_count, total_count = self.get_statistic_counters(
                queryset,
            )

            self.stdout.write(self.style.SUCCESS('Start of load {} items'.format(total_count)))
            for item in queryset.iterator():
                game_dict = self.get_game_dict(item)
                collection = self.get_platforms_collection_mapping(item.platform)

                if not collection:
                    no_collection_count += 1
                    text = 'No collection for mapping'
                    self.print_error_message(text, item.platform, no_collection_count, total_count)
                    continue

                mongo_item = client.games[collection].find_one({'name': game_dict['name']})
                if not mongo_item:
                    no_mongo_item_count += 1
                    text = 'No item with name'
                    self.print_error_message(text, game_dict['name'], no_mongo_item_count, total_count)
                    continue

                game_dict.update({'application_id': mongo_item['id'], 'url': mongo_item['url']})
                db_collection.insert(game_dict)
                loads_count += 1
                self.print_status_message(total_count, loads_count)
                self.print_result_statistic(loads_count, no_mongo_item_count, no_collection_count, total_count)

    def handle(self, *args, **options):
        self.load_gameplatforms_to_mogno()
