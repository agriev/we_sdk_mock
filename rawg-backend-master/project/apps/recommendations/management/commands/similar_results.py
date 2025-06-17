import time
from datetime import timedelta
from math import ceil

from bulk_update.helper import bulk_update
from django.core.management.base import BaseCommand
from tqdm import tqdm

from apps.credits.models import GamePerson
from apps.games.models import Game
from apps.recommendations.models import Neighbor, ResultQueue


class Command(BaseCommand):
    batch_size = 2000
    queue_ids = None

    def add_arguments(self, parser):
        parser.add_argument('-r', '--rebuild', action='store_true', dest='rebuild', default=False)
        parser.add_argument('-n', '--network', action='store', dest='network', default=None, type=str)

    def handle(self, *args, **options):
        self.rebuild = options['rebuild']
        self.network = options['network']
        if self.rebuild:
            self.qs = Neighbor.objects.values_list('game_id', flat=True)
        else:
            self.qs = ResultQueue.objects.values_list('game_id', flat=True)
            self.queue_ids = ResultQueue.objects.values_list('id', flat=True)
        if not self.qs.count():
            self.stdout.write(self.style.SUCCESS('Queue is empty'))
            return
        self.process()
        if not self.rebuild:
            self.clear_queue()
            self.clear_fields()
        return 'ok'

    def clear_fields(self):
        self.added = None
        self.meta = None
        self.qs = None
        self.queue_ids = None

    def process(self):
        self.stdout.write(self.style.WARNING('Retrieve meta'))
        start_time = time.monotonic()

        fields = ('developers_json', 'genres_json', 'tags_json', 'publishers_json')
        self.added = {}
        self.meta = {}
        persons = {}
        for game_id, person_id in GamePerson.objects.values_list('game_id', 'person_id'):
            persons.setdefault(game_id, []).append(f'persons:{person_id}')
        for game in Game.objects.values('id', 'added', *fields):
            self.added[game['id']] = game['added']
            self.meta[game['id']] = set()
            for field in fields:
                for row in game[field] or []:
                    self.meta[game['id']].add(f'{field.split("_")[0]}:{row["id"]}')
            if persons.get(game['id']):
                self.meta[game['id']].update(persons[game['id']])

        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

        self.stdout.write(self.style.WARNING('Process'))
        start_time = time.monotonic()

        ids = []
        count = self.qs.count()
        with tqdm(total=ceil(count / self.batch_size)) as bar:
            for i, pk in enumerate(self.qs.iterator(chunk_size=self.batch_size)):
                ids.append(pk)
                if len(ids) == self.batch_size or i + 1 == count:
                    self.process_ids(ids)
                    ids = []
                    bar.update()

        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

    def process_ids(self, ids):
        games = {}
        qs = Neighbor.objects.filter(game_id__in=ids)
        if self.network:
            qs = qs.filter(network=self.network)
        for instance in qs:
            nets = games.setdefault(instance.game_id, {})
            combined = {}
            for row in instance.neighbors:
                if not self.added.get(row['neighbor_game_id']):
                    continue
                combined.setdefault(row['neighbor_game_id'], 0)
                combined[row['neighbor_game_id']] += row['distance']
            if not combined:
                continue
            min_value = min(combined.values())
            max_value = max(combined.values())
            one_percent = ((max_value - min_value) / 100) or 1
            net = []
            for game_id, distance in combined.items():
                net.append({
                    'game_id': game_id,
                    'distance': distance,
                    'percent': ((distance - min_value) / one_percent),
                })
            nets[instance.network] = sorted(net, key=lambda x: -x['distance'])

        for game_id, nets in games.items():
            total = {}
            for values in nets.values():
                for value in values:
                    try:
                        row = total.setdefault(
                            value['game_id'],
                            {
                                'game_id': value['game_id'],
                                'distance': 0,
                                'percent': 0,
                                'intersection': len(self.meta[game_id].intersection(self.meta[value['game_id']])),
                            }
                        )
                    except KeyError:
                        continue
                    row['distance'] += value['distance']
                    row['percent'] += value['percent']
            nets['_total'] = sorted(total.values(), key=lambda x: (-x['intersection'], -x['percent']))

        result = []
        for game_id, nets in games.items():
            game = Game()
            game.id = game_id
            game.suggestions = {'games': [row['game_id'] for row in nets['_total']]}
            game.suggestions_count = len(game.suggestions['games'])
            result.append(game)
            # todo write game log in file

        bulk_update(result, update_fields=['suggestions', 'suggestions_count'], batch_size=self.batch_size)

    def clear_queue(self):
        if not self.queue_ids:
            return
        self.stdout.write(self.style.WARNING('Clear queue'))
        ResultQueue.objects.filter(id__in=self.queue_ids).delete()
        self.stdout.write(self.style.SUCCESS('OK'))
