import re
import secrets
from datetime import date, timedelta
from functools import reduce
from hashlib import md5, sha1
from operator import or_
from typing import Optional

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField, CICharField, JSONField
from django.contrib.postgres.indexes import BrinIndex
from django.core.cache import cache as django_cache
from django.core.files.storage import get_storage_class
from django.core.validators import MinLengthValidator, MinValueValidator, RegexValidator
from django.db import models, transaction
from django.db.models import Case, Count, F, Index, IntegerField, Prefetch, Sum, When, Window
from django.db.models.functions import ExtractMonth, ExtractYear, Rank
from django.utils import translation
from django.utils.functional import cached_property
from django.utils.timezone import now
from modeltranslation.utils import get_language
from ordered_model.models import OrderedModel

from apps.common.utils import get_share_image_url
from apps.games import cache
from apps.utils.dates import monday
from apps.utils.db import copy_from_conflict
from apps.utils.dicts import find
from apps.utils.fields.autoslug import CIAutoSlugField
from apps.utils.images import crop, field_to_jpg, get_image_url, resize
from apps.utils.lang import get_languages_condition, get_site_by_current_language
from apps.utils.models import (
    HiddenManager, HiddenModel, InitialValueMixin, LanguageModel, MergeModel, OrderedHiddenModel, ProjectModel,
    SynonymModel,
)
from apps.utils.strings import add_img_attribute, bare_text, code, normalize_apostrophes, safe_text
from apps.utils.upload import upload_to


def generate_secret_key():
    return secrets.token_urlsafe(32)


class SetStatisticMixin:
    def get_statistic_queryset(self):
        return None

    def set_statistics(self):
        qs = self.get_statistic_queryset()
        games_count = qs.count()
        games_added = qs.aggregate(Sum('added'))['added__sum'] or 0
        top_games = list(qs.order_by('-added').values_list('id', flat=True)[0:30])
        image_background = ''
        if games_count:
            top_games_screens = list(
                qs.filter(screenshots_count__gt=0).order_by('-added').values_list('id', flat=True)[0:30]
            )
            if top_games_screens:
                pk = top_games_screens[secrets.randbelow(len(top_games_screens))]
                image_background = Game.objects.only('image_background', 'image').get(id=pk).background_image_full
        type(self).objects.filter(id=self.id).update(
            games_count=games_count,
            games_added=games_added,
            top_games=top_games,
            image_background=image_background,
        )

    def get_context(self, request):
        return self.get_many_context([self], request)

    @classmethod
    def get_many_context(cls, items, request):
        items_games = {}
        ids = []
        for item in items:
            if not item.top_games:
                continue
            games = item.top_games[0:6]
            ids += games
            items_games[item.id] = games
        games = Game.objects.only_short().in_bulk(ids)
        result = {}
        for item_id, games_ids in items_games.items():
            result[item_id] = [games[pk] for pk in games_ids if games.get(pk)]
        return {
            'items_games': result,
        }


