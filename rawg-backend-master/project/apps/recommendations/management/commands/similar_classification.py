import os

import cv2
import numpy
import requests
from django.core.files.base import ContentFile
from django.core.files.temp import NamedTemporaryFile
from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction
from django.db.models import ExpressionWrapper, F, IntegerField, Prefetch
from psycopg2 import errorcodes
from tqdm import tqdm

from apps.games.models import Game, ScreenShot
from apps.recommendations.models import Classification, ClassificationQueue, NeighborQueue
from apps.recommendations.networks import NETWORKS
from apps.utils.backend_storages import FileSystemStorage
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    queue_ids = None
    # for localhost: SIMILAR_DOWNLOAD_PATH="http://localhost:8000/media/api/images/resize?path=media/resize/420/-/{}"
    image = os.environ.get('SIMILAR_DOWNLOAD_PATH', 'https://cdn.ag.ru/media/resize/420/-/{}')
    image_prefix = 'recommendations/image_420/'
    image_path = f'/app/media/{image_prefix}{{}}'
    batch_size = 2000

    def add_arguments(self, parser):
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)
        parser.add_argument('-s', '--screens', action='store', dest='screens', default=10, type=int)
        parser.add_argument('-g', '--games', action='store', dest='games', default=0, type=int)
        parser.add_argument('-q', '--queue', action='store_true', dest='queue', default=False)
        parser.add_argument('-r', '--revert', action='store_true', dest='revert', default=False)
        parser.add_argument('-f', '--force-replace', action='store_true', dest='force_replace', default=False)
        parser.add_argument('-d', '--download-only', action='store_true', dest='download_only', default=False)

    def handle(self, *args, **options):
        self.process_num = options['num']
        self.processes = options['len']
        self.screens_limit = options['screens']
        self.games_limit = options['games']
        self.queue = options['queue']
        self.force_replace = options['force_replace']
        self.download_only = options['download_only']
        self.qs = Game.objects.only('id').order_by('added' if options['revert'] else '-added').prefetch_related(
            Prefetch('screenshots', queryset=ScreenShot.objects.visible().only('id', 'image', 'game_id'))
        )
        if self.queue:
            queue = ClassificationQueue.objects.values_list('game_id', flat=True)
            self.queue_ids = queue.values_list('id', flat=True)
            if queue:
                self.qs = self.qs.filter(id__in=queue)
            else:
                self.stdout.write(self.style.SUCCESS('Queue is empty'))
                return
        if self.processes > 1:
            mod = ExpressionWrapper(F('id') % self.processes, output_field=IntegerField())
            self.qs = self.qs.annotate(mod=mod).filter(mod=self.process_num)
        if self.games_limit:
            self.qs = self.qs[0:self.games_limit]
        if not self.qs.count():
            self.stdout.write(self.style.SUCCESS('Queue is empty'))
            return
        self.screens = []
        bar = tqdm(self.qs if self.games_limit else self.qs.iterator(), total=self.qs.count())
        bar.set_description('Games')
        for game in bar:
            for screen in game.screenshots.all()[0:self.screens_limit]:
                self.screens.append(screen)
            if len(self.screens) > self.batch_size:
                self.retrieve_data()
                self.load_images()
                if not self.download_only:
                    self.classify()
                    self.classifications = []
                self.screens = []
        if self.screens:
            self.retrieve_data()
            self.load_images()
            if not self.download_only:
                self.classify()
        if self.queue:
            self.clear_queue()
        self.clear_fields()
        return 'ok'

    def clear_fields(self):
        self.classifications = None
        self.qs = None
        self.queue_ids = None
        self.screens = None

    def retrieve_data(self):
        self.classifications = Classification.objects.in_bulk(
            [screen.id for screen in self.screens], field_name='screenshot_id'
        )
        create_classifications = []
        for screen in self.screens:
            if self.classifications.get(screen.id):
                continue
            classification = Classification(screenshot=screen)
            create_classifications.append(classification)
            self.classifications[screen.id] = classification
        Classification.objects.bulk_create(create_classifications, batch_size=self.batch_size)

    def load_images(self):
        skip = 0
        errors = 0
        bar = tqdm(self.screens)
        bar.set_description(f'Load images. Skipped: {skip}. Errors: {errors}')
        for screen in bar:
            name = screen.image.name
            classification = self.classifications.get(screen.id)
            if (
                (classification.image_420 and not self.download_only)
                or FileSystemStorage().exists(f'{self.image_prefix}{name}')
            ):
                skip += 1
                bar.set_description(f'Load images. Skipped: {skip}. Errors: {errors}')
                continue
            try:
                response = requests.get(self.image.format(name))
                if response.status_code != 200:
                    raise Exception(f'{response.url} - status code {response.status_code}')
            except Exception as e:
                capture_exception(e, raise_on_debug=True, raise_on_tests=True)
                errors += 1
                bar.set_description(f'Load images. Skipped: {skip}. Errors: {errors}')
                continue
            classification.image_420.save(name, ContentFile(response.content))

    def classify(self):
        for network in NETWORKS:
            skip = 0
            errors = 0
            net = cv2.dnn.readNetFromCaffe(network.proto_path, network.model_path)
            layer_names = net.getLayerNames()
            before_last_layer_id = net.getLayerId(layer_names[-2])
            before_last_layer = net.getLayer(before_last_layer_id)
            bar = tqdm(self.screens)
            bar.set_description(f'Classify images {network.name}. Skipped: {skip}. Errors: {errors}')
            for screen in bar:
                image_name = screen.image.name
                classification = self.classifications.get(screen.id)
                attr = getattr(classification, network.slug)
                if (attr and not self.force_replace) or (attr.name and FileSystemStorage().exists(attr.name)):
                    skip += 1
                    bar.set_description(f'Classify images {network.name}. Skipped: {skip}. Errors: {errors}')
                    continue
                try:
                    net.setInput(cv2.dnn.blobFromImage(
                        cv2.imread(self.image_path.format(image_name)),
                        *network.image_params
                    ))
                except Exception as e:
                    capture_exception(e, raise_on_debug=True, raise_on_tests=True)
                    errors += 1
                    bar.set_description(f'Classify images {network.name}. Skipped: {skip}. Errors: {errors}')
                    continue
                fp = NamedTemporaryFile(suffix='.txt.gz')
                numpy.savetxt(fp.name, numpy.squeeze(net.forward(before_last_layer.name)))
                with transaction.atomic():
                    attr.save(f'{image_name}.txt.gz', fp)
                    if self.queue:
                        try:
                            NeighborQueue.objects.get_or_create(classification=classification, network=network.slug)
                        except IntegrityError as e:
                            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                                raise

    def clear_queue(self):
        if not self.queue_ids:
            return
        self.stdout.write(self.style.WARNING('Clear queue'))
        ClassificationQueue.objects.filter(id__in=self.queue_ids).delete()
        self.stdout.write(self.style.SUCCESS('OK'))
