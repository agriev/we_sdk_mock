import multiprocessing
from functools import partial

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Prefetch
from tqdm import tqdm

from apps.games.models import Game, ScreenShot


class Command(BaseCommand):
    help = 'Pre-resize via http requests'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default='', type=str)
        parser.add_argument('-s', '--screens', action='store_true', dest='screens', default=False)
        parser.add_argument('-z', '--sizes', action='store', dest='sizes', default='', type=str)

    def handle(self, *args, **options):
        self.is_screens = options['screens']
        self.game_id = options['game_id']
        self.sizes = set(map(int, options['sizes'].split(',')))
        self.games()
        self.stdout.write(self.style.SUCCESS('OK'))

    def games(self):
        qs = Game.objects.only('id', 'image', 'image_background').order_by('-id')
        if self.is_screens:
            qs = qs.prefetch_related(Prefetch('screenshots', queryset=ScreenShot.objects.only('id', 'image')))
        if self.game_id:
            if self.game_id[0] == '>':
                qs = qs.filter(id__gt=self.game_id[1:])
            else:
                qs = qs.filter(id__in=self.game_id.split(','))

        images = []
        for game in qs.iterator():
            images += self.process_game(game, self.is_screens, self.sizes)

        pool = multiprocessing.Pool(settings.POOL_SIZE)
        with tqdm(total=len(images)) as pbar:
            for _ in pool.imap(partial(requests.head, allow_redirects=True), images):
                pbar.update(1)
        pool.close()

    def process_game(self, game, with_screens=False, sizes=None):
        result = []
        game_url = game.background_image_full
        if game_url:
            for size in settings.PRE_RESIZE_BACKGROUND:
                if sizes and size not in sizes:
                    continue
                result.append(game_url.replace('/media/', f'/media/resize/{size}/-/'))
            for width, height in settings.PRE_CROP_BACKGROUND:
                if sizes and width not in sizes:
                    continue
                result.append(game_url.replace('/media/', f'/media/crop/{width}/{height}/'))
        if with_screens:
            for screen in game.screenshots.all():
                for size in settings.PRE_RESIZE_SCREENS:
                    if sizes and size not in sizes:
                        continue
                    result.append(screen.image.url.replace('/media/', f'/media/resize/{size}/-/'))
        return result