class GameItemBaseMixin(SetStatisticMixin, ProjectModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = CICharField(max_length=100, unique=True)
    added = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, default='')
    image_background = models.URLField(max_length=500, null=True, blank=True, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    games_added = models.PositiveIntegerField(default=0, editable=False)
    top_games = ArrayField(models.PositiveIntegerField(), default=list, editable=False)

    set_name = 'game_set'
    related_name = ''
    related_field = ''

    class Meta:
        abstract = True

    def get_statistic_queryset(self):
        return Game.objects.filter(**{self.related_name: self.id})

    def copy_in_parent(self, parent):
        records = []
        for game_id in getattr(self, self.set_name).values_list('id', flat=True):
            records.append((game_id, parent.id))
        copy_from_conflict(
            None, ['game_id', self.related_field], records,
            f'(game_id, {self.related_field}) DO NOTHING',
            'temp_utils_copy_in_parent_{}_{}'.format(parent.id, code()),
            table_name=f'games_game_{self.related_name}'
        )


class GameItemBase(GameItemBaseMixin, MergeModel, HiddenModel):
    class Meta(MergeModel.Meta):
        abstract = True


class GameItemBaseOrdered(GameItemBaseMixin, MergeModel, OrderedHiddenModel):
    class Meta(MergeModel.Meta):
        abstract = True


class Developer(GameItemBase):
    related_name = 'developers'
    related_field = 'developer_id'

    class Meta(GameItemBase.Meta):
        abstract = False
        verbose_name = 'Developer'
        verbose_name_plural = 'Developers'
        ordering = ('-games_added',)
        indexes = GameItemBase.Meta.indexes + [
            Index(fields=['-games_added', '-id']),
        ]

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/developers/{self.slug}'


class Publisher(GameItemBase):
    related_name = 'publishers'
    related_field = 'publisher_id'

    class Meta(GameItemBase.Meta):
        abstract = False
        verbose_name = 'Publisher'
        verbose_name_plural = 'Publishers'
        ordering = ('-games_added',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/publishers/{self.slug}'


class Genre(GameItemBaseOrdered):
    hidden = models.BooleanField(default=True, db_index=True)
    related_name = 'genres'
    related_field = 'genre_id'

    class Meta(GameItemBaseOrdered.Meta):
        abstract = False
        verbose_name = 'Genre'
        verbose_name_plural = 'Genres'
        ordering = ('order',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/{self.slug}'


class Tag(LanguageModel, GameItemBase):
    white = models.BooleanField(default=False, db_index=True)
    related_name = 'tags'
    related_field = 'tag_id'
    language_fields = ('name',)

    class Meta(GameItemBase.Meta):
        abstract = False
        verbose_name = 'Tag'
        verbose_name_plural = 'Tags'
        ordering = ('-games_added',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/tags/{self.slug}'


class Store(SetStatisticMixin, OrderedModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    platforms = models.ManyToManyField('Platform')
    domain = models.CharField(max_length=255, blank=True, null=True)
    use_in_sync = models.BooleanField(default=True)
    image_background = models.URLField(max_length=500, null=True, blank=True, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    games_added = models.PositiveIntegerField(default=0, editable=False)
    top_games = ArrayField(models.PositiveIntegerField(), default=list, editable=False)

    class Meta:
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'
        ordering = ('order',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/{self.slug}'

    def get_statistic_queryset(self):
        return Game.objects.filter(gamestore__store_id__in=[self.id])

    @classmethod
    def update_link(cls, url: str, store_slug: str, language: str) -> str:
        last_part = url.split('/').pop()
        url = url.lower()
        if store_slug == 'playstation-store':
            # fix case of id
            parts = url.split('/')
            parts.pop()
            url = '/'.join(parts) + f'/{last_part}'
            if settings.LANGUAGE_RU == language:
                new_url = cls.check_url(url.replace('en-us', 'ru-ru'))
                if new_url:
                    url = new_url
        if store_slug == 'apple-appstore':
            if '/geo.itunes.apple.com/' in url:
                url = url.replace('/geo.itunes.apple.com/', '/apps.apple.com/')
            if '/itunes.apple.com/' in url:
                url = url.replace('/itunes.apple.com/', '/apps.apple.com/')
            parts = url.split('/')
            if parts[3] == 'app':
                if settings.LANGUAGE_RU == language:
                    url = '/'.join(parts[:3] + [settings.LANGUAGE_RU] + parts[3:])
            else:
                if settings.LANGUAGE_RU == language:
                    url = '/'.join(parts[:3] + [settings.LANGUAGE_RU] + parts[4:])
                else:
                    url = '/'.join(parts[:3] + parts[4:])
        if settings.LANGUAGE_RU == language:
            if store_slug == 'google-play':
                url = url.replace('hl=en', 'hl=ru').replace('gl=us', 'gl=ru')
            if store_slug in ('xbox360', 'xbox-store'):
                new_url = url.replace('en-us', 'ru-ru')
                if cls.check_url(new_url):
                    url = new_url
        return url

    @classmethod
    def check_url(cls, url: str) -> Optional[str]:
        cache_key = sha1(f'1.apps.games.models.Store.check_url.{url}'.encode('utf-8')).hexdigest()
        result = django_cache.get(cache_key)
        if not result:
            try:
                response = requests.head(url, allow_redirects=True, timeout=5)
            except Exception:
                return None
            result = response.url if response.status_code in (200, 301, 302) else '-'
            django_cache.set(cache_key, result, 60 * 60 * 48)
        return result if result != '-' else None


class PlatformParent(OrderedModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = 'Parent platform'
        verbose_name_plural = 'Parent platforms'
        ordering = ('order',)

    def __str__(self):
        return self.name

    def games_and_users_top(self, start, end, count=5):
        from apps.users.models import UserGame

        base_qs = UserGame.objects.visible().filter(
            platforms__parent__in=[self],
            created__gte=start,
            created__lt=end,
        )
        games = base_qs.values('game').annotate(count=Count('id')).order_by('-count', '-game_id')
        users_count = base_qs.values('user').annotate(count=Count('id')).order_by('-count').count()
        users = UserGame.objects.visible() \
            .filter(game__platforms__parent__in=[self]) \
            .values('user').annotate(count=Count('id')).order_by('-count') \
            .values_list('user_id', flat=True)

        return (
            list(games.values_list('game_id', flat=True)[0:count]),
            users,
            games.count(),
            users_count,
        )


def platform_image(instance, filename):
    return upload_to('platforms', instance, filename, False, False)


def platform_image_background(instance, filename):
    return upload_to('platforms-backgrounds', instance, filename, False, False)


class Platform(SetStatisticMixin, OrderedModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(PlatformParent, models.SET_NULL, null=True, blank=True, default=None)
    description = models.TextField(blank=True, default='')
    image = models.FileField(upload_to=platform_image, null=True, blank=True)
    image_background = models.URLField(max_length=500, null=True, blank=True, editable=False)
    image_background_custom = models.FileField(upload_to=platform_image_background, null=True, blank=True)
    year_start = models.PositiveSmallIntegerField(default=None, blank=True, null=True)
    year_end = models.PositiveSmallIntegerField(default=None, blank=True, null=True)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    games_added = models.PositiveIntegerField(default=0, editable=False)
    top_games = ArrayField(models.PositiveIntegerField(), default=list, editable=False)

    class Meta:
        verbose_name = 'Platform'
        verbose_name_plural = 'Platforms'
        ordering = ('order',)

    def __str__(self):
        return self.name

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/{self.slug}'

    def get_statistic_queryset(self):
        return Game.objects.filter(gameplatform__platform_id__in=[self.id])


class GamePlatform(InitialValueMixin, models.Model):
    game = models.ForeignKey('Game', models.CASCADE)
    platform = models.ForeignKey(Platform, models.CASCADE)
    released_at = models.DateField(null=True, blank=True)
    requirements = JSONField(null=True, blank=True)
    tba = models.BooleanField(default=False, verbose_name='TBA')

    init_fields = ('platform_id',)

    class Meta:
        verbose_name = 'Game Platform'
        verbose_name_plural = 'Game Platforms'
        unique_together = ('game', 'platform')

    def __str__(self):
        return f'{self.game_id} - {self.platform_id}'


class GamePlatformMetacritic(models.Model):
    game = models.ForeignKey('Game', models.CASCADE)
    platform = models.ForeignKey(Platform, models.CASCADE)
    metascore = models.IntegerField(default=0, db_index=True, editable=False)
    url = models.CharField(blank=True, max_length=200, null=True)  # todo remove null

    class Meta:
        verbose_name = 'Game Platform Metacritic'
        verbose_name_plural = 'Game Platforms Metacritic'
        unique_together = ('game', 'platform')

    def __str__(self):
        return f'{self.game_id} - {self.platform_id} - {self.metascore}'


class GameStore(models.Model):
    game = models.ForeignKey('Game', models.CASCADE)
    store = models.ForeignKey(Store, models.CASCADE)
    url = models.URLField(max_length=500)
    store_internal_id = models.CharField(max_length=150, db_index=True, blank=True)

    class Meta:
        verbose_name = 'Game Store'
        verbose_name_plural = 'Game Stores'
        unique_together = ('game', 'store')

    def __str__(self):
        return f'{self.game_id} - {self.store_id}'


def screenshot_image(instance, filename):
    return upload_to('screenshots', instance, filename, False)


class ScreenShot(HiddenModel, InitialValueMixin, models.Model):
    game = models.ForeignKey('Game', models.CASCADE, related_name='screenshots')
    source = models.URLField(max_length=500, blank=True)
    image = models.FileField(upload_to=screenshot_image, null=True, blank=True)
    image_alternate = models.FileField(upload_to=screenshot_image, null=True, blank=True)
    is_external = models.BooleanField(default=False)
    is_small = models.BooleanField(default=False)
    order = models.IntegerField(null=True, blank=True)
    created = models.DateTimeField(null=True, blank=True)
    width = models.PositiveIntegerField(blank=True, null=True)
    height = models.PositiveIntegerField(blank=True, null=True)

    init_fields = ('image', 'hidden')

    class Meta:
        verbose_name = 'Screenshot'
        verbose_name_plural = 'Screenshots'
        ordering = ('order', 'is_small', '-is_external', 'id')

    def __str__(self):
        return f'{self.game_id} - {self.id}'

    def save(self, *args, **kwargs):
        if self.image and self.is_init_change('image', kwargs):
            self.image, self.width, self.height = field_to_jpg(self.image)
        if not self.created:
            self.created = now()
        super().save(*args, **kwargs)

    @property
    def visible_image(self):
        if self.image:
            return self.image
        return self.source

    def image_background(self):
        if (settings.CRAWLING_SAVE_IMAGES or not self.source) and self.image:
            return self.image.url
        else:
            return self.source


def movie_image(instance, filename):
    return upload_to('movies', instance, filename, False)


class ScreenShotCount(models.Model):
    game = models.OneToOneField('Game', models.CASCADE)
    queued = models.DateTimeField(null=True)

    class Meta:
        verbose_name = 'Screenshot score'
        verbose_name_plural = 'Screenshots score'
        ordering = ('-id',)

    def __str__(self):
        return f'{self.game_id} - {self.queued}'


class Movie(models.Model):
    internal_id = models.CharField(max_length=50, db_index=True, blank=True)
    game = models.ForeignKey('Game', models.CASCADE, related_name='movies')
    store = models.ForeignKey(Store, models.CASCADE)
    name = models.CharField(max_length=200)
    preview = models.FileField(upload_to=movie_image, null=True, blank=True)
    data = JSONField(null=True, blank=True, editable=False)

    class Meta:
        verbose_name = 'Movie'
        verbose_name_plural = 'Movies'
        ordering = ('-id',)

    def __str__(self):
        return f'{self.game_id} - {self.id}'


class Addition(models.Model):
    LINK_TYPE_DLC = 'dlc'
    LINK_TYPE_EDITION = 'edition'
    LINK_TYPES = (
        (LINK_TYPE_DLC, 'DLC'),
        (LINK_TYPE_EDITION, 'Edition'),
    )

    parent_game = models.ForeignKey('Game', models.CASCADE, related_name='additions')
    game = models.ForeignKey('Game', models.CASCADE, related_name='parent_games')
    link_type = models.CharField(blank=True, choices=LINK_TYPES, default=None, max_length=7, null=True)

    class Meta:
        verbose_name = 'Linked Game'
        verbose_name_plural = 'Linked Games'
        unique_together = ('game', 'parent_game')
        ordering = ('-id',)

    def __str__(self):
        return f'{self.game_id} - {self.get_link_type_display()}'


def generate_game_sid() -> str:
    return secrets.token_urlsafe(32)


class PlayerGameSession(models.Model):
    game = models.ForeignKey('games.Game', on_delete=models.CASCADE, related_name='playergamesession_through')
    player = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='playergamesession_through', to_field='player_id'
    )
    game_sid = models.CharField(
        'id сессии',
        default=generate_game_sid,
        unique=True,
        max_length=50,
        editable=False,
        validators=[MinLengthValidator(40)]
    )
    created = models.DateTimeField('время создания', default=now, editable=False)

    class Meta:
        verbose_name = 'сессия игрока в игре'
        verbose_name_plural = 'сессии игроков в играх'
        constraints = [
            models.UniqueConstraint(fields=['game', 'player'], name='playergamesession_unique_relation'),
        ]


def game_session_data_path(instance, filename):
    return f'playergamesessiondata/{instance.session_id}.bin'


games_file_storage = get_storage_class(settings.GAMES_FILES_STORAGE)()


class PlayerGameSessionData(models.Model):
    session = models.OneToOneField(
        PlayerGameSession,
        on_delete=models.CASCADE,
        related_name='data',
        to_field='game_sid',
        db_column='session_id',
        verbose_name='игровая сессия'
    )
    data = models.FileField(
        verbose_name='файл данных сессии', upload_to=game_session_data_path, storage=games_file_storage
    )
    created = models.DateTimeField('время создания', auto_now=True)

    class Meta:
        verbose_name = 'данные игровой сессии'
        verbose_name_plural = 'данные игровых сессий'


class GameManager(models.Manager):
    prefetch_always_fields = {
        'platforms',
        'platforms__parent',
        'gameplatform_set__platform',
    }
    prefetch_list_fields = {
        'gamestore_set__store',
        Prefetch('genres', queryset=Genre.objects.visible()),
    }
    defer_always_fields = {
        'synonyms',
        'is_complicated_name',
        'is_free',
        'import_collection',
        'twitch_id',
        'twitch_not_found',
        'twitch_name',
        'youtube_name',
        'imgur_name',
        'wikibase_id',
        'wikipedia_name',
        'wikipedia_not_found',
        'weighted_rating',
    }
    defer_list_fields = {
        'alternative_names',
        'description',
        'description_en_is_plain_text',
        'description_ru_is_plain_text',
        'description_is_protected',
        'metacritic_url',
        'website',
        'rating_avg',
        'reactions',
        'suggestions',
        'screenshots_count',
        'movies_count',
        'collections_count_all',
        'collections_counts',
        'achievements_count',
        'parent_achievements_count_all',
        'parent_achievements_counts',
        'discussions_count_all',
        'discussions_counts',
        'persons_count',
        'files_count',
        'parents_count',
        'additions_count',
        'game_series_count',
        'reddit_name',
        'reddit_logo',
        'reddit_url',
        'reddit_description',
        'reddit_count',
        'twitch_counts',
        'youtube_counts',
        'imgur_count',
        'display_external',
        'developers_json',
        'publishers_json',
        'game_seo_fields_json',
        'last_modified_json'
    }
    raw_list_fields = {
        'id',
        'slug',
        'name',
        'name_en',
        'name_ru',
        'promo',
        'released',
        'created',
        'updated',
        'tba',
        'image_background',
        'image',
        'rating',
        'rating_top',
        'ratings',
        'ratings_count',
        'reviews_text_counts',
        'added',
        'added_by_status',
        'metacritic',
        'charts',
        'playtime',
        'suggestions_count',
        'platforms_json',
        'parent_platforms_json',
        'genres_json',
        'stores_json',
        'tags_json',
        'screenshots_json',
        'clip_json',
        'esrb_rating_json',
        'can_play',
        'plays',
        'iframe',
        'description_short',
        'description_short_en',
        'description_short_ru',
    }

    @cached_property
    def prefetch_all_fields(self):
        return self.prefetch_always_fields | self.prefetch_list_fields

    @cached_property
    def defer_all_fields(self):
        return self.defer_always_fields | self.defer_list_fields

    def defer_all(self, exclude_fields=None):
        defer_list = self.defer_all_fields
        if exclude_fields:
            defer_list = defer_list.difference(exclude_fields)
        return self.get_queryset().defer(*defer_list)

    def defer_always(self):
        return self.get_queryset().defer(*self.defer_always_fields)

    def only_short(self, *args):
        return self.get_queryset().only('id', 'added', 'slug', 'name', *args)

    def greatest(
        self, year=None, limit=21, dates=None, added_gte=None, orderings=('-added', '-rating', '-released'),
        platforms=None, parent_platforms=None
    ):
        kwargs = {}
        if dates:
            kwargs['released__range'] = dates
        if year:
            kwargs['released__year'] = year
        if added_gte:
            kwargs['added__gte'] = added_gte
        qs = self.defer_all().order_by(*orderings)
        return self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)[0:limit]

    def weighted_greatest(
        self, year=None, limit=21, dates=None, orderings=('-weighted_rating',), platforms=None, parent_platforms=None
    ):
        kwargs = {}
        if dates:
            kwargs['released__range'] = dates
        if year:
            kwargs['released__year'] = year
        else:
            kwargs['released__isnull'] = False
            kwargs['tba'] = False
        qs = self.defer_all().exclude(parents_count__gt=0).order_by(*orderings)
        return self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)[0:limit]

    def recent_games(self, orderings=('-added', '-id'), platforms=None, parent_platforms=None):
        kwargs = {
            'released__range': (monday(now()), monday(now() + timedelta(days=7))),
            'tba': False,
        }
        qs = self.defer_all().order_by(*orderings)
        return self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)

    def recent_games_past(self, orderings=('-added', '-id'), platforms=None, parent_platforms=None):
        kwargs = {
            'released__range': (now() - timedelta(days=30), now()),
            'tba': False
        }
        qs = self.defer_all().order_by(*orderings)
        return self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)

    def recent_games_future(self, orderings=('-added', '-id'), platforms=None, parent_platforms=None):
        kwargs = {
            'released__range': (monday(now() + timedelta(days=7)), monday(now() + timedelta(days=14))),
            'tba': False
        }
        qs = self.defer_all().order_by(*orderings)
        return self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)

    def recent_games_main(
        self, orderings=('-added', '-id'), ids=None, games_ids=None, platforms=None, parent_platforms=None,
        promo_ids=None, promo_filters=None
    ):
        relevance = False
        if orderings and orderings[0] in ('relevance', '-relevance'):
            relevance = True
            orderings = ('-added', '-id')

        add_fields = ['created']
        kwargs = {
            'released__range': (now() - timedelta(days=90), now()),
            'tba': False,
            'added__gt': 0
        }
        qs = self.defer_all(add_fields)
        if orderings:
            qs = qs.order_by(*orderings)
        qs = self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)

        promo_ids, games_ids = promo_ids or [], games_ids or []
        if promo_ids or games_ids:
            pinned_ids = promo_ids + games_ids
            cases = [When(id=pk, then=-len(pinned_ids) + i) for i, pk in enumerate(pinned_ids)]
            position = Case(*cases, default=0, output_field=IntegerField())

            kwargs = {}
            if platforms:
                kwargs['platforms__in'] = platforms
            if parent_platforms:
                kwargs['platforms__parent__in'] = parent_platforms

            pinned_filters = models.Q(id__in=promo_ids)
            if promo_filters:
                pinned_filters &= reduce(or_, [models.Q(**{key: value}) for key, value in promo_filters.items()])
            pinned_filters |= models.Q(id__in=games_ids)

            games = self.defer_all(add_fields).filter(pinned_filters, **kwargs).annotate(rank=position)

            if orderings:
                games = games.order_by('rank')
            if relevance:
                qs = games.union(
                    qs.exclude(id__in=pinned_ids)
                    .annotate(rank=Window(Rank(), order_by=F('added').desc())).order_by('rank')
                ).order_by('rank')
            else:
                qs = qs.annotate(rank=F('id')).union(games)
                if orderings:
                    qs = qs.order_by(*orderings)

        return qs

    def recent_games_main_auth(
        self, games_ids, orderings=('-added', '-id'), platforms=None, parent_platforms=None
    ):
        relevance = False
        if orderings and orderings[0] in ('relevance', '-relevance'):
            relevance = True

        kwargs = {'id__in': games_ids}
        qs = self.defer_all(['created'])
        qs = self.kwargs_platforms(qs, kwargs, platforms, parent_platforms)
        if relevance:
            cases = [When(id=pk, then=-len(games_ids) + i) for i, pk in enumerate(games_ids)]
            position = Case(*cases, default=0, output_field=IntegerField())
            qs = qs.annotate(rank=position).order_by('rank')
        elif orderings:
            qs = qs.order_by(*orderings)

        return qs

    def recent_games_main_base(self, kwargs, request):
        # kwargs['games_ids'] = cache.GameGetListTrending().get(language=request.LANGUAGE_CODE_ISO3)
        if settings.GAMES_PROMO:
            kwargs['promo_ids'] = cache.GameGetListPromo().get(language=request.LANGUAGE_CODE_ISO3)
        return self.recent_games_main(**kwargs)

    def kwargs_platforms(self, qs, kwargs, platforms, parent_platforms):
        if platforms:
            kwargs['platforms__in'] = platforms
        if parent_platforms:
            kwargs['platforms__parent__in'] = parent_platforms
        qs = qs.filter(**kwargs)
        if platforms or parent_platforms:
            qs = qs.distinct()
        return qs

    def playable(self):
        return self.get_queryset().filter(can_play=True, iframe__isnull=False).exclude(iframe='')

def game_image(instance, filename):
    return upload_to('games', instance, filename, False, True)


class Game(InitialValueMixin, SynonymModel):
    RATING_TRESHOLD = 5

    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = CICharField(max_length=200, unique=True)
    alternative_names = ArrayField(
        models.CharField(max_length=200), default=list, blank=True, verbose_name='Public alternative names'
    )
    is_complicated_name = models.BooleanField(default=False)
    import_collection = CICharField(max_length=20, blank=True, default='')
    promo = CICharField(max_length=20, blank=True, default='')
    description = models.TextField(blank=True)
    description_en_is_plain_text = models.BooleanField(default=False)
    description_ru_is_plain_text = models.BooleanField(default=False)
    description_is_protected = models.BooleanField(default=False)
    description_short = models.CharField(max_length=140, blank=True)
    metacritic = models.IntegerField(default=0, db_index=True, editable=False)
    platforms = models.ManyToManyField(Platform, through=GamePlatform, blank=True)
    stores = models.ManyToManyField(Store, through=GameStore, blank=True)
    developers = models.ManyToManyField(Developer, blank=True)
    publishers = models.ManyToManyField(Publisher, blank=True)
    genres = models.ManyToManyField(Genre)
    tags = models.ManyToManyField(Tag, blank=True)
    game_series = models.ManyToManyField('self', blank=True)
    image = models.FileField(upload_to=game_image, null=True, blank=True)
    image_background = models.URLField(max_length=500, null=True, blank=True)
    image_background_additional = models.URLField(max_length=500, null=True, blank=True)
    released = models.DateField(default=date(year=1900, month=1, day=1), db_index=True)
    tba = models.BooleanField(default=False, verbose_name='TBA', db_index=True)
    esrb_rating = models.ForeignKey('ESRBRating', on_delete=models.CASCADE, blank=True, default=None, null=True)
    website = models.URLField(max_length=500, blank=True, default='')
    is_free = models.BooleanField(default=False)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, editable=False, db_index=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0, editable=False)
    rating_top = models.PositiveIntegerField(default=0, editable=False)
    ratings = JSONField(null=True, blank=True, editable=False)
    weighted_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0, editable=False, db_index=True)
    reactions = JSONField(null=True, blank=True, editable=False)
    suggestions = JSONField(null=True, blank=True, editable=False)
    added = models.PositiveIntegerField(default=0, db_index=True, editable=False)
    added_by_status = JSONField(null=True, blank=True, editable=False)
    playtime = models.PositiveIntegerField(default=0, editable=False, help_text='in hours')
    charts = JSONField(null=True, blank=True, editable=False)
    users = JSONField(null=True, blank=True, editable=False)

    screenshots_count = models.PositiveIntegerField(default=0, editable=False)
    movies_count = models.PositiveIntegerField(default=0, editable=False)
    persons_count = models.PositiveIntegerField(default=0, editable=False)
    achievements_count = models.PositiveIntegerField(default=0, editable=False)
    parent_achievements_count_all = models.PositiveIntegerField(default=0, editable=False)
    parent_achievements_counts = JSONField(null=True, blank=True, editable=False)
    reviews_text_count_all = models.PositiveIntegerField(default=0, editable=False)
    reviews_text_counts = JSONField(null=True, blank=True, editable=False)
    collections_count_all = models.PositiveIntegerField(default=0, editable=False)
    collections_counts = JSONField(null=True, blank=True, editable=False)
    discussions_count_all = models.PositiveIntegerField(default=0, editable=False)
    discussions_counts = JSONField(null=True, blank=True, editable=False)
    ratings_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    suggestions_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    files_count = JSONField(null=True, blank=True, editable=False)
    additions_count = models.PositiveIntegerField(default=0, editable=False)
    parents_count = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    game_series_count = models.PositiveIntegerField(default=0, editable=False)

    can_play = models.BooleanField('можно играть', default=False)
    iframe = models.URLField('ссылка для запуска игры', blank=True)
    local_client = models.BooleanField('есть локальный клиент', null=True, default=None)
    secret_key = models.CharField(
        'секретный ключ',
        unique=True,
        editable=False,
        default=generate_secret_key,
        max_length=50,
        validators=[MinLengthValidator(40)]
    )
    webhook_url = models.URLField('вебхук игры', blank=True)
    play_on_desktop = models.BooleanField('can play on desktop version', null=True)
    play_on_mobile = models.BooleanField('can play on mobile verion', null=True)
    desktop_auth_delay = models.PositiveIntegerField('Время до открытия окна логина (desktop)', null=True, blank=True)
    mobile_auth_delay = models.PositiveIntegerField('Время до открытия окна логина (mobile)', null=True, blank=True)
    seamless_auth = models.BooleanField('бесшовная авторизация', null=True, blank=True)
    alternative_fullscreen = models.BooleanField('Альтернативная работа с Fullscreen', null=True, blank=True)
    exit_button_position = models.CharField(
        verbose_name='Положение кнопки выхода из игры',
        max_length=20,
        blank=True,
        validators=[RegexValidator('^([0-9]+(px|%)),([0-9]+(px|%))$', flags=re.A)],
        help_text='Два значения без пробелов и через запятую в пикселях и/или процентах,'
                  ' например: "1px,5%" - расстояние слева, расстояние от верха',
    )
    users_played = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='games_played', through=PlayerGameSession
    )
    plays = models.PositiveIntegerField('number of plays', default=0)

    metacritic_url = models.CharField(
        max_length=200, blank=True, default='',
        help_text='For example "http://www.metacritic.com/game/playstation-4/the-witcher-3-wild-hunt"',
    )
    reddit_url = models.CharField(
        max_length=200, blank=True, default='',
        help_text='For example "https://www.reddit.com/r/uncharted/" or "uncharted"',
    )
    reddit_name = models.CharField(max_length=200, default='', editable=False)
    reddit_description = models.TextField(default='', editable=False)
    reddit_logo = models.URLField(default='', editable=False)
    reddit_count = models.PositiveIntegerField(default=0, editable=False)
    twitch_id = models.PositiveIntegerField(blank=True, default=None, null=True, editable=False)
    twitch_not_found = models.BooleanField(default=False, editable=False)
    twitch_name = models.CharField(max_length=200, blank=True, default='')
    twitch_counts = JSONField(null=True, blank=True, editable=False)
    youtube_name = models.CharField(max_length=200, blank=True, default='')
    youtube_counts = JSONField(null=True, blank=True, editable=False)
    imgur_name = models.CharField(max_length=200, blank=True, default='')
    imgur_count = models.PositiveIntegerField(default=0, editable=False)
    wikibase_id = CICharField(max_length=50, blank=True, default=None, null=True, editable=False)
    wikipedia_name = CICharField(max_length=200, blank=True, default='')
    wikipedia_not_found = models.BooleanField(default=False, editable=False)
    display_external = models.BooleanField(default=False)
    parent_platforms_json = JSONField(null=True, blank=True, editable=False)
    platforms_json = JSONField(null=True, blank=True, editable=False)
    stores_json = JSONField(null=True, blank=True, editable=False)
    developers_json = JSONField(null=True, blank=True, editable=False)
    genres_json = JSONField(null=True, blank=True, editable=False)
    tags_json = JSONField(null=True, blank=True, editable=False)
    publishers_json = JSONField(null=True, blank=True, editable=False)
    screenshots_json = JSONField(null=True, blank=True, editable=False)
    esrb_rating_json = JSONField(null=True, blank=True, editable=False)
    clip_json = JSONField(null=True, blank=True, editable=False)

    game_seo_fields_json = JSONField(null=True, blank=True, editable=False)
    last_modified_json = JSONField(null=True, blank=True, editable=False)

    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(db_index=True)

    objects = GameManager()
    init_fields = (
        'name', 'synonyms', 'promo', 'image', 'image_background', 'reddit_url', 'twitch_name', 'youtube_name',
        'imgur_name', 'wikipedia_name', 'metacritic_url', 'description_en', 'description_ru', 'esrb_rating_id',
        'released', 'tba', 'website',
    )
    sitemap_paths = {
        'screenshots': ['screenshots_count', 'movies_count'],
        'suggestions': 'suggestions_count',
        'collections': 'collections_counts',
        'achievements': 'parent_achievements_counts',
        # 'reddit': 'reddit_count',
        # 'twitch': 'twitch_counts',
        'youtube': 'youtube_counts',
        # 'imgur': 'imgur_count',
        'team': 'persons_count',
        'reviews': 'reviews_text_counts',
        'posts': 'discussions_counts',
    }
    wikipedia_disable = False

    class Meta(SynonymModel.Meta):
        verbose_name = 'Game'
        verbose_name_plural = 'Games'
        ordering = ('-id',)
        permissions = (
            ('merge_games', 'Can merge games'),
        )
        indexes = SynonymModel.Meta.indexes + [
            BrinIndex(fields=['created']),
            Index(fields=['-added', '-id']),
            Index(fields=['-released', '-id']),
            Index(fields=['-rating', '-id']),
            Index(fields=['-weighted_rating', '-id']),
            Index(fields=['-metacritic', '-id']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        from apps.merger.merger import keep_tags

        if not self.id and not self.updated:
            self.updated = now()

        if self.is_init_change('description_en', kwargs) and not self.description_en_is_plain_text:
            self.description_en = keep_tags(self.description_en)
        if self.is_init_change('description_ru', kwargs) and not self.description_ru_is_plain_text:
            self.description_ru = keep_tags(self.description_ru)

        if self.is_init_change('image', kwargs) and self.image:
            self.image, _, _ = field_to_jpg(self.image)

        if (
            self.is_init_change('website', kwargs) and self.website
            and not (self.website.startswith('http://') or self.website.startswith('https://'))
        ):
            self.website = 'http://{}'.format(self.website)

        is_name = self.is_init_change('name', kwargs)
        if is_name or self.is_init_change('twitch_name', kwargs):
            self.twitch_not_found = False
            self.twitch_id = None
        if is_name or self.is_init_change('wikipedia_name', kwargs):
            self.wikipedia_not_found = False
            self.wikibase_id = None
        if self.is_init_change('synonyms', kwargs):
            self.synonyms = [normalize_apostrophes(synonym) for synonym in self.synonyms]

        is_promo = self.is_init_change('promo', kwargs)

        super().save(*args, **kwargs)

        if is_promo:
            for lang, _ in settings.LANGUAGES:
                with translation.override(lang):
                    language = settings.LANGUAGES_2_TO_3[lang]
                    transaction.on_commit(lambda: cache.GameGetListPromo().async_refresh(language=language))

    def get_exit_button_position(self):
        position = self.exit_button_position.split(',')
        return position if len(position) == 2 else None

    def get_iframe_display(self):
        if self.is_playable:
            return self.iframe

    @property
    def is_playable(self):
        return self.can_play and bool(self.iframe)

    def get_absolute_url(self):
        return '{}://{}/games/{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.slug)

    @property
    def admin_name(self):
        return '{} ({})'.format(self.name, ', '.join([s.name for s in self.stores.all()]))

    @property
    def background_image(self):
        if self.image:
            return self.image
        return self.image_background

    @property
    def background_image_additional(self):
        return self.image_background_additional

    @property
    def background_image_full(self):
        if self.image:
            return get_image_url(self.image)
        return self.background_image

    @property
    def is_indie(self):
        return self.import_collection == 'itch'

    @property
    def is_released(self):
        return str(self.released) != '1900-01-01'

    @property
    def is_display_external(self):
        return self.display_external or self.added >= settings.POPULAR_GAMES_MIN_ADDED

    @property
    def youtube_count(self):
        return find(self.youtube_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    @property
    def twitch_count(self):
        return find(self.twitch_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    @property
    def parent_achievements_count(self):
        return find(self.parent_achievements_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    @property
    def reviews_text_count(self):
        return find(self.reviews_text_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    @property
    def collections_count(self):
        return find(self.collections_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    @property
    def discussions_count(self):
        return find(self.discussions_counts, settings.LANGUAGES_2_TO_3[get_language()], 0)

    def get_latest_collections(self, request):
        prefetch = Prefetch('creator', queryset=get_user_model().objects.defer_all())
        qs = (
            Collection.objects
            .prefetch_related(prefetch)
            .exclude(likes_users=0, followers_count=0)
            .filter(is_private=False, collectiongame__game__in=[self.id])
        )
        if request.user.is_authenticated:
            qs = qs.annotate(lang=get_languages_condition(request)).order_by('lang', '-likes_users', '-created')
        else:
            qs = qs.filter(language=request.LANGUAGE_CODE_ISO3).order_by('-likes_users', '-created')
        return qs

    def get_context(self, request):
        return self.get_many_context([self], request)

    def get_sitemap_paths(self, language):
        results = []
        for path, prop in self.sitemap_paths.items():
            if type(prop) is list:
                count = 0
                for field in prop:
                    count += getattr(self, field)
            else:
                count = getattr(self, prop)
                if type(count) is dict:
                    count = find(count, language, 0)
            if not count:
                continue
            results.append('{}://{}/games/{}/{}'.format(
                settings.SITE_PROTOCOL, get_site_by_current_language().name, self.slug, path
            ))
        return results

    def replace(self, new_game):
        # replace the game in user games
        for user_game in self.usergame_set.all():
            if new_game.usergame_set.filter(user=user_game.user).count():
                continue
            user_game.skip_auto_now = True
            user_game.game = new_game
            user_game.save(update_fields=['game'])
        for user_favorite in self.userfavoritegame_set.all():
            if new_game.userfavoritegame_set.filter(user=user_favorite.user).count():
                continue
            user_favorite.game = new_game
            user_favorite.save(update_fields=['game'])

        # replace the game in collections
        for collection_game in self.collectiongame_set.all():
            if new_game.collectiongame_set.filter(collection=collection_game.collection).count():
                continue
            collection_game.game = new_game
            collection_game.save()
        for collection_offer in self.collectionoffer_set.all():
            if new_game.collectionoffer_set.filter(collection=collection_offer.collection).count():
                continue
            collection_offer.game = new_game
            collection_offer.save(update_fields=['game'])

        # replace the game in feeds
        from apps.feed.models import Feed
        from apps.users.models import UserGame

        for feed in Feed.objects.select_for_update().filter(data__games__contains=self.id):
            feed.subtract(self.id, 'games', commit=False)
            feed.add(new_game.id, 'games', time=feed.created)
        for status, _ in UserGame.STATUSES:
            kwargs = {'data__statuses__{}__contains'.format(status): self.id}
            for feed in Feed.objects.select_for_update().filter(**kwargs):
                feed.subtract(self.id, 'statuses', status, commit=False)
                feed.add(new_game.id, 'statuses', status, time=feed.created)

        # replace the game in reviews
        for review in self.reviews.all():
            if new_game.reviews.filter(user=review.user).count():
                continue
            review.game = new_game
            review.save(update_fields=['game'])

        # replace the game in discussions
        for discussion in self.discussions.all():
            discussion.game = new_game
            discussion.save(update_fields=['game'])

        # replace the game in the versus
        for versus in self.versus_set.all():
            versus.game = new_game
            versus.save(update_fields=['game'])

        # replace the game in achievements
        for parent_achievement in self.parent_achievements.all():
            if new_game.parent_achievements.filter(name=parent_achievement.name).count():
                new_parent = new_game.parent_achievements.filter(name=parent_achievement.name).first()
                parent_achievement.achievements.update(parent=new_parent, recalculate=True)
                parent_achievement.delete()
                continue
            parent_achievement.game = new_game
            parent_achievement.recalculate = True
            parent_achievement.save(update_fields=['game', 'recalculate'])

        # replace the game in stories
        from apps.stories.models import GameStory

        for game_story in GameStory.objects.filter(game=self):
            game_story.game = new_game
            game_story.save(update_fields=['game'])

    @transaction.atomic
    def append_rating(self, rating, minus=False, commit=True):
        def on_commit():
            from apps.reviews.tasks import update_reviews_totals
            update_reviews_totals.delay(self.id, ratings=True, reactions=minus)
            self.update_persons(['ratings'])
        transaction.on_commit(on_commit)
        rating = str(rating)
        if not self.ratings:
            self.ratings = {}
        self.ratings[rating] = max(0, (self.ratings.get(rating) or 0) + (-1 if minus else 1))
        total = 0
        count = 0
        top = {'rating': 0, 'value': 0}
        for num, value in self.ratings.items():
            total += int(num) * value
            count += value
            if value > top['value'] or (value == top['value'] and int(num) > top['rating']):
                top['rating'] = int(num)
                top['value'] = value
        self.rating = total / count if count else 0
        self.rating_top = top['rating']

    def update_ratings(self):
        ratings = {}
        total = 0
        reviews = self.reviews.visible().values_list('rating', flat=True)
        for review in reviews:
            ratings[review] = (ratings.get(review) or 0) + 1
            total += review
        self.ratings = ratings
        self.rating = total / len(reviews) if len(reviews) > Game.RATING_TRESHOLD else 0
        self.rating_avg = total / len(reviews) if len(reviews) else 0
        top = {'rating': 0, 'value': 0}
        for num, value in self.ratings.items():
            if value > top['value'] or (value == top['value'] and num > top['rating']):
                top['rating'] = num
                top['value'] = value
        self.rating_top = top['rating']
        counts = {}
        for lang, _ in settings.LANGUAGES:
            lang_iso3 = settings.LANGUAGES_2_TO_3[lang]
            counts[lang_iso3] = self.reviews.visible().filter(is_text=True, language=lang_iso3).count()
        self.reviews_text_counts = counts
        self.reviews_text_count_all = self.reviews.visible().filter(is_text=True).count()
        self.ratings_count = self.reviews.visible().filter(is_text=False).count()

    def update_reactions(self):
        reactions = {}
        for review in self.reviews.visible().prefetch_related('reactions').only('id', 'game_id'):
            for reaction in review.reactions.values_list('id', flat=True):
                reactions[reaction] = (reactions.get(reaction) or 0) + 1
        self.reactions = reactions

    def update_persons(self, targets=None):
        from apps.credits.tasks import update_person
        for person_id in set(self.gameperson_set.values_list('person_id', flat=True)):
            update_person.delay(person_id, targets)

    def get_background_image(self, not_in=None):
        qs = ScreenShot.objects.filter(game=self).order_by('is_small', '-is_external', 'id')
        if not_in:
            qs = qs.exclude(id=not_in)
        return qs.last()

    def set_background_image(self, commit=False):
        image = self.get_background_image()
        if image:
            fields = []
            image_additional = self.get_background_image(image.id)
            if image_additional:
                new_background_additional = image_additional.image_background()
                if self.image_background_additional != new_background_additional:
                    self.image_background_additional = new_background_additional
                    fields.append('image_background_additional')
            new_background = image.image_background()
            if self.image_background != new_background:
                fields.append('image_background')
                self.image_background = new_background
                if settings.CRAWLING_SAVE_IMAGES:
                    try:
                        if not self.image and image.image:
                            resize(image.image, settings.PRE_RESIZE_BACKGROUND)
                            crop(image.image, settings.PRE_CROP_BACKGROUND)
                    except ValueError:
                        pass
            if fields and commit:
                self.save(update_fields=fields)

    def set_tba_field(self):
        for game_platform in self.gameplatform_set.only('tba').all():
            if not game_platform.tba:
                continue
            self.tba = True
            return

    def create_synonyms_if_not_exists(cls, name):
        if not cls.synonyms:
            cls.synonyms = [name.lower()]
            cls.save()

    @classmethod
    def get_years(cls, counts=False):
        qs = cls.objects \
            .filter(released__year__gt=1900) \
            .annotate(year=ExtractYear('released')) \
            .values_list('year') \
            .annotate(count=models.Count('id')) \
            .order_by('year')
        if counts:
            return qs.values_list('year', 'count')
        return qs.values_list('year', flat=True)

    @classmethod
    def get_min_year(cls, **kwargs):
        try:
            qs = cls.objects.filter(released__year__gt=1900)
            if kwargs:
                qs = qs.filter(**kwargs)
            return qs.only('released').earliest('released').released.year
        except cls.DoesNotExist:
            return now().year

    @classmethod
    def get_calendar_months(cls, year):
        return cls.objects.filter(released__year=year) \
            .annotate(m=ExtractMonth('released')) \
            .values_list('m') \
            .annotate(count=Count('id')) \
            .order_by('m')

    @classmethod
    def get_many_context(
        cls, games, request=None, offers_collection=None, user_reviews_ratings=None,
        user_selected_platforms=None, statuses=None, statuses_count=3,
    ):
        result = {}
        is_auth = request and request.user.is_authenticated

        if offers_collection:
            offers = CollectionOffer.objects \
                .prefetch_related('creator') \
                .filter(collection_id=offers_collection, game_id__in=[g.id for g in games])
            result['users_offers'] = {c.game_id: c.creator for c in offers}

        if is_auth:
            result['users_games'] = request.user.get_user_games(games)
            result['users_reviews'] = request.user.get_user_reviews(games)

        if user_reviews_ratings:
            if is_auth and user_reviews_ratings.id == request.user.id:
                result['users_reviews_ratings'] = {
                    game_id: r['rating']
                    for game_id, r in result['users_reviews'].items()
                }
            else:
                result['users_reviews_ratings'] = dict(user_reviews_ratings.reviews.visible()
                                                       .filter(game_id__in=[g.id for g in games])
                                                       .values_list('game_id', 'rating'))

        if user_selected_platforms:
            result['users_selected_platforms'] = {}
            if is_auth and user_selected_platforms.id == request.user.id:
                for game_id, user_platform in result['users_games'].items():
                    result['users_selected_platforms'][game_id] = \
                        [p['parent_id'] for p in user_platform['platforms'] if p['parent_id']]
            else:
                from apps.users.models import UserGame

                prefetch = Prefetch('platforms', queryset=Platform.objects.only('parent_id'))
                users_games = UserGame.objects.visible().only('game_id').prefetch_related(prefetch) \
                    .filter(user_id=user_selected_platforms.id, game_id__in=[g.id for g in games])
                for user_game in users_games:
                    result['users_selected_platforms'][user_game.game_id] = [
                        p.parent_id for p in user_game.platforms.all() if p.parent_id
                    ]

        if statuses:
            data = {}
            users = []
            for i, game in enumerate(games):
                data[game.id] = (game.users or {}).get(statuses) or {}
                if i < statuses_count:
                    last = data[game.id].get('last')
                    if last:
                        for user_id in last:
                            users.append(user_id)
                        data[game.id]['count'] -= len(last)
                elif data[game.id]:
                    del data[game.id]['last']
                data[game.id]['status'] = statuses
            result['games_statuses'] = data, get_user_model().objects.defer_all().in_bulk(users)

        return result

    @classmethod
    def find_by_synonyms(cls, name):
        return super().find_by_synonyms(name).order_by('-released')


class CollectionManager(models.Manager):
    def prefetch(self):
        return self.get_queryset().prefetch_related('creator')

    def popular_base(self, request):
        qs = self.get_queryset().filter(on_main=True, is_private=False)
        if not request.user.is_authenticated:
            qs = qs.filter(language=request.LANGUAGE_CODE_ISO3)
        return qs

    def popular_count(self, request):
        return self.popular_base(request).count()

    def popular(self, request):
        creator = Prefetch('creator', queryset=get_user_model().objects.defer_all())
        background = Prefetch('game_background', queryset=Game.objects.only('id', 'image', 'image_background'))
        return self.popular_base(request) \
            .annotate(lang=get_languages_condition(request)) \
            .prefetch_related(creator, background) \
            .order_by('lang', '-on_main_added')

    def indexed(self, obj=None):
        if obj:
            return bool(obj.games_count) and not obj.is_private
        return self.get_queryset().filter(games_count__gt=0, is_private=False)

    def list_short(self):
        return self.get_queryset().only('id', 'name', 'slug', 'game_background', 'backgrounds')


class Collection(InitialValueMixin, LanguageModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=200)
    promo = CICharField(max_length=20, blank=True, default='')
    description = models.TextField(default='', blank=True, max_length=1000)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, models.CASCADE, blank=True, null=True, related_name='collections',
    )
    created = models.DateTimeField(auto_now_add=True, db_index=True)
    updated = models.DateTimeField(default=None, null=True)
    games = models.ManyToManyField(Game, through='CollectionGame')
    offers = models.ManyToManyField(Game, through='CollectionOffer', related_name='collections_offers')
    game_background = models.ForeignKey(
        'games.Game', models.CASCADE, blank=True, null=True, default=None, related_name='+',
    )
    on_main = models.BooleanField(default=False, db_index=True)
    on_main_added = models.DateTimeField(null=True, blank=True, default=None, db_index=True)
    is_private = models.BooleanField(default=False, db_index=True)
    is_zen = models.BooleanField(default=False, db_index=True)
    backgrounds = JSONField(null=True, blank=True, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    followers_count = models.PositiveIntegerField(default=0, editable=False)
    posts_count = models.PositiveIntegerField(default=0, editable=False)
    likes_fake = models.IntegerField(default=0)  # todo outdated
    likes_count = models.PositiveIntegerField(default=0, editable=False)
    likes_users = models.PositiveIntegerField(default=0, editable=False, db_index=True)
    likes_positive = models.PositiveIntegerField(default=0, db_index=True, editable=False)  # todo outdated
    likes_rating = models.IntegerField(default=0, db_index=True, editable=False)  # todo outdated

    objects = CollectionManager()
    language_fields = ('name', 'description')
    init_fields = ('on_main', 'game_background_id', 'games_count', 'is_private')

    class Meta:
        verbose_name = 'Collection'
        verbose_name_plural = 'Collections'
        ordering = ('-created',)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.on_main and not self.on_main_added:
            self.on_main_added = now()
        if self.on_main_added and not self.on_main:
            self.on_main_added = None
        if self.language_text_changed():
            self.updated = now()
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/collections/{self.slug}?view=feed'

    @cached_property
    def share_name(self):
        return md5('{}#{}#{}'.format(self.id, self.name, self.backgrounds).encode('utf-8')).hexdigest()

    @cached_property
    def share_folder(self):
        return self.share_name[0:3]

    @cached_property
    def share_image(self):
        return get_share_image_url(self, 'api_image:collection')

    @property
    def noindex(self):
        return not Collection.objects.indexed(self)

    def get_years(self):
        return Game.objects\
            .filter(collectiongame__collection_id=self.id)\
            .annotate(year=ExtractYear('released'))\
            .values_list('year')\
            .annotate(count=models.Count('id')) \
            .order_by('year') \
            .values_list('year', flat=True)

    def get_games_count(self):
        return self.games.count()

    def get_backgrounds(self, count=4):
        backgrounds = []
        added = 0
        if self.game_background:
            backgrounds.append({
                'url': self.game_background.background_image_full,
                'dominant_color': '0f0f0f',
                'saturated_color': '0f0f0f',
            })
            added += 1
        for game in self.games.order_by('-collectiongame__added'):
            if self.game_background and game.id == self.game_background.id:
                continue
            if not game.background_image:
                continue
            backgrounds.append({
                'url': game.background_image_full,
                'dominant_color': '0f0f0f',
                'saturated_color': '0f0f0f',
            })
            added += 1
            if added == count:
                break
        return backgrounds

    def get_context(self, request):
        return self.get_many_context([self], False, request)

    @classmethod
    def get_many_context(cls, collections, full=False, request=None):
        collections_ids = [collection.id for collection in collections]
        context = {}
        if request and request.user.is_authenticated:
            context['following_collections'] = request.user.get_user_following_collections(collections_ids)
            context['collections_users_likes'] = dict(
                CollectionLike.objects.filter(
                    collection_id__in=collections_ids,
                    user_id=request.user.id,
                ).values_list('collection_id', 'count'))
            if len(collections) == 1:
                context['games_in_collections'] = request.user.get_user_games_in_collections(collections)
        return context


class CollectionGame(InitialValueMixin, models.Model):
    collection = models.ForeignKey(Collection, models.CASCADE)
    game = models.ForeignKey(Game, models.CASCADE)
    added = models.DateTimeField(auto_now_add=True, db_index=True)

    skip_auto_feed = False
    add_user_feed = False
    init_fields = ('collection_id', 'game_id')

    class Meta:
        verbose_name = 'Collection Game'
        verbose_name_plural = 'Collection Games'
        ordering = ('-added', 'game__name')
        unique_together = ('collection', 'game')

    def __str__(self):
        return '{} - {}'.format(self.collection.name, self.game.name)


class CollectionFeed(InitialValueMixin, LanguageModel):
    collection = models.ForeignKey(Collection, models.CASCADE)
    content_type = models.ForeignKey(ContentType, models.CASCADE)
    object_id = models.PositiveIntegerField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, blank=True, default=None, null=True)
    created = models.DateTimeField(db_index=True)
    text = models.TextField(blank=True)
    text_safe = models.TextField(blank=True, editable=False)
    text_bare = models.TextField(blank=True, editable=False)
    text_preview = models.TextField(blank=True, editable=False)
    text_previews = JSONField(null=True, blank=True, editable=False)
    text_attachments = models.PositiveIntegerField(default=0, editable=False)
    comments_count = models.PositiveIntegerField(default=0, editable=False)
    comments_parent_count = models.PositiveIntegerField(default=0, editable=False)
    comments_last = JSONField(null=True, blank=True, editable=False)

    content_object = GenericForeignKey('content_type', 'object_id')
    skip_auto_now = False
    language_fields = ('text_bare',)
    init_fields = ('text_bare', 'text_attachments')

    class Meta:
        verbose_name = 'Collection Feed'
        verbose_name_plural = 'Collection Feeds'
        ordering = ('-created',)
        unique_together = ('collection', 'content_type', 'object_id')

    def save(self, *args, **kwargs):
        if not self.skip_auto_now and not self.id:
            self.created = now()
        text = add_img_attribute(self.text, *self.get_alt_attribute_info())
        text = add_img_attribute(text, *self.get_title_attribute_info())
        self.text_safe = safe_text(text)
        self.text_bare, self.text_preview, self.text_previews, self.text_attachments = bare_text(self.text_safe)
        super().save(*args, **kwargs)

    def get_alt_attribute_info(self):
        return '{} in {} - {{}}'.format(self.get_info_name(), self.collection.name), 'alt'

    def get_title_attribute_info(self):
        return (
            '{} AG in {} - {{}}'.format(self.get_info_name(), self.collection.name),
            'title',
        )

    def get_info_name(self):
        name = ''
        if hasattr(self.content_object, 'game'):
            name = self.content_object.game.name
        elif hasattr(self.content_object, 'name'):
            name = self.content_object.name
        return name

    @property
    def creator_id(self):
        return self.collection.creator_id

    @classmethod
    def get_many_context(cls, collections_feeds, request, full=True, collection=None):
        from apps.reviews.models import Review
        from apps.discussions.models import Discussion
        from apps.comments.models import CommentReview, CommentDiscussion

        context = {}
        if full:
            get_reviews = set()
            get_discussions = set()
            get_users = set()
            get_games = set()
            get_feeds = set()

            # ~~ in ~~
            feed_ids_reviews = {}
            feed_ids_reviews_comments = {}
            feed_ids_discussions = {}
            feed_ids_discussions_comments = {}
            collection_games_ids = []
            feed_ids_games = {}
            content_types = {}
            for cg in collections_feeds:
                if cg.content_type.natural_key() == ('reviews', 'review'):
                    get_reviews.add(cg.object_id)
                    feed_ids_reviews[cg.object_id] = None
                if cg.content_type.natural_key() == ('comments', 'commentreview'):
                    feed_ids_reviews_comments[cg.object_id] = None
                if cg.content_type.natural_key() == ('discussions', 'discussion'):
                    get_discussions.add(cg.object_id)
                    feed_ids_discussions[cg.object_id] = None
                if cg.content_type.natural_key() == ('comments', 'commentdiscussion'):
                    feed_ids_discussions_comments[cg.object_id] = None
                if cg.content_type.natural_key() == ('games', 'collectiongame'):
                    collection_games_ids.append(cg.object_id)
                    feed_ids_games[cg.object_id] = None
                if cg.user_id:
                    get_users.add(cg.user_id)
                get_feeds.add(cg.object_id)
                content_types[cg.content_type_id] = cg.content_type
            collection_games = CollectionGame.objects.in_bulk(collection_games_ids)
            collections_ids_games_ids = {collection_id: cg.game_id for collection_id, cg in collection_games.items()}
            get_games.update(collections_ids_games_ids.values())

            # ~~ get ~~
            ids_reviews_comments = CommentReview.objects.in_bulk(feed_ids_reviews_comments.keys())
            for comment in ids_reviews_comments.values():
                get_reviews.add(comment.object_id)
                get_users.add(comment.user_id)
            ids_discussions_comments = CommentDiscussion.objects.in_bulk(feed_ids_discussions_comments.keys())
            for comment in ids_discussions_comments.values():
                get_discussions.add(comment.object_id)
                get_users.add(comment.user_id)
            ids_reviews = Review.objects.in_bulk(get_reviews)
            ids_discussions = Discussion.objects.in_bulk(get_discussions)
            for review in ids_reviews.values():
                get_users.add(review.user_id)
            ids_users = get_user_model().objects.defer_all().in_bulk(get_users)
            ids_games = Game.objects.defer_all().in_bulk(get_games)
            if request.user.is_authenticated:
                if collection and request.user.id == collection.creator_id:
                    for cg in collections_feeds:
                        name = '{}_{}_users_posts'.format(cg.content_type.app_label, cg.content_type.model)
                        row = context.get(name) or []
                        row.append(cg.object_id)
                        context[name] = row
                else:
                    data = CollectionFeed.objects \
                        .filter(
                            collection__creator_id=request.user.id, object_id__in=get_feeds,
                            content_type_id__in=[ct.id for ct in content_types.values()],
                        ) \
                        .values('content_type', 'object_id')
                    for d in data:
                        content_type = content_types.get(d['content_type'])
                        name = '{}_{}_users_posts'.format(content_type.app_label, content_type.model)
                        context.setdefault(name, []).append(d['object_id'])

            # ~~ out ~~
            # reviews
            for key in feed_ids_reviews:
                feed_ids_reviews[key] = ids_reviews[key]
            context['collections_reviews'] = feed_ids_reviews
            context.update(Review.get_many_context(ids_reviews.values(), request, False, False))

            # reviews comments
            for key in feed_ids_reviews_comments:
                feed_ids_reviews_comments[key] = ids_reviews_comments[key]
            context['collections_reviews_comments'] = feed_ids_reviews_comments
            context.update(CommentReview.get_many_context(ids_reviews_comments.values(), request, False))

            # discussions
            for key in feed_ids_discussions:
                feed_ids_discussions[key] = ids_discussions[key]
            context['collections_discussions'] = feed_ids_discussions
            context.update(Discussion.get_many_context(ids_discussions.values(), request, False, False))

            # discussions comments
            for key in feed_ids_discussions_comments:
                feed_ids_discussions_comments[key] = ids_discussions_comments[key]
            context['collections_discussions_comments'] = feed_ids_discussions_comments
            context.update(CommentDiscussion.get_many_context(ids_discussions_comments.values(), request, False))

            # games
            for key in feed_ids_games:
                feed_ids_games[key] = ids_games[collections_ids_games_ids[key]]
            context['collections_games'] = feed_ids_games
            context['collections_global_games'] = ids_games
            context.update(Game.get_many_context(ids_games.values(), request))

            # users
            context['collections_global_users'] = ids_users

            # comments
            ids = []
            for cg in collections_feeds:
                ids += (cg.comments_last or {}).get('comments') or []
            comment_model = cls.comments.field.model
            context['collection_feeds_comments'] = comment_model.objects.prefetch_related(
                Prefetch('user', queryset=get_user_model().objects.defer_all())
            ).in_bulk(ids)
            if request.user.is_authenticated and context['collection_feeds_comments']:
                context.update(comment_model.get_many_context(
                    list(context['collection_feeds_comments'].values()),
                    request,
                ))
        return context


class CollectionOffer(HiddenModel):
    collection = models.ForeignKey(Collection, models.CASCADE)
    game = models.ForeignKey(Game, models.CASCADE)
    added = models.DateTimeField(auto_now_add=True, db_index=True)
    creator = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, blank=True, null=True, related_name='offers')

    objects = HiddenManager()

    class Meta:
        verbose_name = 'Collection Offer'
        verbose_name_plural = 'Collection Offers'
        ordering = ('-added', 'game__name')
        unique_together = ('collection', 'game')

    def __str__(self):
        return '{} - {}'.format(self.collection.name, self.game.name)


class CollectionLike(InitialValueMixin, models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    collection = models.ForeignKey(Collection, models.CASCADE, related_name='likes')
    count = models.IntegerField(default=1)
    positive = models.BooleanField(default=True)  # todo outdated
    added = models.DateTimeField(auto_now_add=True)

    init_fields = ('positive',)

    class Meta:
        verbose_name = 'Collection Like'
        verbose_name_plural = 'Collection Likes'
        unique_together = ('user', 'collection')

    def __str__(self):
        return str(self.id)


def featured_image(instance, filename):
    return upload_to('featured', instance, filename, False)


def featured_image_mobile(instance, filename):
    return upload_to('featured_mobile', instance, filename, False)


class Featured(OrderedModel):
    game = models.ForeignKey(Game, models.CASCADE, related_name='featured')
    description = models.TextField(verbose_name='описание в каруселе', blank=True, max_length=255)
    image = models.ImageField(verbose_name='картинка в каруселе', upload_to=featured_image, help_text='1154x640, JPG')
    image_mobile = models.ImageField(
        verbose_name='картинка для мобильных устройств', upload_to=featured_image_mobile, blank=True
    )

    class Meta:
        verbose_name = 'Featured Game'
        verbose_name_plural = 'Featured Games'
        ordering = ('order',)

    def save(self, *args, **kwargs):
        new_instance = not bool(self.id)
        super().save(*args, **kwargs)
        if new_instance:
            self.top()

    def __str__(self):
        return 'Featured - {}'.format(self.game.name)


class Recommended(OrderedModel):
    game = models.OneToOneField(Game, models.CASCADE)

    class Meta:
        verbose_name = 'Recommended in sidebar'
        verbose_name_plural = 'Recommended in sidebar'
        ordering = ('order',)

    def __str__(self):
        return f'Recommended - {self.game.name}'


class ESRBRating(OrderedHiddenModel):
    slug = CIAutoSlugField(populate_from='name', unique=True)
    name = models.CharField(max_length=100)
    short_name = models.CharField(max_length=20)
    description = models.CharField(max_length=1000)

    related_name = 'esrb_rating'

    class Meta:
        verbose_name = 'ESRB Rating'
        verbose_name_plural = 'ESRB Ratings'
        ordering = ('order',)

    def __str__(self):
        return 'ESRB — {}'.format(self.name)


class InGameNewsQuerySetBase(models.QuerySet):
    def active(self):
        return self.filter(is_active=True)

    def inactive(self):
        return self.filter(is_active=False)

    def last_active_news(self):
        return self.active()[:self.model.count_last_active_news]


class InGameNewsBase(models.Model):
    count_last_active_news: int

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    published = models.DateTimeField(null=True, editable=False, db_index=True)
    is_active = models.BooleanField(default=False)

    objects = models.Manager.from_queryset(InGameNewsQuerySetBase)()

    class Meta:
        abstract = True
        ordering = ('-published', '-id')

    def save(self, *args, **kwargs):
        if self.is_active and not self.published:
            self.published = now()
        return super().save(*args, **kwargs)


class MadWorldNews(InGameNewsBase):
    NOTICE = 'notice'
    GMBOARD = 'gmboard'
    BOARDS = (
        (NOTICE, 'Notice'),
        (GMBOARD, 'GMBoard'),
    )

    count_last_active_news = 5

    subject = models.CharField(max_length=100)
    content = models.TextField(max_length=600)
    board = models.CharField(max_length=30, choices=BOARDS)
    wr_id = models.PositiveIntegerField(
        null=True, db_index=True, editable=False, validators=[MinValueValidator(1)]
    )

    class Meta(InGameNewsBase.Meta):
        verbose_name = 'MadWorld in-game news'
        verbose_name_plural = 'MadWord in-game news'
        constraints = [
            models.constraints.UniqueConstraint(fields=['wr_id', 'board'], name='unique_wr_id_board')
        ]

    def save(self, *args, **kwargs):
        if self.is_active and self.wr_id is None:
            with transaction.atomic():
                last_wr_id = MadWorldNews.objects.select_for_update().filter(board=self.board, wr_id__isnull=False) \
                    .order_by('wr_id').values_list('wr_id', flat=True).last()
                self.wr_id = (last_wr_id or 0) + 1
                return super().save(*args, **kwargs)
        return super().save(*args, **kwargs)
