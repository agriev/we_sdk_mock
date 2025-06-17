import abc
import datetime
import itertools
import logging
import typing
import uuid
from calendar import monthrange
from collections import OrderedDict
from datetime import date
from decimal import Decimal
from hashlib import md5

import dateutil
from allauth.account.models import EmailAddress
from autoslug.utils import generate_unique_slug
from dateutil.relativedelta import MO, relativedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser, UserManager
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields import ArrayField, CICharField, CIEmailField, JSONField
from django.contrib.postgres.indexes import BrinIndex
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.validators import MinValueValidator
from django.db import IntegrityError, connection, models, transaction
from django.db.models import Count, Q
from django.db.models.functions import ExtractWeek, ExtractYear
from django.template.defaultfilters import linebreaksbr, urlize
from django.utils.dateparse import parse_datetime as parse
from django.utils.functional import cached_property
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _, ngettext
from knbauth import api
from papi.exceptions import PAPIException, PAPIUserContactNotFoundError, PAPIUserExistsError
from psycopg2 import errorcodes

from api.games import formats as games_formats
from apps.common.cache import CommonContentType
from apps.common.utils import get_share_image_url
from apps.credits.models import GamePerson, Person
from apps.games import models as games_models
from apps.games.cache import GameMinYear
from apps.reviews.models import Review
from apps.users.validators import UsernameValidator
from apps.utils.dicts import find
from apps.utils.emails import disposable_emails
from apps.utils.haystack import clear_id
from apps.utils.lang import get_site_by_current_language, get_site_by_language
from apps.utils.models import AbstractPlatformUser, HiddenManager, HiddenModel, InitialValueMixin
from apps.utils.player import RedisGuestPlayerDataStorage
from apps.utils.upload import upload_to
from .apps import UsersConfig

logger = logging.getLogger('')


PriceType = typing.Union[int, float, Decimal]


