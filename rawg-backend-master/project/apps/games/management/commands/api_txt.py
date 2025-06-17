import csv
import json
import os
from datetime import timedelta

import settings
from dateutil.tz import tzlocal
from dateutil.utils import today
from django.contrib.auth.models import AnonymousUser
from django.core.management.base import BaseCommand
from django.utils import translation
from rest_framework.views import APIView
from tqdm import tqdm

from api.games.serializers import GameSingleSerializer
from apps.games.models import Game, ScreenShot
from apps.utils.api import int_or_none
from apps.utils.db import copy_to
from apps.utils.dicts import find
from apps.utils.lang import fake_request_by_language

LANGUAGE_ISO2 = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)
SCREENS_LIMIT = 100


class Command(BaseCommand):
    help = 'Save games as TXT API'

    def add_arguments(self, parser):
        parser.add_argument('-d', '--days', action='store', dest='days', default=0, type=int)
        parser.add_argument('-a', '--all', action='store_true', dest='all', default=False)
        parser.add_argument('-s', '--screens', action='store', dest='screens_limit', default=SCREENS_LIMIT, type=int)
        parser.add_argument('--disable-suggested', action='store_true', dest='disable_suggested', default=False)
        parser.add_argument('--disable-clip', action='store_true', dest='disable_clip', default=False)

    def postgres_bool(self, val):
        return val == 't'

    def handle(self, *args, **options):
        qs = Game.objects.defer_always()
        screens = {}

        if not options['all']:
            today_midnight = today(tzlocal())
            days = options['days']
            if days:
                today_midnight -= timedelta(days=days)
            qs = qs.filter(updated__range=[today_midnight - timedelta(days=1), today_midnight])

            self.stdout.write(self.style.SUCCESS('Screens'))
            screens_qs = ScreenShot.objects.filter(
                game_id__in=qs.values_list('id', flat=True), hidden=False
            ).only('id', 'image', 'game_id', 'width', 'height')
            raw_screens = {}
            for screen in tqdm(screens_qs.iterator(), total=screens_qs.count()):
                raw_screens.setdefault(screen.game_id, []).append((
                    screen.id, screen.image.name, screen.width, screen.height
                ))
            for game_id, game_screens in tqdm(raw_screens.items()):
                screens[game_id] = game_screens[:options['screens_limit']]
        else:
            self.stdout.write(self.style.SUCCESS('Screens'))
            stream = copy_to(
                ScreenShot,
                ['game_id', 'image', 'is_small', 'is_external', 'id', 'hidden', 'width', 'height']
            )
            stream.seek(0)
            lines = sum(1 for _ in stream)
            stream.seek(0)
            raw_screens = {}
            for game_id, image, is_small, is_external, pk, is_hidden, width, height \
                    in tqdm(csv.reader(stream), total=lines):
                game_id = int(game_id)
                is_small = self.postgres_bool(is_small)
                is_external = self.postgres_bool(is_external)
                pk = int(pk)
                if self.postgres_bool(is_hidden):
                    continue
                width = int_or_none(width)
                height = int_or_none(height)
                raw_screens.setdefault(game_id, []).append([image, is_small, is_external, pk, width, height])
            del stream
            for game_id, game_screens in tqdm(raw_screens.items()):
                screens[game_id] = [
                    (z[3], z[0], z[4], z[5]) for z in sorted(game_screens, key=lambda x: (x[0], x[1], -x[2]))
                    [:options['screens_limit']]
                ]
            del raw_screens

        # games
        self.stdout.write(self.style.SUCCESS('Games'))
        with translation.override(LANGUAGE_ISO2):
            request = fake_request_by_language(LANGUAGE_ISO2)
            request.user = AnonymousUser()
            request.API_CLIENT = 'txt'
            request.API_CLIENT_IS_WEBSITE = True
            request.API_GROUP = settings.API_GROUP_UNLIMITED
            view = APIView()
            view.action = 'retrieve'
            context = {'request': request, 'view': view}
            for game in tqdm(qs.iterator(), total=qs.count()):
                data = GameSingleSerializer(game, context=context).data
                data['screenshots'] = [
                    {'id': pk, 'image': settings.MEDIA_URL + image, 'width': width, 'height': height}
                    for pk, image, width, height in screens.get(game.id, [])
                ]
                if data['screenshots']:
                    del screens[game.id]
                if not options['disable_suggested']:
                    data['suggested'] = [
                        {'id': pk} for pk in find(game.suggestions, 'games', [])
                    ]
                if options['disable_clip']:
                    del data['clip']
                with open(f'/tmp/{game.id}.json', 'w') as f:
                    json.dump(data, f)
