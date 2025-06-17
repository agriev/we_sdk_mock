import os
from time import sleep

import requests
from bulk_update.helper import bulk_update
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import IntegrityError
from django.db.models import Q
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from psycopg2 import errorcodes
from requests.exceptions import ConnectionError

from apps.external.models import Youtube
from apps.games.models import Game
from apps.utils.api import get_object_or_none
from apps.utils.dicts import find
from apps.utils.exceptions import capture_exception

YOUTUBE_LANGUAGE = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)
YOUTUBE_LANGUAGE_ISO3 = settings.LANGUAGES_2_TO_3[YOUTUBE_LANGUAGE]


class Command(BaseCommand):
    complicated_games_addtions = {
        settings.LANGUAGE_ENG: 'video game',
        settings.LANGUAGE_RUS: 'обзор',
    }

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)
        parser.add_argument('-d', '--demo', action='store', dest='demo', default=False, type=bool)

    def handle(self, *args, **options):
        if not options['game_id']:
            self.clear()
        try:
            self.run(options)
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR('Youtube: {}'.format(e)))
        self.stdout.write(self.style.SUCCESS('Youtube: OK'))

    def run(self, options):
        qs = (
            Game.objects
            .filter(Q(added__gte=settings.POPULAR_GAMES_MIN_ADDED) | Q(display_external=True))
            .order_by('-added')
            .only('id', 'name', 'is_complicated_name', 'youtube_name', 'youtube_counts', 'display_external', 'added')
        )
        if options['game_id']:
            qs = qs.filter(id=options['game_id'])
        if options['demo']:
            qs = qs[0:100]
            total = 100
        else:
            total = qs.count()
        for i, game in enumerate(qs):
            ids = set(
                Youtube.objects.filter(game_id=game.id, language=YOUTUBE_LANGUAGE_ISO3).values_list('id', flat=True)
            )
            game_name = game.name
            if game.youtube_name:
                game_name = game.youtube_name
            if (
                (not game.youtube_name and game.is_complicated_name)
                or YOUTUBE_LANGUAGE != settings.MODELTRANSLATION_DEFAULT_LANGUAGE
            ):
                game_name = f'{game_name} {self.complicated_games_addtions[YOUTUBE_LANGUAGE_ISO3]}'
            videos, count, _ = get_videos(query=game_name, relevanceLanguage=YOUTUBE_LANGUAGE)
            for video in videos:
                instance = get_object_or_none(
                    Youtube, external_id=video['id'], game_id=game.id, language=YOUTUBE_LANGUAGE_ISO3
                )
                defaults = get_defaults(video, instance)
                if instance:
                    ids.discard(instance.id)
                    changed = False
                    for key, value in defaults.items():
                        if value != getattr(instance, key):
                            setattr(instance, key, value)
                            changed = True
                    if changed:
                        instance.save()
                else:
                    try:
                        Youtube.objects.get_or_create(
                            external_id=video['id'], game_id=game.id, language=YOUTUBE_LANGUAGE_ISO3, defaults=defaults
                        )
                    except IntegrityError as e:
                        if e.__cause__.pgcode != errorcodes.FOREIGN_KEY_VIOLATION:
                            raise
                    continue
            if len(videos) < settings.POPULAR_GAMES_MIN_ADDED:
                count = len(videos)
            new_count = count if game.is_display_external else 0
            if new_count != find(game.youtube_counts, YOUTUBE_LANGUAGE_ISO3):
                if not game.youtube_counts:
                    game.youtube_counts = {}
                game.youtube_counts[YOUTUBE_LANGUAGE_ISO3] = new_count
                try:
                    game.save(update_fields=['youtube_counts'])
                except Game.DoesNotExist:
                    continue
            if ids:
                Youtube.objects.filter(id__in=ids).delete()
            self.stdout.write(self.style.SUCCESS('Youtube: {} of {}'.format(i, total)))

    def clear(self):
        qs = Game.objects.only('youtube_counts').filter(
            display_external=False, added__lt=settings.POPULAR_GAMES_MIN_ADDED,
        ).exclude(**{
            f'youtube_counts__{YOUTUBE_LANGUAGE_ISO3}': 0
        })
        data = []
        for game in qs:
            if not game.youtube_counts:
                game.youtube_counts = {}
            game.youtube_counts[YOUTUBE_LANGUAGE_ISO3] = 0
            data.append(game)
        if data:
            bulk_update(data, update_fields=['youtube_counts'])
        self.stdout.write(self.style.SUCCESS('Fixed: {}'.format(len(data))))


