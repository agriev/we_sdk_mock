import logging
import multiprocessing
from subprocess import CalledProcessError

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.games.models import Game, ScreenShot
from apps.utils.images import crop, resize

logger = logging.getLogger('info')


class Command(BaseCommand):
    help = 'Pre-resize'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default='', type=str)
        parser.add_argument('-s', '--screens', action='store_true', dest='screens', default=False)

    def handle(self, *args, **options):
        self.is_screens = options['screens']
        self.game_id = options['game_id']
        self.games()
        self.stdout.write(self.style.SUCCESS('OK'))

    def games(self):
        qs = Game.objects.order_by('id')
        if self.is_screens:
            qs = qs.prefetch_related('screenshots')
        if self.game_id[0] == '>':
            qs = qs.filter(id__gt=self.game_id[1:])
        else:
            qs = qs.filter(id__in=self.game_id.split(','))
        pool = multiprocessing.Pool(settings.POOL_SIZE)
        pool.map(process_game_screen if self.is_screens else process_game, qs.iterator())
        pool.close()


def process_game(game):
    process_games(game, False)


def process_game_screen(game):
    process_games(game, True)


def process_games(game, with_screens=False):
    if game.image:
        try:
            resize(game.image, settings.PRE_RESIZE_BACKGROUND)
            crop(game.image, settings.PRE_CROP_BACKGROUND)
        except (FileNotFoundError, OSError):
            logger.info('#{} {}'.format(game.id, game.image.name))
            return
        except CalledProcessError:
            logger.info('#{} {}'.format(game.id, game.image.name))
            return
    elif game.image_background:
        try:
            screen = ScreenShot.objects.get(image=game.image_background.split(settings.MEDIA_URL).pop())
        except ScreenShot.DoesNotExist:
            logger.info('#{}'.format(game.id))
            return
        process_screen(screen, game, settings.PRE_RESIZE_BACKGROUND, settings.PRE_CROP_BACKGROUND)
    if with_screens:
        for screen in game.screenshots.all():
            process_screen(screen, game, settings.PRE_RESIZE_SCREENS)
    print('game', game.id)


def process_screen(screen, game, resize_sizes, crop_sizes=None):
    try:
        resize(screen.image, resize_sizes)
        if crop_sizes:
            crop(screen.image, crop_sizes)
    except (FileNotFoundError, OSError):
        logger.info('#{} {}'.format(game.id, screen.image.name))
        return
    except CalledProcessError:
        logger.info('#{} {}'.format(game.id, screen.image.name))
        return
