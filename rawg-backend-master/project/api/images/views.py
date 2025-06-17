import os
import subprocess
from io import BytesIO
from pathlib import Path

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.http import HttpResponse, HttpResponseNotFound
from django.shortcuts import redirect
from django.template.loader import render_to_string
from django.utils import translation
from django.views import View
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from api.images import serializers
from apps.discussions.models import Discussion
from apps.games.models import Collection, Genre, Platform
from apps.images import models
from apps.reviews.models import Review
from apps.utils.backend_storages import ReplaceExistsMixin
from apps.utils.file_lock import FileLockSelfRelease
from apps.utils.images import crop_one, jpeg_optimize, resize_one

lock_folder = Path('/tmp', 'images')
lock_folder.mkdir(parents=True, exist_ok=True)
lock = '{}/api.image.views.'.format(lock_folder.resolve())
timeout = 10
delay = .5


class DisableCacheMixin:
    def disable_cache(self, request):
        return request.GET.get('cacheoff') and settings.ENVIRONMENT != 'PRODUCTION'


class ApiImageMixin(DisableCacheMixin):
    def process_template(self, pk, model, context):
        tmp_name = 'api_images_{}_{}_{}.{{}}'.format(pk, model, context['language'])
        file_name = os.path.join('/tmp', tmp_name.format('jpg'))

        template = Path('/tmp', tmp_name.format('html'))
        template.write_text(render_to_string('{}/share.html'.format(model), context))

        js = Path('/tmp', tmp_name.format('js'))
        js.write_text(render_to_string('share/js.html', {
            'template': template.resolve(),
            'output': file_name
        }))

        new_env = os.environ.copy()
        new_env['OPENSSL_CONF'] = '/etc/ssl/'
        subprocess.check_call(['phantomjs', str(js.resolve())], stdout=subprocess.DEVNULL, env=new_env)
        jpeg_optimize(file_name)
        with open(file_name, 'rb') as f:
            default_storage.save(self.file_name, f)

        template.unlink()
        js.unlink()
        os.unlink(file_name)

    def run(self, request, disable_cache):
        if disable_cache or not default_storage.exists_with_cache(self.file_name, disable_cache):
            with FileLockSelfRelease(self.lock_name, timeout=timeout, delay=delay):
                self.process()
        if settings.AWS_ACCESS_KEY_ID:
            self.file = requests.get('{}{}'.format(settings.MEDIA_URL, self.file_name)).content
        else:
            self.file = default_storage.open(self.file_name)

    def get(self, request, *args, **kwargs):
        try:
            self.run(request, self.disable_cache(request))
        except OSError:
            # cache was wrong, retry without it
            self.run(request, True)
        response = HttpResponse(self.file, content_type='image/jpeg')
        response['Cache-Control'] = 'max-age=604800'
        return response

    def dispatch(self, request, *args, **kwargs):
        self.language_suffix = (kwargs.get('language_suffix') or '').lower()
        self.language = self.language_suffix.strip('_')
        if self.language:
            request.LANGUAGE_CODE = self.language
            request.LANGUAGE_CODE_ISO3 = settings.LANGUAGES_2_TO_3[self.language]
        with translation.override(self.language or settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
            return super().dispatch(request, *args, **kwargs)


class DiscussionsView(ApiImageMixin, View):
    def process(self):
        self.process_template(self.discussion.id, 'discussions', {
            'image': self.discussion.game.background_image_full,
            'title': self.discussion.title,
            'language': self.language,
        })

    def get(self, request, *args, **kwargs):
        try:
            self.discussion = Discussion.objects.get(id=kwargs.get('pk'))
        except Discussion.DoesNotExist:
            return HttpResponseNotFound()

        if kwargs.get('folder') != self.discussion.share_folder or kwargs.get('hash') != self.discussion.share_name:
            return redirect(
                'api_image:discussion',
                language_suffix=self.language_suffix,
                folder=self.discussion.share_folder, hash=self.discussion.share_name, pk=self.discussion.id
            )

        self.file_name = os.path.join(
            'api', 'images', f'discussions{self.language_suffix}', self.discussion.share_folder,
            '{}_{}.jpg'.format(self.discussion.share_name, self.discussion.id)
        )
        self.lock_name = '{}DiscussionView.{}{}'.format(lock, self.discussion.id, self.language_suffix)

        return super().get(request, *args, **kwargs)


class ReviewView(ApiImageMixin, View):
    def process(self):
        self.process_template(self.review.id, 'reviews', {
            'image': self.review.game.background_image_full,
            'rating': self.review.rating,
            'platforms': [platform.name for platform in self.review.game.platforms.all()],
            'name': self.review.game.name,
            'language': self.language,
        })

    def get(self, request, *args, **kwargs):
        try:
            self.review = Review.objects.get(id=kwargs.get('pk'))
        except Review.DoesNotExist:
            return HttpResponseNotFound()

        if kwargs.get('folder') != self.review.share_folder or kwargs.get('hash') != self.review.share_name:
            return redirect(
                'api_image:review',
                language_suffix=self.language_suffix,
                folder=self.review.share_folder, hash=self.review.share_name, pk=self.review.id
            )

        self.file_name = os.path.join(
            'api', 'images', f'reviews{self.language_suffix}', self.review.share_folder,
            '{}_{}.jpg'.format(self.review.share_name, self.review.id)
        )
        self.lock_name = '{}ReviewView.{}{}'.format(lock, self.review.id, self.language_suffix)

        return super().get(request, *args, **kwargs)


class CollectionView(ApiImageMixin, View):
    def process(self):
        self.process_template(self.collection.id, 'collections', {
            'images': [bg['url'] for bg in self.collection.get_backgrounds(4)],
            'count': self.collection.get_games_count(),
            'name': self.collection.name,
            'language': self.language,
        })

    def get(self, request, *args, **kwargs):
        try:
            self.collection = Collection.objects.get(id=kwargs.get('pk'))
        except Collection.DoesNotExist:
            return HttpResponseNotFound()

        if kwargs.get('folder') != self.collection.share_folder or kwargs.get('hash') != self.collection.share_name:
            return redirect(
                'api_image:collection',
                language_suffix=self.language_suffix,
                folder=self.collection.share_folder, hash=self.collection.share_name, pk=self.collection.id
            )

        self.file_name = os.path.join(
            'api', 'images', f'collections{self.language_suffix}', self.collection.share_folder,
            '{}_{}.jpg'.format(self.collection.share_name, self.collection.id)
        )
        self.lock_name = '{}CollectionView.{}{}'.format(lock, self.collection.id, self.language_suffix)

        return super().get(request, *args, **kwargs)


class UserView(ApiImageMixin, View):
    def process(self):
        image = self.user.game_background.background_image_full if self.user.game_background else None
        avatar = self.user.avatar

        genres = ((self.user.statistics or {}).get('games_genres') or [])[0:5]
        genre_objects = Genre.objects.in_bulk([r['genre'] for r in genres])
        for genre in genres:
            genre['name'] = genre_objects[genre['genre']].name

        platforms = (self.user.statistics or {}).get('games_platforms') or []
        platform_parents = {}
        platform_objects = Platform.objects.prefetch_related('parent').in_bulk([p['platform'] for p in platforms])
        total = 0
        for platform in platforms:
            parent = platform_objects[platform['platform']].parent
            if not parent:
                continue
            default = {'count': 0, 'percent': 0, 'platform': parent.name, 'slug': parent.slug}
            platform_parents.setdefault(parent.id, default)['count'] += platform['count']
            total += platform['count']
        one_percent = total / 100
        total_percents = 0
        count = len(platform_parents)
        for i, (_, platform) in enumerate(platform_parents.items()):
            platform['percent'] = round(platform['count'] / one_percent, 2) if one_percent else 0
            total_percents += platform['percent']
            if i + 1 == count:
                if total_percents > 100:
                    platform['percent'] -= total_percents - 100
        platform_parents = sorted(platform_parents.values(), key=lambda x: x['count'], reverse=True)

        self.process_template(self.user.id, 'users', {
            'image': image,
            'avatar': avatar,
            'name': self.user.full_name or self.user.username,
            'games_count': self.user.games_count,
            'genres': genres,
            'platforms': platform_parents,
            'img_path': Path(settings.BASE_DIR, 'project', 'templates', 'share', 'platforms').resolve(),
            'language': self.language,
        })

    def get(self, request, *args, **kwargs):
        try:
            self.user = get_user_model().objects.get(id=kwargs.get('pk'))
        except get_user_model().DoesNotExist:
            return HttpResponseNotFound()

        if kwargs.get('folder') != self.user.share_folder or kwargs.get('hash') != self.user.share_name:
            return redirect(
                'api_image:user',
                language_suffix=self.language_suffix,
                folder=self.user.share_folder, hash=self.user.share_name, pk=self.user.id
            )

        self.file_name = os.path.join(
            'api', 'images', f'users{self.language_suffix}', self.user.share_folder,
            '{}_{}.jpg'.format(self.user.share_name, self.user.id)
        )
        self.lock_name = '{}UserView.{}{}'.format(lock, self.user.id, self.language_suffix)

        return super().get(request, *args, **kwargs)


class ResizeView(DisableCacheMixin, View):
    def process(self, disable_cache=False):
        if disable_cache or not default_storage.exists_with_cache(self.resize_path, disable_cache):
            if not default_storage.exists_with_cache(self.original_path, disable_cache, False) or \
                    default_storage.is_dir(self.original_path):
                # if settings.SHOW_IMAGES_FROM_PRODUCTION:
                #     url = f'https://{settings.ALLOWED_HOSTS[0]}{settings.MEDIA_URL_FOLDER}' \
                #         f'{self.op}/{self.width}/{self.height}/{self.original_path}'
                #     self.file = requests.get(url).content
                #     return
                # else:
                #     return HttpResponseNotFound()

                cdn_url = f'https://cdn.ag.ru{settings.MEDIA_URL_FOLDER}{self.original_path}'
                response = requests.get(cdn_url)
                if response.status_code != 200:
                    return HttpResponseNotFound()
                original = BytesIO(response.content)

            else:
                original = default_storage.open(self.original_path)
            if self.op == 'resize':
                self.resize_path = resize_one(original, int(self.width), self.resize_path, self.is_png)
            if self.op == 'crop':
                self.resize_path = crop_one(original, int(self.width), int(self.height), self.resize_path, self.is_png)
        # if settings.AWS_ACCESS_KEY_ID:
        #     self.file = requests.get('{}{}'.format(settings.MEDIA_URL, self.resize_path)).content
        # else:
        self.file = default_storage.open(self.resize_path)

    def get(self, request, *args, **kwargs):
        try:
            self.op, self.width, self.height, original_path = \
                request.GET.get('path').strip('/').replace('media/', '', 1).split('/', 3)
            self.original_path = os.path.normpath(original_path).lstrip('/')
            if ReplaceExistsMixin().replace(self.original_path):
                raise ValueError
        except (ValueError, AttributeError):
            return HttpResponseNotFound()

        if self.op not in ('resize', 'crop'):
            return HttpResponseNotFound()
        if settings.ENVIRONMENT in ('PRODUCTION', 'TESTS'):
            try:
                break_resize = False
                if self.op == 'resize':
                    break_resize = int(self.width) not in settings.RESIZE_SIZES or self.height != '-'
                break_crop = False
                if self.op == 'crop':
                    break_crop = (int(self.width), int(self.height)) not in settings.CROP_SIZES
                if break_resize or break_crop:
                    raise ValueError
            except ValueError:
                return HttpResponseNotFound()
        else:
            not_width = not self.width.isdigit() and self.width != '-'
            not_height = not self.height.isdigit() and self.height != '-'
            if not_width or not_height:
                return HttpResponseNotFound()

        folder = ''
        file_name = original_path
        if '/' in original_path:
            folders = original_path.split('/')
            file_name = folders.pop()
            folder = '/'.join(folders)

        self.resize_path = os.path.join(self.op, self.width, self.height, folder, file_name)
        self.is_png = file_name[-4:] == '.png'

        try:
            response = self.process(self.disable_cache(request))
        except OSError:
            # cache was wrong, retry without it
            response = self.process(True)

        if response:
            return response
        response = HttpResponse(self.file, content_type='image/png' if self.is_png else 'image/jpeg')
        response['Cache-Control'] = 'max-age=604800'
        return response


class UserImageViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = (IsAuthenticatedOrReadOnly,)
    serializer_class = serializers.UserImageSerializer
    queryset = models.UserImage.objects.all()
