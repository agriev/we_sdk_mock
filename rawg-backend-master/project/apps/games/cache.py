import itertools
from math import ceil

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.postgres.fields.jsonb import KeyTextTransform
from django.db.models import Case, Count, ExpressionWrapper, IntegerField, Q, When
from django.utils.timezone import now

from apps.utils.cache import Job
from apps.utils.dates import yesterday
from apps.utils.db import Cast
from apps.utils.lang import fake_request_by_language

MIDDLE_ADDED_DAYS = 14
TOP_ADDED_DAYS = MIDDLE_ADDED_DAYS
TOP_ADDED_MAX_COUNT = 100
MIDDLE_ADDED_WISHLIST_DAYS = 14
TOP_ADDED_WISHLIST_DAYS = MIDDLE_ADDED_WISHLIST_DAYS
TOP_ADDED_WISHLIST_MAX_COUNT = 100


class GameGetMiddleAdded(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, days=MIDDLE_ADDED_DAYS):
        from apps.users.models import UserGame
        qs = UserGame.objects.filter(created__gte=yesterday(days=days)).exclude(status=UserGame.STATUS_TOPLAY)
        total = qs.count()
        games = qs.values_list('game_id').annotate(count=Count('id')).order_by('-count').count()
        return ceil(total / games) if games else 0


class GameGetTopAdded(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, days=TOP_ADDED_DAYS, max_elements=TOP_ADDED_MAX_COUNT):
        from apps.users.models import UserGame
        qs = UserGame.objects.exclude(status=UserGame.STATUS_TOPLAY).filter(
            created__gte=yesterday(days=days), game__released__gt=yesterday(90)
        )
        return [
            game_id for game_id, _
            in qs.values_list('game_id').annotate(count=Count('id')).order_by('-count')[:max_elements]
        ]


class GameGetMiddleAddedWishlist(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, days=MIDDLE_ADDED_WISHLIST_DAYS):
        from apps.users.models import UserGame
        qs = UserGame.objects.filter(status=UserGame.STATUS_TOPLAY, created__gte=yesterday(days=days))
        total = qs.count()
        games = qs.values_list('game_id').annotate(count=Count('id')).order_by('-count').count()
        return ceil(total / games) if games else 0


class GameGetTopAddedWishlist(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, days=TOP_ADDED_WISHLIST_DAYS, max_elements=TOP_ADDED_WISHLIST_MAX_COUNT):
        from apps.users.models import UserGame
        qs = UserGame.objects.filter(
            status=UserGame.STATUS_TOPLAY, created__gte=yesterday(days=days), game__released__gt=yesterday()
        )
        return [
            game_id for game_id, _
            in qs.values_list('game_id').annotate(count=Count('id')).order_by('-count')[:max_elements]
        ]


class GameGetListTrending(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, language=None):
        from apps.games.models import Game

        top_wishlist = GameGetTopAddedWishlist().get()
        wishlist_top = list(
            Game.objects
            .filter(
                id__in=top_wishlist,
                added_by_status__toplay__gt=GameGetMiddleAddedWishlist().get()
            )
            .order_by('-added_by_status__toplay')
            .values_list('id', flat=True)
        )
        other_top = list(
            Game.objects
            .annotate(
                added_without_toplay=ExpressionWrapper(
                    Cast('added', type='INTEGER')
                    - Cast(KeyTextTransform('toplay', 'added_by_status'), type='INTEGER'),
                    output_field=IntegerField()
                )
            )
            .filter(
                id__in=set(GameGetTopAdded().get()).difference(top_wishlist),
                added_without_toplay__gt=GameGetMiddleAdded().get()
            )
            .order_by('-added')
            .values_list('id', flat=True)
        )
        return [
            pk for pk in itertools.chain.from_iterable(itertools.zip_longest(wishlist_top, other_top)) if pk
        ]


class GameGetListPromo(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, language=None):
        from apps.games.models import Game
        if not settings.GAMES_PROMO:
            return []
        when = When(Q(can_play=True) & ~Q(iframe=''), then=True)
        return list(
            Game.objects
            .filter(promo=settings.GAMES_PROMO)
            .annotate(playable=Case(when, default=False))
            .order_by('-playable', '-released')
            .values_list('id', flat=True)
        )


class GameGetListGreatest(Job):
    lifetime = 60 * 60
    is_warm = True
    warm_keys = (
        (None, 21),
        ('year', 10),
    )

    def fetch(self, year=None, limit=21, language=None):
        from apps.games.models import Game
        if year == 'year':
            year = now().year
        return year, list(Game.objects.greatest(year, limit))


class GameCalendarMonth(Job):
    lifetime = 60 * 60
    is_warm = False

    def fetch(self, year, language=None):
        from apps.games.models import Game
        return Game.get_calendar_months(year)


class GameMinYear(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Game
        return Game.get_min_year()


class GameYearsCounts(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Game
        return Game.get_years(counts=True)


class PlatformParentList(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import PlatformParent
        return {p.id: p for p in PlatformParent.objects.all()}


class PlatformParentListByPlatform(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Platform
        parents = PlatformParentList().get()
        return {
            pk: parents[parent_id] for pk, parent_id in Platform.objects.values_list('id', 'parent_id') if parent_id
        }


class PlatformList(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Platform
        return {p.id: p for p in Platform.objects.prefetch_related('parent').all()}


class PlatformListMain(Job):
    lifetime = 60 * 60
    is_warm = False

    def fetch(self, language=None):
        from apps.games.models import Game
        request = fake_request_by_language(language)
        platforms = set(
            platform['platform']['id']
            for platforms
            in Game.objects.recent_games_main_base({'orderings': None}, request)
            .values_list('platforms_json', flat=True).order_by()
            for platform in platforms or []
        )
        platforms_all = PlatformList().get()
        return [
            {
                'platform': platforms_all[platform_id].id,
                'name': platforms_all[platform_id].name,
                'slug': platforms_all[platform_id].slug,
            }
            for platform_id in platforms
        ]


class StoreList(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Store
        return {s.id: s for s in Store.objects.all()}


class GenreList(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self, language=None):
        from apps.games.models import Genre
        return {s.id: s for s in Genre.objects.visible()}


class GameCount(Job):
    lifetime = 60 * 10
    is_warm = True

    def fetch(self):
        from apps.games.models import Game
        return Game.objects.count()


class GameEditingEarliestDate(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from reversion.models import Revision
        return Revision.objects.order_by('id').first().date_created


class GameEditingContentTypes(Job):
    lifetime = 60 * 60
    is_warm = True

    def fetch(self):
        from apps.games.models import Addition, Game, GamePlatform, GameStore, ScreenShot
        from apps.credits.models import GamePerson
        return ContentType.objects.get_for_models(Addition, Game, GamePlatform, GameStore, GamePerson, ScreenShot)