def get_videos(query=None, playlist=None, retry=True, **params):
    try:
        youtube = build('youtube', 'v3', developerKey=settings.YOUTUBE_DEVELOPER_KEY, cache_discovery=False)
    except HttpError:
        if retry:
            sleep(5)
            return get_videos(query, playlist, False, **params)
        raise
    if playlist:
        kwargs = {
            'playlistId': playlist,
            'part': 'id,snippet',
            'maxResults': settings.POPULAR_GAMES_MIN_ADDED,
        }
        if params:
            kwargs.update(params)
        try:
            search_response = youtube.playlistItems().list(**kwargs).execute()
        except HttpError:
            if retry:
                sleep(5)
                return get_videos(query, playlist, False, **params)
            raise
        for search_result in search_response.get('items', []):
            search_result['id'] = {'videoId': search_result['snippet']['resourceId']['videoId']}
    elif query:
        kwargs = {
            'q': query,
            'part': 'id,snippet',
            'maxResults': settings.POPULAR_GAMES_MIN_ADDED,
            'type': 'video',
            'videoCategoryId': 20,
            'order': 'relevance',
        }
        if params:
            kwargs.update(params)
        try:
            search_response = youtube.search().list(**kwargs).execute()
        except HttpError:
            if retry:
                sleep(5)
                return get_videos(query, playlist, False, **params)
            raise
    else:
        return [], 0, None

    ids = {}
    for search_result in search_response.get('items', []):
        try:
            ids[search_result['id']['videoId']] = None
        except KeyError:
            search_result['id'] = {'videoId': None}

    if not ids:
        return [], 0, None

    try:
        video_response = youtube.videos().list(
            id=','.join(ids.keys()),
            part='statistics',
        ).execute()
    except HttpError:
        if retry:
            sleep(5)
            return get_videos(query, playlist, False, **params)
        raise
    for video_result in video_response.get('items', []):
        ids[video_result['id']] = video_result

    results = []
    for search_result in search_response.get('items', []):
        item = ids.get(search_result['id']['videoId'])
        if not item:
            continue
        search_result['snippet']['statistic'] = item['statistics']
        search_result['snippet']['id'] = search_result['id']['videoId']
        results.append(search_result['snippet'])
    return results, search_response['pageInfo']['totalResults'], search_response.get('nextPageToken')


def check_image(url, retry=True):
    try:
        return requests.head(url).status_code == 200
    except ConnectionError:
        if retry:
            sleep(5)
            return check_image(url, False)
        return False


def get_defaults(video, instance=None):
    if not instance:
        sd = video['thumbnails']['high'].copy()
        sd_url = sd['url'].replace('hqdefault.jpg', 'sddefault.jpg')
        if settings.ENVIRONMENT in ('PRODUCTION', 'STAGE') and check_image(sd_url):
            sd['url'] = sd_url
            sd['width'] = 640
            sd['height'] = 480
        video['thumbnails']['sddefault'] = sd
        m = video['thumbnails']['high'].copy()
        m_url = m['url'].replace('hqdefault.jpg', 'maxresdefault.jpg')
        if settings.ENVIRONMENT in ('PRODUCTION', 'STAGE') and check_image(m_url):
            m['url'] = m_url
            del m['width']
            del m['height']
        video['thumbnails']['maxresdefault'] = m
    else:
        try:
            video['thumbnails']['sddefault'] = instance.thumbnails['sddefault']
            video['thumbnails']['maxresdefault'] = instance.thumbnails['maxresdefault']
        except KeyError:
            return get_defaults(video)
    return {
        'channel_id': video['channelId'],
        'channel_title': video['channelTitle'][0:100],
        'name': video['title'][0:500],
        'description': video['description'],
        'created': video['publishedAt'],
        'view_count': video['statistic'].get('viewCount') or 0,
        'comments_count': video['statistic'].get('commentCount') or 0,
        'like_count': video['statistic'].get('likeCount') or 0,
        'dislike_count': video['statistic'].get('dislikeCount') or 0,
        'favorite_count': video['statistic'].get('favoriteCount') or 0,
        'thumbnails': video['thumbnails'],
    }
