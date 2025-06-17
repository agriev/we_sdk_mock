import json
import time
from datetime import timedelta
from math import ceil
from pathlib import Path

import hnswlib
import numpy
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from django.utils.timezone import now
from psycopg2 import errorcodes
from tqdm import tqdm

from apps.games.models import Game, ScreenShot
from apps.recommendations.models import Classification, Neighbor, NeighborQueue, ResultQueue
from apps.recommendations.networks import NETWORKS
from apps.utils.db import copy_from_conflict
from apps.utils.exceptions import capture_exception
from apps.utils.list import split


class Command(BaseCommand):
    index_m = 48
    ef_construction = 200
    ef = 200
    find_elements = 61
    index_path = '/app/indexes/{}.hnsw'
    batch_size = 2000
    queue_ids = None
    classify_after = None
    date = now()

    def add_arguments(self, parser):
        parser.add_argument('network', type=str)
        parser.add_argument('-r', '--rebuild', action='store_true', dest='rebuild', default=False)
        parser.add_argument('-k', '--keep-index', action='store_true', dest='keep_index', default=False)

    def handle(self, *args, **options):
        self.rebuild = options['rebuild']
        self.keep_index = options['keep_index']
        self.network = None
        for network in NETWORKS:
            if network.slug == options['network']:
                self.network = network
                break
        assert self.network
        self.index_name = self.index_path.format(self.network.slug)

        if self.rebuild:
            self.qs = Classification.objects.all()
            self.original_index_name = self.index_name
            if not self.keep_index:
                self.classify_after = self.qs.order_by('-id').first().id
                self.index_name = self.index_path.format(f'new-{self.network.slug}')
        else:
            self.qs = NeighborQueue.objects.filter(network=self.network.slug).prefetch_related('classification')
            self.queue_ids = self.qs.values_list('id', flat=True)

        if not self.qs.count():
            self.stdout.write(self.style.SUCCESS('Queue is empty'))
            return

        self.load_index()
        if self.add_data():
            self.search()
            self.save_index()
            self.copy_new_index()
            self.write_data()
            self.finish_rebuild()
        if not self.rebuild:
            self.clear_queue()
            self.clear_fields()

        return 'ok'

    def clear_fields(self):
        self.index = None
        self.labels = None
        self.qs = None
        self.queue_ids = None
        self.results = None
        self.results_distances = None
        self.results_screens = None
        self.screens = None

    def load_index(self, add_to_max_elements=100):
        self.stdout.write(self.style.WARNING('Index'))
        max_elements = (
            Classification.objects.count()
            + NeighborQueue.objects.filter(network=self.network.slug).count()
            + add_to_max_elements
        )
        if Path(self.index_name).exists():
            self.index = hnswlib.Index(space=self.network.space, dim=self.network.dimension)
            self.index.load_index(self.index_name, max_elements=max_elements)
        else:
            self.index = hnswlib.Index(space=self.network.space, dim=self.network.dimension)
            self.index.init_index(max_elements=max_elements, ef_construction=self.ef_construction, M=self.index_m)
        self.index.set_ef(self.ef)
        self.labels = self.index.get_ids_list()
        self.stdout.write(self.style.SUCCESS('OK'))

    def add_data(self):
        if self.keep_index:
            self.screens = self.labels
            return True

        self.stdout.write(self.style.WARNING('Retrieve data'))
        start_time = time.monotonic()
        data = []
        self.screens = []
        errors = 0
        for classification in tqdm(self.qs.iterator(), total=self.qs.count()):
            if not self.rebuild:
                classification = classification.classification
            attr = getattr(classification, self.network.slug)
            if not attr:
                continue
            if classification.screenshot_id in self.labels:
                continue
            try:
                data.append(numpy.loadtxt(attr.path))
            except OSError as e:
                capture_exception(e, raise_on_debug=True, raise_on_tests=True)
                attr.delete()
                errors += 1
                continue
            self.screens.append(classification.screenshot_id)
        if not data:
            return False
        if errors:
            self.stdout.write(self.style.ERROR(f'ERRORS - {errors}'))
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

        self.stdout.write(self.style.WARNING('Add data'))
        start_time = time.monotonic()
        self.add_data_in_index(data)
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

        return True

    def add_data_in_index(self, data, max_elements=0):
        if max_elements:
            # reload index with new max_elements count
            self.load_index(max_elements)
        try:
            self.index.add_items(numpy.float32(data), numpy.uint64(self.screens))
        except RuntimeError:
            max_elements += 1000
            self.add_data_in_index(data, max_elements=max_elements)

    def search(self):
        self.stdout.write(self.style.WARNING('Search'))
        start_time = time.monotonic()
        self.results = []
        self.results_distances = []
        for ids in tqdm(split(self.screens, self.batch_size * 10)):
            results, results_distances = self.index.knn_query(self.index.get_items(ids), k=self.find_elements)
            self.results += list(results)
            self.results_distances += list(results_distances)
        self.results_screens = {screen_id for row in self.results for screen_id in row}
        self.results_screens.update(self.screens)
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

    def save_index(self):
        self.stdout.write(self.style.WARNING('Save index'))
        start_time = time.monotonic()
        Path(Path(self.index_name).parent).mkdir(exist_ok=True)
        self.index.save_index(self.index_name)
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

    def copy_new_index(self):
        if not self.rebuild:
            return
        self.stdout.write(self.style.WARNING('Copy new index'))
        start_time = time.monotonic()
        Path(self.index_name).rename(self.original_index_name)
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

    def write_data(self):
        self.stdout.write(self.style.WARNING('Retrieve screenshots'))
        start_time = time.monotonic()
        screens_games = dict(ScreenShot.objects.filter(id__in=self.results_screens).values_list('id', 'game_id'))
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

        self.stdout.write(self.style.WARNING('Record neighbors'))
        start_time = time.monotonic()

        games = {}
        for i, screen_id in enumerate(self.screens):
            base_game_id = screens_games.get(screen_id)
            if not base_game_id:
                # screen was deleted
                continue
            games.setdefault(base_game_id, {})[screen_id] = i
        neighbors = {}
        result_queue = set()
        count = len(games)
        with tqdm(total=ceil(count / self.batch_size)) as bar:
            for k, (base_game_id, screens) in enumerate(games.items()):
                for screen_id, i in screens.items():
                    for j, neighbor_id in enumerate(self.results[i]):
                        neighbor_game_id = screens_games.get(neighbor_id)
                        if not neighbor_game_id:
                            # screen was deleted
                            continue
                        if base_game_id == neighbor_game_id:
                            continue
                        neighbors.setdefault(base_game_id, []).append({
                            'screen_id': screen_id,
                            'neighbor_id': int(neighbor_id),
                            'distance': float(self.results_distances[i][j]),
                            'neighbor_game_id': neighbor_game_id,
                        })
                        if not self.rebuild:
                            result_queue.add(base_game_id)
                            result_queue.add(neighbor_game_id)
                if not k and count > 1:
                    continue
                if len(neighbors) % self.batch_size == 0 or k + 1 == count:
                    self.create_neighbours(neighbors.items(), result_queue)
                    neighbors = {}
                    bar.update(1)

        if result_queue:
            bar = tqdm(split([(game_id, self.date) for game_id in result_queue], self.batch_size))
            bar.set_description('Create Result Queue')
            for bulk in bar:
                with transaction.atomic():
                    copy_from_conflict(
                        ResultQueue, ['game_id', 'created'], bulk,
                        '(game_id) DO NOTHING',
                        'temp_recommendations_result_queue_{}'.format(self.network.slug)
                    )
        self.stdout.write(self.style.SUCCESS(f'OK - {timedelta(seconds=time.monotonic() - start_time)}'))

    def create_neighbours(self, bulk, result_queue):
        try:
            with transaction.atomic():
                copy_from_conflict(
                    Neighbor,
                    ['game_id', 'neighbors', 'network', 'created', 'updated'],
                    [(game_id, json.dumps(neighbors), self.network.slug, self.date, self.date)
                     for game_id, neighbors in bulk],
                    '(game_id, network) DO UPDATE SET neighbors = EXCLUDED.neighbors, updated = EXCLUDED.updated',
                    'temp_recommendations_neighbors_{}'.format(self.network.slug)
                )
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                raise
            # filter deleted games
            game_ids = Game.objects.filter(id__in=[game_id for game_id, _ in bulk]).values_list('id', flat=True)
            new_bulk = []
            for game_id, neighbors in bulk:
                if game_id not in game_ids:
                    result_queue.remove(game_id)
                    continue
                new_bulk.append((game_id, neighbors))
            self.create_neighbours(new_bulk, result_queue)

    def finish_rebuild(self):
        if not self.rebuild:
            return

        if self.classify_after:
            self.stdout.write(self.style.WARNING('Delete old neighbor queue records'))
            start_time = time.monotonic()
            records = NeighborQueue.objects.only('id').filter(
                network=self.network.slug, classification_id__lte=self.classify_after
            ).delete()
            self.stdout.write(self.style.SUCCESS(
                f'OK - {records[0]} records - {timedelta(seconds=time.monotonic() - start_time)}'
            ))

            self.stdout.write(self.style.WARNING('Create neighbor queue records for new classifications'))
            start_time = time.monotonic()
            records = [
                (pk, self.network.slug, self.date) for pk in
                Classification.objects.filter(id__gt=self.classify_after).values_list('id', flat=True)
            ]
            with transaction.atomic():
                copy_from_conflict(
                    NeighborQueue, ['classification_id', 'network', 'created'], records,
                    '(classification_id, network) DO NOTHING',
                    'temp_recommendations_neighbors_queue_{}'.format(self.network.slug)
                )
            self.stdout.write(self.style.SUCCESS(
                f'OK - {len(records)} records - {timedelta(seconds=time.monotonic() - start_time)}'
            ))

    def clear_queue(self):
        if not self.queue_ids:
            return
        self.stdout.write(self.style.WARNING('Clear queue'))
        NeighborQueue.objects.filter(id__in=self.queue_ids).delete()
        self.stdout.write(self.style.SUCCESS('OK'))