class PlayerBase(metaclass=abc.ABCMeta):
    class DoesNotExist(ObjectDoesNotExist):
        pass

    class InvalidIdError(ValueError):
        pass

    def __init__(self, user, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user

    def __str__(self) -> str:
        return str(self.id)

    def __eq__(self, other: 'PlayerType') -> bool:
        return self.id == other.id

    @classmethod
    def from_request(cls, request) -> 'PlayerType':
        return AuthenticatedPlayer.from_request(request) if request.user.is_authenticated else AnonymousPlayer.from_request(request)

    @staticmethod
    def generate_id() -> uuid.UUID:
        return uuid.uuid4()

    @staticmethod
    def all_by_uids(uids: typing.Iterable[uuid.UUID]) -> typing.Iterator['PlayerType']:
        return itertools.chain(AuthenticatedPlayer.list_by_uids(uids), AnonymousPlayer.list_by_uids(uids))

    @classmethod
    def validate_id(cls, value: typing.Union[uuid.UUID, str, int]) -> uuid.UUID:
        """
        :param value: uuid.UUID instance, or string, or integer representation of uid
        :return: uuid.UUID instance
        :raises cls.InvalidIdError: if passed value is invalid uid
        """
        if isinstance(value, uuid.UUID):
            _uuid = value
        elif isinstance(value, str):
            try:
                _uuid = uuid.UUID(hex=value)
            except ValueError as e:
                raise cls.InvalidIdError(f'Invalid UUID hexadecimal format: {value}') from e
        elif isinstance(value, int):
            try:
                _uuid = uuid.UUID(int=value)
            except ValueError as e:
                raise cls.InvalidIdError(f'Invalid UUID integer format: {value}') from e
        else:
            raise cls.InvalidIdError(f'Invalid UUID representation: {type(value)}')
        if not _uuid.version == 4:
            raise cls.InvalidIdError(f'Invalid UUID version: {_uuid.version}')
        return _uuid

    @classmethod
    @abc.abstractmethod
    def get_by_uid(cls, uid: uuid.UUID) -> 'PlayerType':
        ...

    @classmethod
    @abc.abstractmethod
    def list_by_uids(cls, uids: typing.Iterable[uuid.UUID]) -> typing.Generator['PlayerType', None, None]:
        ...

    @classmethod
    @abc.abstractmethod
    def exists(cls, uid: uuid.UUID) -> bool:
        ...

    @property
    @abc.abstractmethod
    def id(self) -> uuid.UUID:
        ...

    @property
    @abc.abstractmethod
    def is_persistent(self) -> bool:
        ...

    @property
    @abc.abstractmethod
    def expiry_age(self) -> typing.Optional[int]:
        ...

    @property
    @abc.abstractmethod
    def expiry_date(self) -> typing.Optional[datetime.datetime]:
        ...

    @property
    @abc.abstractmethod
    def email(self) -> str:
        ...

    @property
    @abc.abstractmethod
    def balance(self):
        ...


class AuthenticatedPlayer(PlayerBase):
    is_persistent = True

    def __init__(self, user: 'User', *args, **kwargs):
        if not user.is_authenticated:
            raise TypeError('user is unauthenticated')
        super().__init__(user, *args, **kwargs)

    @classmethod
    def from_request(cls, request) -> 'AuthenticatedPlayer':
        return cls(request.user)

    @classmethod
    def get_by_uid(cls, uid: uuid.UUID) -> 'AuthenticatedPlayer':
        """
        :param uid: uuid.UUID instance
        :return: AuthenticatedPlayer instance
        :raises AuthenticatedPlayer.DoesNotExist: if player with uid not found
        """
        try:
            user = get_user_model().objects.get(player_id=uid)
        except ObjectDoesNotExist as e:
            raise cls.DoesNotExist from e
        except ValidationError as e:
            raise cls.InvalidIdError from e
        return cls(user)

    @classmethod
    def list_by_uids(cls, uids: typing.Iterable[uuid.UUID]) -> typing.Generator['AuthenticatedPlayer', None, None]:
        for user in User.objects.filter(player_id__in=uids):
            yield cls(user)

    @classmethod
    def exists(cls, uid: uuid.UUID) -> bool:
        return get_user_model().objects.filter(player_id=uid).exists()

    @property
    def expiry_age(self) -> typing.Optional[int]:
        return None

    @property
    def expiry_date(self) -> typing.Optional[datetime.datetime]:
        return None

    @property
    def id(self) -> uuid.UUID:
        return self.user.player_id

    @property
    def username(self) -> str:
        return self.user.username

    @property
    def avatar(self) -> str:
        return self.user.avatar

    @property
    def full_name(self) -> str:
        return self.user.get_full_name() or self.user.full_name

    @property
    def email(self) -> str:
        return self.user.email

    @property
    def balance(self) -> 'Balance':
        return self.user.balance


class AnonymousPlayer(PlayerBase):
    player_id_key = 'player_id'
    is_persistent = False

    def __init__(self, id, expiry_date, *args, **kwargs):
        super().__init__(AnonymousUser(), *args, **kwargs)
        self.expiry_date = expiry_date
        self._id = self.validate_id(id)

    @classmethod
    def from_request(cls, request) -> 'AnonymousPlayer':
        try:
            _id = cls.validate_id(request.session[cls.player_id_key])
        except (KeyError, cls.InvalidIdError):
            _id = request.session[cls.player_id_key] = cls.generate_id()
        expiry_date = request.session.get_expiry_date()
        instance = cls(id=_id, expiry_date=expiry_date)
        RedisGuestPlayerDataStorage().create(player_id=_id, expiry_date=expiry_date)
        return instance

    @classmethod
    def get_by_uid(cls, uid: uuid.UUID) -> 'AnonymousPlayer':
        """
        :param uid: uuid.UUID instance
        :return: AnonymousPlayer instance
        :raises AnonymousPlayer.DoesNotExist: if player with uid not found
        """
        try:
            _, date = RedisGuestPlayerDataStorage().get(uid)
            player = cls(id=uid, expiry_date=date)
        except RedisGuestPlayerDataStorage.DataNotFound:
            raise cls.DoesNotExist()
        except cls.InvalidIdError:
            raise
        return player

    @classmethod
    def list_by_uids(cls, uids: typing.Iterable[uuid.UUID]) -> typing.Iterator['AnonymousPlayer']:
        yield from (cls(id=uid, expiry_date=date) for uid, date in RedisGuestPlayerDataStorage().list(uids))

    @classmethod
    def exists(cls, uid: uuid.UUID) -> bool:
        return RedisGuestPlayerDataStorage().exists(uid)

    @property
    def expiry_age(self) -> typing.Optional[int]:
        expire = self.expiry_date
        if expire:
            time_now = now()
            return (expire - time_now).seconds if time_now < expire else 0

    @property
    def expiry_date(self) -> typing.Optional[datetime.datetime]:
        return self._expiry_date

    @expiry_date.setter
    def expiry_date(self, value: typing.Union[datetime.datetime, str]):
        if isinstance(value, str):
            value = parse(value)
        self._expiry_date = value

    @property
    def id(self) -> uuid.UUID:
        return self._id

    @property
    def username(self) -> str:
        return UsersConfig.DEFAUlT_GUEST_USERNAME_PATTERN.format(player_id=self.id)

    @property
    def avatar(self) -> str:
        return UsersConfig.DEFAULT_GUEST_AVATAR

    @property
    def full_name(self) -> str:
        return UsersConfig.DEFAULT_GUEST_FULL_NAME

    @property
    def email(self) -> str:
        return UsersConfig.DEFAULT_GUEST_EMAIL

    @property
    def balance(self):
        logger.error('guest user has no balance')
        raise NotImplementedError()


PlayerType = typing.TypeVar('PlayerType', bound=PlayerBase)


class UserGameManager(HiddenManager):
    def prefetch(self):
        return self.get_queryset().prefetch_related('platforms', 'game', 'game__platforms')

    def prefetch_visible(self):
        return self.visible().prefetch_related('platforms', 'game', 'game__platforms')


class UserGame(HiddenModel):
    STATUS_OWNED = 'owned'
    STATUS_PLAYING = 'playing'
    STATUS_TOPLAY = 'toplay'
    STATUS_BEATEN = 'beaten'
    STATUS_DROPPED = 'dropped'
    STATUS_YET = 'yet'
    STATUSES = (
        (STATUS_OWNED, 'Uncategorized'),
        (STATUS_PLAYING, 'Currently playing'),
        (STATUS_TOPLAY, 'Wishlist'),
        (STATUS_BEATEN, 'Completed'),
        (STATUS_DROPPED, 'Played'),
        (STATUS_YET, 'Not played'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    game = models.ForeignKey('games.Game', models.CASCADE)
    platforms = models.ManyToManyField('games.Platform', blank=True)
    status = models.CharField(choices=STATUSES, default=STATUS_OWNED, max_length=10, db_index=True)
    added = models.DateTimeField(db_index=True)  # time of last status changing
    created = models.DateTimeField(auto_now_add=True)
    is_imported = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    playtime = models.PositiveIntegerField(default=0, editable=False)  # in seconds
    playtime_stores = JSONField(blank=True, default=None, editable=False, null=True)
    last_played = models.DateTimeField(blank=True, null=True, db_index=True)
    skip_auto_now = False

    objects = UserGameManager()
    init_fields = ('hidden', 'status', 'playtime')

    class Meta:
        verbose_name = 'User Game'
        verbose_name_plural = 'User Games'
        unique_together = ('user', 'game')
        indexes = [
            BrinIndex(fields=['created'])
        ]

    def save(self, *args, **kwargs):
        if not self.skip_auto_now:
            self.added = now()
        super().save(*args, **kwargs)

    def __init__(self, *args, **kwargs):
        if 'referer' in kwargs:
            self._referer = kwargs.pop('referer')
        super().__init__(*args, **kwargs)

    def set_playtime(self, store_slug, playtime):
        if not self.playtime_stores:
            self.playtime_stores = {}
        self.playtime_stores[store_slug] = playtime
        self.playtime = sum(self.playtime_stores.values())

    @classmethod
    def create_user_game(
        cls, game, user, platform_slugs, playtime=0, is_disable_feed=False, only_created=False,  # raptr=False,
        last_played=None, store_slug=None,
    ):
        try:
            user_game = UserGame.objects.get(user=user, game=game)
            if only_created:
                # save only the last played date and don't run a post-save signal
                if last_played and (not user_game.last_played or last_played > user_game.last_played):
                    user_game.last_played = last_played
                    user_game.save(update_fields=['last_played'])
                return None
            user_game.is_disable_feed = True
            if playtime and store_slug:
                user_game.set_playtime(store_slug, playtime)
            if last_played:
                user_game.last_played = last_played
            user_game.save()
        except UserGame.DoesNotExist:
            user_game = UserGame()
            user_game.user = user
            user_game.game = game
            user_game.is_imported = True
            user_game.is_new = True
            user_game.is_disable_feed = is_disable_feed
            if store_slug:
                user_game.set_playtime(store_slug, playtime)
            user_game.last_played = last_played
            try:
                user_game.save()
            except IntegrityError as e:
                if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                    raise
                user_game = UserGame.objects.get(user=user, game=game)

        def result(user_game_result):
            if user_game_result.hidden:
                return None
            return user_game_result

        game_platforms = game.gameplatform_set.all()
        # try only by first platform
        for game_platform in game_platforms:
            if game_platform.platform.slug == platform_slugs[0]:
                user_game.platforms.add(game_platform.platform)
                return result(user_game)
        # try by all platforms
        for game_platform in game_platforms:
            if game_platform.platform.slug in platform_slugs:
                user_game.platforms.add(game_platform.platform)
                return result(user_game)

        # if raptr:
        #     platform = ','.join(platform_slugs)
        #     if not Platform.objects.filter(slug=platform).count():
        #         from apps.merger.models import Raptr
        #         Raptr.objects.get_or_create(name=platform)

        return result(user_game)


class UserFavoriteGame(models.Model):
    MIN_POSITION = 0
    MAX_POSITION = 7

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    game = models.ForeignKey('games.Game', models.CASCADE)
    position = models.PositiveIntegerField(db_index=True)
    created = models.DateTimeField(auto_now_add=True)
    edited = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Favorite Game'
        verbose_name_plural = 'User Favorite Games'
        unique_together = (('user', 'game'), ('user', 'position'))


class UserReferer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name='user_referred',
    )
    referer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        models.CASCADE,
        related_name='user_referer'
    )
    added = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User Referer'
        verbose_name_plural = 'User Referers'
        unique_together = ('user', 'referer')
        ordering = ('-added',)
        indexes = [
            BrinIndex(fields=['added'])
        ]


class CustomUserManager(UserManager):
    defer_always_fields = {
        'last_login',
        'date_joined',
        'is_superuser',
        'is_staff',
        'is_active',
        'first_name',
        'last_name',
        'all_languages',
        'feed_chronological',
        'referer',
        'token_program_joined',
        'raptr',
        'raptr_status',
        'raptr_date',
    }
    defer_list_fields = {
        'email',
        'password',
        'bio',
        'bio_html',
        'last_entered',
        'last_sync_steam',
        'last_sync_steam_fast',
        'last_sync_xbox',
        'last_sync_xbox_fast',
        'last_sync_psn',
        'last_sync_psn_fast',
        'steam_id',
        'steam_id_uid',
        'steam_id_status',
        'steam_id_date',
        'steam_id_confirm',
        'steam_id_confirm_date',
        'steam_id_uid_first_confirm',
        'steam_games_playtime',
        'gamer_tag',
        'gamer_tag_uid',
        'gamer_tag_status',
        'gamer_tag_date',
        'gamer_tag_confirm',
        'gamer_tag_confirm_date',
        'gamer_tag_uid_first_confirm',
        'psn_online_id',
        'psn_online_id_status',
        'psn_online_id_date',
        'psn_online_id_confirm',
        'psn_online_id_confirm_date',
        'psn_online_id_first_confirm',
        'statistics',
        'settings',
        'feedback_propose',
        'subscribe_mail_synchronization',
        'subscribe_mail_token',
        'select_platform',
        'token_program',
        'tokens',
        'rated_games_percent',
    }

    def _create_user(self, username, email, password, **extra_fields):
        """
        Create and save a user with the given username, email, and password.
        """
        if not username:
            raise ValueError('The given username must be set')
        email = self.normalize_email(email)
        username = self.model.normalize_username(username)
        try:
            user_info = api.user.create(login=username, email=email, password=password, is_confirmed=True)
        except PAPIUserExistsError:
            user_info = api.user.get_by_email(email)
        user = self.model(username=username, email=email, **dict(extra_fields, gid=user_info['uid']))
        user.set_password(password)
        user.save(using=self._db)
        return user

    @cached_property
    def defer_all_fields(self):
        return self.defer_always_fields | self.defer_list_fields

    def defer_all(self, *exclude):
        defer = self.defer_all_fields
        if exclude:
            defer = self.defer_all_fields.difference(exclude)
        return self.get_queryset().defer(*defer)

    def get_index_users(self):
        minimum_games_count = 0
        minimum_reviews_text_count = 1

        index_users = self.filter(
            Q(games_count__gt=minimum_games_count) | Q(reviews_text_count__gte=minimum_reviews_text_count)
        )
        return index_users


def user_image(instance, filename):
    return upload_to('avatars', instance, filename, False)


class User(InitialValueMixin, AbstractPlatformUser):
    SOCIAL_DOMAINS = ('steam.com', 'twitter.com', 'facebook.com', 'vk.com')
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    LANGUAGES = settings.LANGUAGES
    API_GROUPS = (
        (settings.API_GROUP_FREE, _('Free')),
        (settings.API_GROUP_BUSINESS, _('Business')),
        (settings.API_GROUP_ENTERPRISE, _('Enterprise')),
        (settings.API_GROUP_UNLIMITED, _('Unlimited')),
    )
    username_validator = UsernameValidator()
    username_max_length = 150

    email = CIEmailField(unique=True)
    username = CICharField(
        max_length=username_max_length,
        unique=True,
        help_text=ngettext(
            'Required. %(length)d+ character. Letters, digits and -/_ only.',
            'Required. %(length)d+ characters or fewer. Letters, digits and -/_ only.',
            username_max_length
        ),
        validators=[username_validator],
        error_messages={
            'unique': _('A user with that username already exists.'),
        },
    )
    slug = CICharField(max_length=150, unique=True, editable=False)
    full_name = models.CharField(max_length=100, blank=True)
    gid = models.CharField(
        verbose_name='идентификатор в системе авторизации',
        blank=True,
        null=True,
        max_length=32,
        unique=True,
        editable=False)
    bio = models.TextField(default='', blank=True, max_length=512)
    bio_html = models.TextField(default='', blank=True, max_length=1024)
    last_entered = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_steam = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_steam_fast = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_xbox = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_xbox_fast = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_psn = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_psn_fast = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_gog = models.DateTimeField(blank=True, default=None, null=True)
    last_sync_gog_fast = models.DateTimeField(blank=True, default=None, null=True)
    steam_id = models.CharField(max_length=100, blank=True)
    steam_id_uid = models.CharField(max_length=100, blank=True, editable=False)
    steam_id_status = models.CharField(max_length=50, blank=True)
    steam_id_date = models.DateTimeField(blank=True, default=None, null=True)
    steam_id_confirm = models.BooleanField(default=False, editable=False)
    steam_id_confirm_date = models.DateTimeField(blank=True, default=None, null=True, editable=False)
    steam_id_uid_first_confirm = models.CharField(max_length=100, blank=True, editable=False)
    steam_games_playtime = JSONField(blank=True, default=None, editable=False, null=True)
    gamer_tag = models.CharField(max_length=100, blank=True)
    gamer_tag_uid = models.CharField(max_length=100, blank=True, editable=False)
    gamer_tag_status = models.CharField(max_length=50, blank=True)
    gamer_tag_date = models.DateTimeField(blank=True, default=None, null=True)
    gamer_tag_confirm = models.BooleanField(default=False, editable=False)
    gamer_tag_confirm_date = models.DateTimeField(blank=True, default=None, null=True, editable=False)
    gamer_tag_uid_first_confirm = models.CharField(max_length=100, blank=True, editable=False)
    psn_online_id = models.CharField(max_length=100, blank=True)
    psn_online_id_status = models.CharField(max_length=50, blank=True)
    psn_online_id_date = models.DateTimeField(blank=True, default=None, null=True)
    psn_online_id_confirm = models.BooleanField(default=False, editable=False)
    psn_online_id_confirm_date = models.DateTimeField(blank=True, default=None, null=True, editable=False)
    psn_online_id_first_confirm = models.CharField(max_length=100, blank=True)
    raptr = JSONField(null=True, blank=True)
    raptr_status = models.CharField(max_length=50, blank=True)
    raptr_date = models.DateTimeField(blank=True, default=None, null=True)
    gog = models.CharField(max_length=100, blank=True)
    gog_status = models.CharField(max_length=50, blank=True)
    gog_date = models.DateTimeField(blank=True, default=None, null=True)
    games = models.ManyToManyField('games.Game', blank=True, through=UserGame)
    game_background = models.ForeignKey(
        'games.Game', models.CASCADE, blank=True, null=True, default=None, related_name='+'
    )
    followers_count = models.PositiveIntegerField(default=0, editable=False)
    following_count = models.PositiveIntegerField(default=0, editable=False)
    games_count = models.PositiveIntegerField(default=0, editable=False)
    collections_count = models.PositiveIntegerField(default=0, editable=False)
    collections_all_count = models.PositiveIntegerField(default=0, editable=False)
    reviews_count = models.PositiveIntegerField(default=0, editable=False)
    reviews_text_count = models.PositiveIntegerField(default=0, editable=False)
    comments_count = models.PositiveIntegerField(default=0, editable=False)
    feedback_propose = models.BooleanField(default=False)
    subscribe_mail_synchronization = models.BooleanField(default=False)
    subscribe_mail_token = models.BooleanField(default=True)
    subscribe_mail_reviews_invite = models.BooleanField(default=True)
    subscribe_mail_recommendations = models.BooleanField(default=True)
    select_platform = models.BooleanField(default=False)
    all_languages = models.BooleanField(default=False)
    feed_chronological = models.BooleanField(default=False)
    referer = models.CharField(blank=True, default='', editable=False, max_length=500)
    source_language = models.CharField(choices=LANGUAGES, default=LANGUAGES[0][0], max_length=2, editable=False)
    token_program = models.BooleanField(default=False, editable=False)
    token_program_joined = models.DateTimeField(blank=True, default=None, null=True, editable=False)
    tokens = models.DecimalField(max_digits=19, decimal_places=10, default=0, editable=False)
    rated_games_percent = models.PositiveIntegerField(default=0)
    last_visited_games_ids = ArrayField(models.PositiveIntegerField(), default=list, editable=False)
    api_key = CICharField(blank=True, max_length=32, unique=True)
    api_email = CIEmailField(blank=True)
    api_url = models.URLField(blank=True)
    api_description = models.TextField(blank=True)
    api_group = models.CharField(choices=API_GROUPS, default=settings.API_GROUP_FREE, max_length=10)
    api_group_changed = models.DateTimeField(blank=True, default=None, null=True, help_text='For enterprise')
    stripe_customer_id = models.CharField(blank=True, max_length=200, db_index=True, default='')
    statistics = JSONField(null=True, blank=True, editable=False)
    settings = JSONField(null=True, blank=True, editable=False)
    player_id = models.UUIDField('id игрока', unique=True, default=PlayerBase.generate_id, editable=False)

    objects = CustomUserManager()
    init_fields = ('avatar', 'bio', 'api_group')
    sitemap_paths = {
        'games': 'games_count',
        'wishlist': False,
        'collections/created': 'collections_count',
        'collections/following': False,
        'reviews': 'reviews_count',
        'connections/following': 'following_count',
        'connections/followers': 'followers_count',
    }

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ('-id',)

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.is_init_change('bio', kwargs):
            self.bio_html = urlize(linebreaksbr(self.bio))

        if self.is_init_change('api_group', kwargs) and self.api_group == settings.API_GROUP_ENTERPRISE:
            self.api_group_changed = now()

        if not self.api_key:
            self.api_key = uuid.uuid4().hex

        self.save_slug()
        super().save(*args, **kwargs)

    def get_absolute_url(self):
        return '{}://{}/@{}'.format(settings.SITE_PROTOCOL, get_site_by_current_language().name, self.slug)

    def save_slug(self):
        if 'username' in self.get_deferred_fields() or 'slug' in self.get_deferred_fields():
            return
        self.slug = self.username.lower()
        if self.slug.isdigit():
            field = self._meta.get_field('slug')
            field.unique_with = []
            field.index_sep = '-'
            self.slug = generate_unique_slug(field, self, 'user-{}'.format(self.slug), None)

    @cached_property
    def real_email(self):
        if self.email:
            name, domain = self.email.split('@')
            if domain.lower() in self.SOCIAL_DOMAINS and name.isdigit():
                if self.papi_vk_emails:
                    return self.papi_vk_emails[0]
                return None
            return self.email

    @cached_property
    def papi_social_emails(self) -> typing.Optional[typing.Dict[str, typing.List]]:
        if self.gid:
            try:
                return api.user.get_social_emails(uid=self.gid)
            except (PAPIException, PAPIUserContactNotFoundError):
                return None
        return None

    @property
    def papi_vk_emails(self) -> typing.Optional[typing.List[str]]:
        try:
            return self.papi_social_emails['vk_emails']
        except (KeyError, TypeError):
            return None

    @cached_property
    def has_real_email(self):
        return self.real_email and self.real_email not in disposable_emails()

    @cached_property
    def can_edit_games(self):
        return self.has_real_email and self.is_confirmed

    @cached_property
    def share_name(self):
        return md5('{}#{}#{}#{}#{}#{}'.format(
            self.id, self.full_name, self.username, self.games_count,
            self.reviews_count, self.comments_count).encode('utf-8')
        ).hexdigest()

    @cached_property
    def share_folder(self):
        return self.share_name[0:3]

    @cached_property
    def share_image(self):
        return get_share_image_url(self, 'api_image:user')

    @cached_property
    def games_wishlist_count(self):
        return UserGame.objects.visible().filter(user_id=self.id, status=UserGame.STATUS_TOPLAY).count()

    @property
    def has_game_accounts(self):
        return self.steam_id or self.psn_online_id or self.gamer_tag

    @property
    def has_confirmed_accounts(self):
        return self.steam_id_confirm or self.psn_online_id_confirm or self.gamer_tag_confirm

    @property
    def confirmed_accounts_count(self):
        return len(list(filter(bool, [self.steam_id_confirm, self.psn_online_id_confirm, self.gamer_tag_confirm])))

    @property
    def has_confirmed_email(self):
        try:
            email = EmailAddress.objects.only('verified').get(user=self, primary=True)
        except EmailAddress.DoesNotExist:
            return False
        return email.verified

    @property
    def api_dates(self) -> (date, date):
        dates = None
        first_date = self.date_joined.date()
        if self.api_group == settings.API_GROUP_BUSINESS:
            from apps.stripe.models import Payment
            payment = Payment.objects.filter(user=self, until_date__gt=now()).first()
            if payment:
                dates = (payment.created.date(), payment.until_date.date())
        if self.api_group == settings.API_GROUP_ENTERPRISE and self.api_group_changed:
            first_date = self.api_group_changed.date()

        if not dates:
            today = now().date()
            try:
                first_period = first_date.replace(year=today.year, month=today.month)
            except ValueError:
                day = monthrange(today.year, today.month)[1]
                first_period = today.replace(day=day)
            if first_period > today:
                first_period -= relativedelta(months=1)
            dates = (first_period, first_period + relativedelta(months=1))

        return dates

    @property
    def visible_name(self):
        return self.full_name or self.username

    def get_years(self, counts=False, qs=None, to_play=False):
        if qs is None:
            qs = UserGame.objects.visible().filter(user_id=self.id)
        if to_play:
            qs = qs.filter(status=UserGame.STATUS_TOPLAY)
        else:
            qs = qs.exclude(status=UserGame.STATUS_TOPLAY)
        result = qs.annotate(released_year=ExtractYear('game__released')) \
            .filter(released_year__gt=1900) \
            .values_list('released_year') \
            .annotate(count=Count('id')) \
            .order_by('released_year')
        if counts:
            return result.filter(released_year__lte=counts)
        return result.values_list('released_year', flat=True)

    def get_user_games(self, games, from_queryset=True):
        if from_queryset:
            games = [clear_id(game.id) for game in games]
        users_games = UserGame.objects \
            .visible() \
            .prefetch_related('platforms') \
            .filter(user_id=self.id, game_id__in=games)
        output = {}
        for user_game in users_games:
            objects = []
            for platform in user_game.platforms.all():
                objects.append({
                    'id': platform.id,
                    'name': platform.name,
                    'slug': platform.slug,
                    'parent_id': platform.parent_id,
                })
            output[user_game.game_id] = {
                'status': user_game.status,
                'added': user_game.added,
                'platforms': objects,
            }
        return output

    def get_user_reviews(self, games):
        games = [clear_id(game.id) for game in games]
        output = {}
        users_reviews = self.reviews \
            .visible() \
            .filter(user_id=self.id, game_id__in=games) \
            .values_list('id', 'game_id', 'rating', 'is_text')
        for pk, game_id, rating, is_text in users_reviews:
            output[game_id] = {
                'id': pk,
                'rating': rating,
                'is_text': is_text,
            }
        return output

    def get_user_following_collections(self, collections_ids):
        follows = UserFollowElement.objects.filter(
            user_id=self.id, object_id__in=collections_ids,
            content_type=CommonContentType().get(games_models.Collection)
        )
        return {follow.object_id: True for follow in follows}

    def get_user_games_in_collections(self, collections):
        data = {}
        for collection in collections:
            games_ids = collection.collectiongame_set.values_list('game_id', flat=True)
            count = UserGame.objects.filter(user_id=self.id, game_id__in=games_ids, hidden=False).count()
            percent = collection.games_count / 100
            data[collection.id] = {
                'count': count,
                'percent': int(round(count / percent, 0)) if percent else 0
            }
        return data

    def get_user_games_counters(self):
        counters = {}
        for slug, title in UserGame.STATUSES:
            counters[slug] = 0
        statuses = UserGame.objects.visible().filter(user_id=self.id).values('status').annotate(total=Count('status'))
        for status in statuses:
            counters[status['status']] = status['total']
        counters['uncategorized'] = counters['owned']
        counters['owned'] = sum([count for _, count in counters.items()])
        return counters

    def get_reviews_counters_queryset(self, is_text):
        if not is_text:
            queryset = self.reviews.visible()
        else:
            queryset = self.reviews.visible().filter(is_text=True)
        ratings = queryset.values('rating').annotate(count=Count('rating')).order_by('-count')
        return ratings

    def get_reviews_counters(self, is_text=False):
        ratings = self.get_reviews_counters_queryset(is_text)
        for rating in ratings:
            rating['id'] = rating['rating']
            rating['title'] = dict(Review.RATINGS)[rating['rating']]
            del rating['rating']
        return list(ratings)

    def get_last_collections(self):
        return list(self.collections.filter(is_private=False).order_by('-created').values_list('id', flat=True))[0:5]

    def get_user_games_graph(self, qs=None):
        if qs is None:
            qs = UserGame.objects.visible().filter(user=self)
        return self.get_graph_data(qs)

    def get_reviews_graph(self):
        return self.get_graph_data(self.reviews.visible())

    def get_collections_graph(self):
        return self.get_graph_data(self.collections.filter(is_private=False))

    def get_graph_data(self, qs):
        return list(qs.filter(created__gte=now() + relativedelta(weekday=MO(-10), hour=0, minute=0, second=0))
                    .annotate(w=ExtractWeek('created'))
                    .values_list('w')
                    .annotate(count=Count('id'))
                    .order_by('w'))

    def get_statistic_decades(self):
        return [1979, 1990, 2000, 2010, now().year]

    def get_statistics_years(self, qs=None):
        years = OrderedDict()
        min_year, max_year = GameMinYear().get(), now().year
        for year in range(min_year, max_year + 1):
            years[year] = {
                'year': year,
                'count': 0,
            }
        for year, count in self.get_years(max_year, qs):
            years[year]['count'] = count
        return list(years.values())

    def get_statistics_years_top(self, qs=None):
        all_years = dict(self.get_years(now().year, qs).order_by('released_year'))
        decades = self.get_statistic_decades()
        intervals = []
        start = decades.pop(0)
        for decade in decades:
            row = {
                'start': start,
                'end': decade - 1 if decade != now().year else decade,
                'count': 0,
                'top_year': 0,
                'top_count': 0
            }
            for year, count in all_years.items():
                if row['start'] <= year <= row['end']:
                    row['count'] += count
                    if count > row['top_count']:
                        row['top_year'] = year
                        row['top_count'] = count
            intervals.append(row)
            start = decade
        data = sorted(
            [interval for interval in intervals if interval['count']], key=lambda x: x['count'], reverse=True
        )
        if len(data) < 3:
            data = self.get_years(now().year, qs).order_by('-count', '-released_year')
        else:
            data = [(interval['top_year'], interval['top_count']) for interval in data]
        years = {}
        for year, count in data[0:3]:
            game_ids = UserGame.objects.visible() \
                .annotate(released_year=ExtractYear('game__released')) \
                .filter(user_id=self.id, released_year=year) \
                .order_by('-game__added') \
                .values_list('game_id', flat=True)[0:10]
            years[year] = {
                'year': year,
                'count': count,
                'games': list(game_ids),
            }
        return sorted(years.values(), key=lambda x: (x['count'], x['year']), reverse=True)

    def get_top_persons(self, qs=None):
        if qs is None:
            qs = UserGame.objects.visible().filter(user_id=self.id)
        counter = {}
        game_person = set()
        users_games = qs.values_list('game_id', flat=True)
        persons = GamePerson.objects.visible().filter(game_id__in=users_games)
        for person_id, game_id, person_count in persons.values_list('person_id', 'game_id', 'person__games_count'):
            value = counter.get(person_id) or {'games': 0, 'positions': 0, 'person': person_count}
            value['positions'] += 1
            if (person_id, game_id) not in game_person:
                value['games'] += 1
                game_person.add((person_id, game_id))
            counter[person_id] = value
        result = sorted(counter.items(), key=lambda x: (-x[1]['games'], -x[1]['person'], -x[1]['positions']))[0:15]
        return [x[0] for x in result]

    def get_real_user_games_count(self):
        return (
            UserGame.objects
            .visible()
            .filter(user=self)
            .exclude(status__in=['yet', 'toplay'])
            .count()
        )

    def get_rated_games_percent(self):
        user_games = (
            UserGame.objects
            .visible()
            .filter(user=self)
            .exclude(status__in=['yet', 'toplay'])
            .values_list('game_id', flat=True)
        )
        rated_games = Review.objects.visible().filter(user=self, game_id__in=user_games).count()
        total_games = self.get_real_user_games_count()
        try:
            return int(round(rated_games / total_games * 100, 2))
        except ZeroDivisionError:
            return 0

    def set_statistics(self, targets=None, commit=True, **kwargs):
        from apps.recommendations.tasks import update_user_recommendations

        if not self.statistics:
            self.statistics = {}
        fields = ['statistics']
        if not targets or 'game' in targets:
            self.games_count = UserGame.objects.visible().filter(user=self).count()
            if not find(self.settings, 'recommendations_users_date') and self.games_count:
                update_user_recommendations(self.id)

            qs = UserGame.objects.prefetch_visible().filter(user=self).exclude(status=UserGame.STATUS_TOPLAY)
            self.statistics['years'] = self.get_statistics_years(qs)
            self.statistics['years_top'] = self.get_statistics_years_top(qs)
            self.statistics['games_statuses'] = self.get_user_games_counters()
            self.statistics['games_graph'] = self.get_user_games_graph(qs)
            self.statistics['persons_top'] = self.get_top_persons(qs)

            games = []
            user_game_platforms = {}
            game_platforms = {}
            for user_game in qs.prefetch_related('game__developers', 'game__genres'):
                games.append(user_game.game)
                user_game_platforms[user_game.game.id] = user_game.platforms.all()
                game_platforms[user_game.game.id] = user_game.game.platforms.all()
            games_to_play = []
            game_platforms_to_play = {}
            for user_game in UserGame.objects.prefetch_visible().filter(user=self, status=UserGame.STATUS_TOPLAY):
                games_to_play.append(user_game.game)
                game_platforms_to_play[user_game.game.id] = user_game.game.platforms.all()
            self.statistics['games_platforms'] = games_formats.percents(games, user_game_platforms, 'platform', 'name')
            self.statistics['games_platforms_all'] = games_formats.percents(games, game_platforms, 'platform', 'name')
            self.statistics['games_platforms_to_play'] = games_formats.percents(
                games_to_play, game_platforms_to_play, 'platform', 'name'
            )
            developers = games_formats.percents(games, 'developers', 'developer', 'name', True)
            self.statistics['games_developers'] = developers[0:10]
            self.statistics['games_developers_total'] = len(developers)
            self.statistics['games_genres'] = games_formats.percents(games, 'genres', 'genre', 'name', True)

            fields.append('games_count')
        if not targets or 'collection' in targets:
            self.collections_count = self.collections.filter(is_private=False).count()
            self.collections_all_count = self.collections.count()
            self.statistics['collections_items'] = self.get_last_collections()
            self.statistics['collections_graph'] = self.get_collections_graph()
            fields.append('collections_count')
        if not targets or 'review' in targets:
            update_user_recommendations(self.id)

            self.reviews_count = self.reviews.visible().count()
            self.reviews_text_count = self.reviews.visible().filter(is_text=True).count()
            self.rated_games_percent = self.get_rated_games_percent()
            self.statistics['reviews_ratings'] = self.get_reviews_counters()
            self.statistics['reviews_graph'] = self.get_reviews_graph()
            fields.append('reviews_count')
            fields.append('reviews_text_count')
            fields.append('rated_games_percent')
        if not targets or 'comment' in targets:
            self.comments_count = (
                self.commentreview_set.count() + self.commentcollectionfeed_set.count()
                + self.commentdiscussion_set.count()
            )
            fields.append('comments_count')
        if targets and 'recommended_users' in targets:
            self.statistics['recommended_users'] = kwargs['recommended_users']
        self.statistics['updated'] = now().isoformat()
        if commit:
            update = {}
            for field in fields:
                update[field] = getattr(self, field)
            get_user_model().objects.filter(id=self.id).update(**update)

    def get_compatibility(self, another_user_id):
        users = (self.id, another_user_id)
        all_games = UserGame.objects.visible().filter(user_id__in=users).values_list('user_id', 'game_id')
        games = set()
        another_games = set()
        for user_id, game_id in all_games:
            if user_id == self.id:
                games.add(game_id)
            else:
                another_games.add(game_id)
        percent, _ = self.get_compatibility_by_games(games, another_games=another_games)
        return {
            'percent': percent,
            'label': 'low' if percent < 33 else ('middle' if percent < 67 else 'high')
        }

    def get_similar_games(self, another_user_id, count=10):
        users = (self.id, another_user_id)
        games = UserGame.objects.visible().values('game') \
            .annotate(count=Count('id')) \
            .filter(user_id__in=users, count=2) \
            .order_by('-count', 'game__added') \
            .values_list('game_id', 'game__slug', 'game__name')[0:count]
        return list([{'id': pk, 'slug': slug, 'name': name} for pk, slug, name in games])

    def get_context(self, request, is_current=False):
        result = False
        if not is_current and request.user.is_authenticated:
            result = bool(UserFollowElement.objects.filter(
                object_id=self.id, user_id=request.user.id, content_type=CommonContentType().get(get_user_model())
            ).count())
        return {'following_users': result}

    def get_sitemap_paths(self, additional_data, language):
        results = []
        for path, prop in self.sitemap_paths.items():
            if not prop:
                count = self.id in additional_data[path]
            else:
                count = getattr(self, prop)
            if not count:
                continue
            results.append('{}://{}/@{}/{}'.format(
                settings.SITE_PROTOCOL, get_site_by_language(language).name, self.slug, path
            ))
        return results

    def get_following_games_last_date(self):
        last_date_key = 'users_current_following_users_games_last_date'
        last_date = (self.settings or {}).get(last_date_key)
        if last_date:
            last_date = dateutil.parser.parse(last_date)
        return last_date, last_date_key

    def get_platforms(self):
        user_platforms = set()
        with connection.cursor() as cursor:
            sql = '''
                select users_usergame_platforms.platform_id, count(*)
                from users_usergame_platforms
                left join users_usergame on users_usergame_platforms.usergame_id = users_usergame.id
                where users_usergame.user_id = %s and users_usergame.hidden is not null and users_usergame.status != %s
                group by users_usergame_platforms.platform_id
            '''
            cursor.execute(sql, [self.id, UserGame.STATUS_TOPLAY])
            user_platforms = [platform for platform, _ in cursor.fetchall()]
        return user_platforms

    def get_game_platforms(self):
        user_platforms = set()
        with connection.cursor() as cursor:
            sql = '''
                select games_gameplatform.platform_id, count(*)
                from users_usergame
                left join games_game on games_game.id = users_usergame.game_id
                left join games_gameplatform on games_game.id = games_gameplatform.game_id
                where users_usergame.user_id = %s and users_usergame.hidden is not null and users_usergame.status != %s
                group by games_gameplatform.platform_id
            '''
            cursor.execute(sql, [self.id, UserGame.STATUS_TOPLAY])
            user_platforms = [platform for platform, _ in cursor.fetchall()]
        return user_platforms

    def reset_steam(self):
        self.steam_id_date = None
        self.steam_id_status = ''
        self.steam_id_uid = ''
        self.steam_id_confirm = False
        self.last_sync_steam = None
        self.last_sync_steam_fast = None

    def reset_xbox(self):
        self.gamer_tag_date = None
        self.gamer_tag_status = ''
        self.gamer_tag_uid = ''
        self.gamer_tag_confirm = False
        self.last_sync_xbox = None
        self.last_sync_xbox_fast = None

    def reset_playstation(self):
        self.psn_online_id_date = None
        self.psn_online_id_status = ''
        self.psn_online_id_confirm = False
        self.last_sync_psn = None
        self.last_sync_psn_fast = None

    def reset_gog(self):
        self.gog_date = None
        self.gog_status = ''
        self.last_sync_gog = None
        self.last_sync_gog_fast = None

    def is_network_confirmed(self, network_id):
        from apps.merger.models import Network
        from apps.merger.tasks.common import STORES

        if not self.token_program:
            return False
        slug = Network.objects.only('slug').get(id=network_id).slug
        for store in STORES:
            if store.network_slug == slug:
                return getattr(self, '{}_confirm'.format(store.field))
        return False

    @staticmethod
    def get_compatibility_by_games(games, another_user_id=None, another_games=None):
        if not another_games:
            another_games = UserGame.objects.visible().filter(user_id=another_user_id) \
                .values_list('game_id', flat=True)
        intersect = len(set(another_games).intersection(games))
        percent_my = int(intersect / (len(games) / 100)) if games else 0
        percent_another = int(intersect / (len(another_games) / 100)) if another_games else 0
        return percent_my, percent_another

    @classmethod
    def get_many_context(cls, users, request=None, following=None):
        result = {}
        if following is not None:
            result['following_users'] = following
        elif request:
            if not request.user.is_authenticated:
                result['following_users'] = False
            else:
                objects = UserFollowElement.objects.filter(
                    user_id=request.user.id, object_id__in=[user.id for user in users],
                    content_type=CommonContentType().get(get_user_model())
                )
                follows = {follow.object_id: True for follow in objects}
                result['following_users'] = follows
        return result

    @classmethod
    def get_sitemap_additional_data(cls):
        return {
            'wishlist': list(
                UserGame.objects.visible().filter(status=UserGame.STATUS_TOPLAY).values('user_id')
                .annotate(count=Count('id')).order_by('count').values_list('user_id', flat=True)
            ),
            'collections/following': list(
                UserFollowElement.objects
                .filter(content_type=CommonContentType().get(games_models.Collection)).values('user_id')
                .annotate(count=Count('id')).order_by('count').values_list('user_id', flat=True)
            ),
        }


class UserFollowManager(models.Manager):
    def elements(self, user_id):
        return self.get_queryset().filter(user_id=user_id).exclude(
            content_type_id=CommonContentType().get(get_user_model())
        )


class UserFollowElement(models.Model):
    INSTANCES = {
        'publisher': games_models.Publisher,
        'developer': games_models.Developer,
        'person': Person,
        'genre': games_models.Genre,
        'platform': games_models.Platform,
        'tag': games_models.Tag,
        'store': games_models.Store,
        'collection': games_models.Collection,
        'user': User,
    }
    INSTANCES_QUERIES = {
        games_models.Platform: games_models.Platform.objects,
        games_models.Collection: games_models.Collection.objects.list_short(),
        games_models.Store: games_models.Store.objects,
    }
    INSTANCES_ORDERING = [
        games_models.Platform,
        games_models.Genre,
        games_models.Tag,
        games_models.Publisher,
        games_models.Developer,
        games_models.Store,
        Person,
        games_models.Collection,
    ]
    INSTANCES_GAME_QUERIES = {
        games_models.Publisher: lambda pk: ({'publishers': pk}, False),
        games_models.Developer: lambda pk: ({'developers': pk}, False),
        Person: lambda pk: ({'gameperson__person': pk}, True),
        games_models.Genre: lambda pk: ({'genres': pk}, False),
        games_models.Platform: lambda pk: ({'gameplatform__platform_id': pk}, False),
        games_models.Store: lambda pk: ({'gamestore__store_id': pk}, False),
        games_models.Tag: lambda pk: ({'tags': pk}, False),
        games_models.Collection: lambda pk: ({'collectiongame__collection_id': pk}, False),
    }
    INSTANCES_ID_TABLES = {
        'publisher': 'games_game_publishers',
        'developer': 'games_game_developers',
        'person': 'credits_gameperson',
        'genre': 'games_game_genres',
        'platform': 'games_gameplatform',
        'tag': 'games_game_tags',
        'store': 'games_gamestore',
        'collection': 'games_collectiongame',
    }
    INSTANCES_TO_FILTER = [
        games_models.Platform,
        games_models.Genre,
        games_models.Tag,
        games_models.Store,
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE, related_name='follows')
    content_type = models.ForeignKey(ContentType, models.CASCADE)
    object_id = models.PositiveIntegerField()
    added = models.DateTimeField()
    last_viewed_id = models.PositiveIntegerField(blank=True, default=None, null=True)

    objects = UserFollowManager()
    content_object = GenericForeignKey()
    skip_auto_now = False

    class Meta:
        verbose_name = 'User Follow Element'
        verbose_name_plural = 'User Follow Elements'
        unique_together = ('user', 'content_type', 'object_id')
        ordering = ('-added',)
        indexes = (
            BrinIndex(fields=['added']),
        )

    def save(self, *args, **kwargs):
        if not self.skip_auto_now and not self.id:
            self.added = now()
        super().save(*args, **kwargs)

    @classmethod
    def get_many_context(cls, elements, request=None):
        content_types_elements = {}
        for el in elements:
            content_types_elements.setdefault(el.content_type.model_class(), []).append(el.object_id)
        result = {}
        for model, values in content_types_elements.items():
            if model in cls.INSTANCES_QUERIES:
                qs = cls.INSTANCES_QUERIES[model]
            else:
                qs = model.objects.visible()
            result[model] = qs.in_bulk(values)
        return {'follow_elements': result}


class Balance(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='balance', editable=False
    )
    bonuses = models.DecimalField(
        'bonuses', max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)]
    )

    class Meta:
        verbose_name = 'User balance'
        verbose_name_plural = 'User balances'
        constraints = [
            models.CheckConstraint(check=Q(bonuses__gte=0), name='bonuses_gte_0')
        ]

    def top_up_bonuses(self, amount: Decimal) -> None:
        self.bonuses = models.F('bonuses') + amount
        self.save(update_fields=['bonuses'])
        self.refresh_from_db(fields=['bonuses'])

    def withdraw_bonuses(self, amount: Decimal) -> None:
        self.top_up_bonuses(-amount)

    def safe_withdraw_bonuses(self, amount: Decimal) -> None:
        self.bonuses = models.Case(
            models.When(bonuses__gte=amount, then=models.F('bonuses') - amount),
            default=0
        )
        self.save(update_fields=['bonuses'])
        self.refresh_from_db(fields=['bonuses'])


