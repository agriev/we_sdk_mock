import os

import pycountry
from bulk_update.helper import bulk_update
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import Q
from django.utils.timezone import now
from psycopg2 import errorcodes
from twitchAPI.twitch import Twitch as TwitchAPI
from twitchAPI.types import SortMethod, TwitchBackendException

from apps.external.models import Twitch
from apps.games.models import Game
from apps.utils.exceptions import capture_exception

TWITCH_LANGUAGE = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)
TWITCH_LANGUAGE_ISO3 = settings.LANGUAGES_2_TO_3[TWITCH_LANGUAGE]


class Command(BaseCommand):
    game_id_url = 'https://api.twitch.tv/helix/games'
    videos_url = 'https://api.twitch.tv/helix/videos'
    headers = {'Client-ID': settings.TWITCH_CLIENT_ID}
    twitch = None

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)
        parser.add_argument('-d', '--demo', action='store', dest='demo', default=False, type=bool)

    def handle(self, *args, **options):
        self.setup()
        if not options['game_id']:
            self.clear()
        try:
            self.run(options)
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR('Twitch: {}'.format(e)))
        self.stdout.write(self.style.SUCCESS('Twitch: OK'))

    def setup(self):
        self.twitch = TwitchAPI(settings.TWITCH_CLIENT_ID, settings.TWITCH_CLIENT_SECRET)
        self.headers['Authorization'] = f'Bearer {self.twitch.get_app_token()}'

    def run(self, options):
        fields_save = ('twitch_id', 'twitch_not_found', 'twitch_name', 'twitch_counts')
        fields = fields_save + ('name', 'import_collection', 'display_external', 'added')
        qs = (
            Game.objects
            .filter(Q(added__gte=settings.POPULAR_GAMES_MIN_ADDED) | Q(display_external=True))
            .order_by('-added')
            .only('id', *fields)
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
                self.game(game, fields_save)
                self.stdout.write(self.style.SUCCESS('Twitch: {} of {}'.format(i, total)))
            except TwitchBackendException as e:
                self.stdout.write(self.style.WARNING('Twitch: {}'.format(e)))

    def game(self, game, fields_save):
        if game.twitch_not_found:
            return
        ids = set(Twitch.objects.filter(game_id=game.id, language=TWITCH_LANGUAGE_ISO3).values_list('id', flat=True))
        if not game.twitch_id:
            game.twitch_id = self.get_id(game.twitch_name if game.twitch_name else game.name)
        if not game.twitch_id:
            game.twitch_not_found = True
            self.stdout.write(self.style.WARNING('Twitch: not found {}'.format(game.name)))
        else:
            game.twitch_not_found = False
            for video in self.get_videos(game.twitch_id):
                defaults = get_defaults(video)
                try:
                    instance, created = Twitch.objects.get_or_create(
                        external_id=video['id'], game_id=game.id, defaults=defaults
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
            if not game.twitch_counts:
                game.twitch_counts = {}
            game.twitch_counts[TWITCH_LANGUAGE_ISO3] = (
                Twitch.objects.filter(game_id=game.id, language=TWITCH_LANGUAGE_ISO3).count()
                if game.is_display_external else 0
            )
        game.save(update_fields=fields_save)
        if ids:
            Twitch.objects.filter(id__in=ids).delete()

    def get_id(self, name):
        data = self.twitch.get_games(names=[name.strip()])
        if not data or not data.get('data'):
            return None
        return data['data'].pop(0)['id']

    def get_videos(self, twitch_id):
        data = self.twitch.get_videos(
            game_id=twitch_id,
            first=100,
            sort=SortMethod.VIEWS,
            language=TWITCH_LANGUAGE,
        )
        if not data or not data.get('data'):
            return []
        return data['data']

    def clear(self):
        qs = Game.objects.only('twitch_counts').filter(
            display_external=False, added__lt=settings.POPULAR_GAMES_MIN_ADDED
        ).exclude(**{
            f'twitch_counts__{TWITCH_LANGUAGE_ISO3}': 0
        })
        data = []
        for game in qs:
            if not game.twitch_counts:
                game.twitch_counts = {}
            game.twitch_counts[TWITCH_LANGUAGE_ISO3] = 0
            data.append(game)
        if data:
            bulk_update(data, update_fields=['twitch_counts'])
        self.stdout.write(self.style.SUCCESS('Fixed: {}'.format(len(data))))


def get_defaults(video, is_stream=False):
    language = video.get('language')
    lang_iso_3 = ''
    if language:
        country = pycountry.languages.get(alpha_2=language)
        if country:
            lang_iso_3 = country.alpha_3
    data = {
        'external_user_id': video['user_id'],
        'name': video['title'][0:500],
        'description': video.get('description') or '',
        'created': video.get('created_at') or video.get('started_at') or now(),
        'published': video.get('published_at') or video.get('started_at') or now(),
        'thumbnail': video['thumbnail_url'],
        'view_count': video.get('view_count') or video.get('viewer_count') or 0,
        'language': lang_iso_3,
    }
    if is_stream:
        data['channel'] = video.get('channel') or ''
    return data
