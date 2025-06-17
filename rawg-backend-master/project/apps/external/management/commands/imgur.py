from datetime import datetime
from time import sleep

import pytz
import requests
from bulk_update.helper import bulk_update
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import Q
from psycopg2 import errorcodes
from requests.exceptions import ConnectionError

from apps.external.models import Imgur
from apps.games.models import Game
from apps.utils.exceptions import capture_exception


class ImgurException(Exception):
    def __init__(self, message):
        self.message = message


class Command(BaseCommand):
    def handle(self, *args, **options):
        if not options['game_id']:
            self.clear()
        try:
            self.run(options)
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR('Imgur: {}'.format(e)))
        self.stdout.write(self.style.SUCCESS('Imgur: OK'))

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)
        parser.add_argument('-d', '--demo', action='store', dest='demo', default=False, type=bool)

    def run(self, options):
        qs = (
            Game.objects
            .filter(Q(added__gte=settings.POPULAR_GAMES_MIN_ADDED) | Q(display_external=True))
            .order_by('-added')
            .only('id', 'name', 'is_complicated_name', 'imgur_name', 'import_collection', 'display_external', 'added')
        )
        if options['game_id']:
            qs = qs.filter(id=options['game_id'])
        if options['demo']:
            qs = qs[0:100]
            total = 100
        else:
            total = qs.count()
        for i, game in enumerate(qs):
            if game.import_collection == 'old':
                continue
            try:
                self.game(game)
                self.stdout.write(self.style.SUCCESS('Imgur: {} of {}'.format(i, total)))
            except ImgurException as e:
                self.stdout.write(self.style.WARNING('Imgur: {}'.format(e.message)))

    def game(self, game):
        ids = set(Imgur.objects.filter(game_id=game.id).values_list('id', flat=True))
        game_name = game.name
        if game.imgur_name:
            game_name = game.imgur_name
        elif game.is_complicated_name:
            game_name = '{} game'.format(game.name)
        for img in get_images(game_name, self.stdout, self.style):
            defaults = get_defaults(img)
            try:
                instance, created = Imgur.objects.get_or_create(
                    external_id=img['id'], game_id=game.id, defaults=defaults
                )
            except IntegrityError as e:
                if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                    raise
                return
            if not created:
                ids.discard(instance.id)
                for key, value in defaults.items():
                    setattr(instance, key, value)
                    instance.save()
        if ids:
            Imgur.objects.filter(id__in=ids).delete()
        game.imgur_count = Imgur.objects.filter(game_id=game.id).count() if game.is_display_external else 0
        try:
            game.save(update_fields=['imgur_count'])
        except Game.DoesNotExist:
            return

    def clear(self):
        qs = Game.objects.filter(
            display_external=False, added__lt=settings.POPULAR_GAMES_MIN_ADDED, imgur_count__gt=0
        )
        data = []
        for game in qs:
            game.imgur_count = 0
            data.append(game)
        if data:
            bulk_update(data, update_fields=['imgur_count'])
        self.stdout.write(self.style.SUCCESS('Fixed: {}'.format(len(data))))


def get_images(name, stdout, style, sort='viral', window='all', page=0, retry=True):
    search_url = 'https://api.imgur.com/3/gallery/search/{}/{}/{}'.format(sort, window, page)
    headers = {'authorization': 'Client-ID {}'.format(settings.IMGUR_CLIENT_ID)}
    sleep(0.5)
    try:
        response = requests.get(search_url, params={'q': name}, headers=headers)
    except ConnectionError as e:
        if retry:
            sleep(5)
            return get_images(name, stdout, style, sort, window, page, False)
        raise ImgurException('Error: {}'.format(e.__class__.__name__))
    if response.status_code == 429:
        pause(response, stdout, style)
        return get_images(name, stdout, style, sort, window, page)
    if response.status_code != 200:
        if retry:
            stdout.write(style.WARNING('Imgur: pause, response status {}'.format(response.status_code)))
            sleep(5)
            return get_images(name, stdout, style, sort, window, page, False)
        raise ImgurException('Response status: {}'.format(response.status_code))
    if int(response.headers['X-RateLimit-ClientRemaining']) < 500:
        stdout.write(style.WARNING('Imgur: the limit of requests is small'))
        exit(0)
    data = []
    for img in response.json().get('data') or []:
        if img['is_album'] and not img['images']:
            continue
        data.append(img)
    return data


def pause(response, stdout, style):
    user_reset = response.headers.get('X-RateLimit-UserReset')
    if user_reset:
        seconds = (datetime.fromtimestamp(float(user_reset)) - datetime.now()).seconds + 10
    else:
        seconds = 3600 + 60
    stdout.write(style.WARNING('Imgur: pause {} seconds'.format(seconds)))
    sleep(seconds)


def get_defaults(img):
    defaults = {
        'name': img['title'][0:500] or '',
        'description': img['description'] or '',
        'created': pytz.utc.localize(datetime.fromtimestamp(img['datetime'])),
        'image': img['link'] if not img['is_album'] else img['images'][0]['link'],
        'url': settings.IMGUR_URL.format(img['id']) if not img['is_album'] else img['link'],
        'is_gallery': img['is_album'],
        'view_count': img['views'],
        'comments_count': img['comment_count'] if img['comment_count'] and img['comment_count'] > 0 else 0,
        'data': img,
        'image_id': img['id'] if not img['is_album'] else img['images'][0]['id']
    }
    if defaults['image'].startswith('http://'):
        defaults['image'] = 'https://{}'.format(defaults['image'][7:])
    return defaults