class SubscriptionProgram(models.Model):
    class SubscriptionAlreadyExists(Exception):
        pass

    BETATEST = 'betatest'
    STATUSES = (
        (BETATEST, 'Beta test subscription'),
    )

    status = models.CharField(choices=STATUSES, max_length=20)
    game = models.ForeignKey('games.Game', on_delete=models.CASCADE)
    reward_bonus = models.PositiveSmallIntegerField(null=True)

    class Meta:
        verbose_name = 'Game status subscription program'
        verbose_name_plural = 'Game status subscription programs'
        constraints = [
            models.UniqueConstraint(fields=('game', 'status'), name='sub_program_game_status_unique_constraint')
        ]

    @transaction.atomic
    def subscribe_user(self, user) -> typing.Tuple['Subscription', bool]:
        try:
            instance = Subscription.objects.create(user=user, program=self)
        except IntegrityError as err:
            raise self.SubscriptionAlreadyExists() from err

        if self.reward_bonus:
            instance.user.balance.top_up_bonuses(self.reward_bonus)
        return instance


class Subscription(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    program = models.ForeignKey(SubscriptionProgram, models.CASCADE)

    class Meta:
        verbose_name = 'Game status subscription'
        verbose_name_plural = 'Game status subscriptions'
        constraints = [
            models.UniqueConstraint(fields=('user', 'program'), name='sub_user_game_unique_constraint')
        ]
