import os
from datetime import date
from itertools import product
from urllib.parse import urlparse

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sitemaps import Sitemap
from django.core import paginator
from django.db import connection
from django.db.models import Prefetch, Q
from django.db.models.functions import Length
from django.utils.timezone import now

from apps.common.seo import GAMES_LIST_MIN_GAMES_FOR_INDEX, game_screenshot
from apps.credits.models import Person
from apps.discussions.models import Discussion
from apps.files.models import Software
from apps.games.models import (
    Collection, CollectionFeed, Developer, Game, Genre, Platform, Publisher, ScreenShot, Store, Tag,
)
from apps.reviews.models import Review
from apps.suggestions.models import Suggestion
from apps.utils.lang import fake_request_by_language
from apps.utils.list import split

LANGUAGE_ISO2 = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)
LANGUAGE = settings.LANGUAGES_2_TO_3[LANGUAGE_ISO2]
OTHER_LANGUAGES = [settings.LANGUAGES_2_TO_3[code] for code, _ in settings.LANGUAGES if code != LANGUAGE_ISO2]
LANGUAGE_MODE_INCLUDE = LANGUAGE_ISO2 != settings.MODELTRANSLATION_DEFAULT_LANGUAGE
GAMES_MIN_ADDED = 10
ELEMENTS_MIN_ADDED = 20
SYMBOLS_MIN = 700


class StaticSitemap(Sitemap):
    priority = 0.9

    def items(self):
        return ['/', '/games', '/welcome', '/privacy_policy', '/terms', '/feedback', '/apidocs']

    def location(self, item):
        return item


class ProjectSitemap(Sitemap):
    model = None
    limit = 25000
    priority = 0.9
    use_sitemap_paths = True

    def items(self):
        return self.model.objects.all()

    def location(self, obj):
        return urlparse(super().location(obj)).path

    @property
    def paginator(self):
        count = 1
        # todo fix it because total count of pages is wrong
        # if getattr(self.model, 'sitemap_paths', None) and self.use_sitemap_paths:
        #     count += len(self.model.sitemap_paths)
        return paginator.Paginator(self.items(), int(self.limit / count))

    def _urls(self, page, protocol, domain):
        items = super()._urls(page, protocol, domain)
        add_urls = []
        args = ()
        additional_data = getattr(self.model, 'get_sitemap_additional_data', None)
        if additional_data:
            args = additional_data(),
        for item in items:
            func = getattr(item['item'], 'get_sitemap_paths', None)
            if not func or not self.use_sitemap_paths:
                break
            for path in func(*args, language=LANGUAGE):
                new_item = item.copy()
                new_item['location'] = path
                new_item['priority'] = 0.8
                add_urls.append(new_item)
        return items + add_urls


class GamesSitemap(ProjectSitemap):
    model = Game
    use_sitemap_paths = False
    custom_qs = None
    priority = 1

    def __init__(self, use_sitemap_paths=False) -> None:
        super().__init__()
        self.use_sitemap_paths = use_sitemap_paths

    def items(self):
        if self.custom_qs:
            return self.custom_qs
        return self.qs()

    def qs(self):
        fields = ['slug']
        if self.use_sitemap_paths:
            for field in self.model.sitemap_paths.values():
                if type(field) is str:
                    fields.append(field)
                else:
                    fields += field
        qs = self.model.objects.only(*fields)
        if LANGUAGE == settings.DEFAULT_LANGUAGE:
            qs = qs.annotate(text_len=Length('description')).filter(
                text_len__gte=SYMBOLS_MIN, added__gte=GAMES_MIN_ADDED
            )
        return qs


class GamesFiltersSitemap(ProjectSitemap):
    priority = 0.9
    data = None
    bulk = 2000
    min_games = GAMES_LIST_MIN_GAMES_FOR_INDEX

    def run(self):
        platforms = Platform.objects.values_list('id', 'slug')
        genres = Genre.objects.visible().values_list('id', 'slug')
        stores = Store.objects.values_list('id', 'slug')
        years = Game.get_years()

        select = 'select distinct games_game.id, %s from games_game'
        join_platforms = 'inner join games_gameplatform on games_game.id = games_gameplatform.game_id'
        join_stores = 'inner join games_gamestore on games_game.id = games_gamestore.game_id'
        join_genres = 'inner join games_game_genres on games_game.id = games_game_genres.game_id'
        where_platform = 'games_gameplatform.platform_id = %s'
        where_store = 'games_gamestore.store_id = %s'
        where_genre = 'games_game_genres.genre_id = %s'
        where_year = 'games_game.released between %s and %s'
        limit = f'limit {self.min_games}'

        allowed_years = range(2018, now().year + 1)
        elements = {
            'platform': [('platform', e) for e in platforms],
            'genre': [('genre', e) for e in genres],
            'store': [('store', e) for e in stores],
            'year': [
                ('year', ([date(year=e, day=1, month=1), date(year=e, day=31, month=12)], e))
                for e in years
                if e in allowed_years
            ],
        }
        joins = {
            'platform': join_platforms,
            'store': join_stores,
            'genre': join_genres,
            'year': '',
        }
        wheres = {
            'platform': where_platform,
            'store': where_store,
            'genre': where_genre,
            'year': where_year,
        }
        variants = [
            # ['platform', 'store', 'genre', 'year'],
            # ['platform', 'store', 'genre'],
            # ['platform', 'store', 'year'],
            ['platform', 'genre', 'year'],
            # ['platform', 'store'],
            ['platform', 'genre'],
            ['platform', 'year'],
            # ['store', 'genre', 'year'],
            # ['store', 'genre'],
            # ['store', 'year'],
            ['genre', 'year'],
            ['platform'],
            ['store'],
            ['genre'],
            ['year'],
        ]
        products = []
        for variant in variants:
            args = []
            for element in variant:
                args.append(elements[element])
            products += product(*args)

        queries = []
        for variant in products:
            variant_joins = []
            variant_where = []
            variant_url = []
            variant_args = []
            for element, value in variant:
                variant_joins.append(joins[element])
                variant_where.append(wheres[element])
                variant_url.append(str(value[1]))
                variant_args += value[0] if type(value[0]) is list else [value[0]]
            queries.append([
                f'{select} {" ".join(variant_joins)} where {" and ".join(variant_where)} {limit}',
                [f'/games/{"/".join(variant_url)}'] + variant_args,
            ])

        counts = {}
        with connection.cursor() as cursor:
            for i, data in enumerate(split(queries, self.bulk)):
                if settings.ENVIRONMENT != 'TESTS':
                    print(f'GamesFiltersSitemap {i * self.bulk} of {len(queries)}')
                sql = ') union ('.join(el[0] for el in data)
                args = []
                for el in data:
                    args += el[1]
                cursor.execute(f'({sql})', args)
                for _, slug in cursor.fetchall():
                    counts[slug] = counts.get(slug, 0) + 1

        items = []
        for _, (url, *_) in queries:
            if counts.get(url, 0) >= self.min_games:
                items.append(url)

        return items

    def items(self):
        if not self.data:
            self.data = self.run()
        return self.data

    def location(self, item):
        return item


class CollectionsSitemap(ProjectSitemap):
    model = Collection

    def items(self):
        qs = self.model.objects.indexed().only('slug', 'games_count').prefetch_related(
            Prefetch('collectionfeed_set', CollectionFeed.objects.only('collection_id', 'text_bare'))
        )
        if LANGUAGE_MODE_INCLUDE:
            qs = qs.filter(language=LANGUAGE)
        else:
            qs = qs.exclude(language__in=OTHER_LANGUAGES)
        if LANGUAGE == settings.DEFAULT_LANGUAGE:
            data = []
            for collection in qs.iterator():
                if (
                    collection.games_count < ELEMENTS_MIN_ADDED
                    and sum(len(cf.text_bare) for cf in collection.collectionfeed_set.all()) < SYMBOLS_MIN
                ):
                    continue
                data.append(collection)
            qs = data
        return qs

    def lastmod(self, item):
        return getattr(item, 'updated')


class ReviewsSitemap(ProjectSitemap):
    model = Review

    def items(self):
        qs = self.model.objects.visible().filter(is_text=True).only('id')
        if LANGUAGE_MODE_INCLUDE:
            qs = qs.filter(language=LANGUAGE)
        else:
            qs = qs.exclude(language__in=OTHER_LANGUAGES)
        if LANGUAGE == settings.DEFAULT_LANGUAGE:
            qs = qs.annotate(text_len=Length('text_bare')).filter(text_len__gte=SYMBOLS_MIN)
        return qs

    def lastmod(self, item):
        return getattr(item, 'edited')


class DiscussionsSitemap(ProjectSitemap):
    model = Discussion

    def items(self):
        qs = self.model.objects.visible().only('id')
        if LANGUAGE_MODE_INCLUDE:
            qs = qs.filter(language=LANGUAGE)
        else:
            qs = qs.exclude(language__in=OTHER_LANGUAGES)
        if LANGUAGE == settings.DEFAULT_LANGUAGE:
            qs = qs.annotate(text_len=Length('text_bare')).filter(text_len__gte=SYMBOLS_MIN)
        return qs

    def lastmod(self, item):
        return getattr(item, 'edited')


class PersonsSitemap(ProjectSitemap):
    model = Person

    def items(self):
        qs = self.model.objects.visible().only('slug')
        if LANGUAGE == settings.DEFAULT_LANGUAGE:
            qs = qs.annotate(text_len=Length('auto_description')).filter(
                Q(text_len__gte=SYMBOLS_MIN) | Q(games_count__gte=ELEMENTS_MIN_ADDED)
            )
        return qs


class UsersSitemap(ProjectSitemap):
    model = get_user_model()

    def items(self):
        return self.model.objects.get_index_users().only('slug')


class SuggestionsSitemap(ProjectSitemap):
    model = Suggestion

    def items(self):
        return super().items().only('slug')


class TagsSitemap(ProjectSitemap):
    model = Tag

    def items(self):
        qs = self.model.objects.visible().only('slug').filter(games_count__gt=5)
        if LANGUAGE_MODE_INCLUDE:
            qs = qs.filter(language=LANGUAGE)
        else:
            qs = qs.exclude(language__in=OTHER_LANGUAGES)
        return qs


class DeveloperSitemap(ProjectSitemap):
    model = Developer

    def items(self):
        return self.model.objects.visible().only('slug')


class PublishersSitemap(ProjectSitemap):
    model = Publisher

    def items(self):
        return self.model.objects.visible().only('slug')


class ImagesSitemap(Sitemap):
    limit = 15000
    sitemap_template = 'sitemaps/images.xml'
    data = None
    chunk_size = 2000
    cursor_name = 'screenshots'
    custom_qs = None

    def items(self):
        if self.custom_qs:
            return self.custom_qs
        if not self.data:
            self.data = self.run()
        return self.data

    def run(self, random=False, limit=None, exclude=None):
        data = []
        count = 0
        total = Game.objects.count()

        ordering = []
        for field in ScreenShot._meta.ordering:
            desc = ''
            if field.startswith('-'):
                desc = ' desc'
                field = field[1:]
            ordering.append(f'"{field}"{desc}')
        with connection.cursor() as cursor:
            cursor.execute(f'''
                declare {self.cursor_name} no scroll cursor with hold for
                select string_agg(sub.image, ' '), id, slug, name, movies_count from
                (
                    select game_id, image
                    from games_screenshot
                    where hidden is false
                    order by game_id, {', '.join(ordering)}
                ) sub
                left join games_game on game_id = games_game.id
                group by id, slug, name, movies_count
                {'order by random()' if random else ' '}
            ''')
            while True:
                cursor.execute(f'fetch {self.chunk_size} from screenshots')
                chunk = cursor.fetchall()
                if not chunk:
                    break
                if limit and len(data) >= limit:
                    break
                for images, pk, slug, name, movies_count in chunk:
                    if exclude and pk in exclude:
                        continue
                    fake_request = fake_request_by_language(LANGUAGE_ISO2)
                    seo_data = game_screenshot(pk, name, fake_request)
                    game = Game()
                    game.id = pk
                    game.slug = slug
                    game.custom_url = f'/games/{slug}/screenshots'
                    game.images = []
                    for image in images.split(' '):
                        if not image:
                            continue
                        game.images.append({
                            'loc': self.location_image(image),
                            'title': seo_data['seo_title'],
                            'caption': seo_data['seo_description'],
                        })
                    data.append(game)
                    if limit and len(data) >= limit:
                        break
                if settings.ENVIRONMENT != 'TESTS':
                    count += 1
                    print(f'ImagesSitemap {count * self.chunk_size} of {total}')
            cursor.execute(f'close {self.cursor_name}')
        return data

    def location(self, obj):
        if self.custom_qs:
            return f'/games/{obj.slug}/screenshots'
        return obj.custom_url

    def location_image(self, img):
        return f'{settings.MEDIA_URL}resize/1920/-/{img}'


class SoftwareSitemap(ProjectSitemap):
    model = Software

    def items(self):
        return self.model.objects.only('id')


version = '1'
sitemaps = {
    f'static{version}': StaticSitemap(),
    f'games{version}': GamesSitemap(settings.STATICSITEMAPS_ALL_SITEMAPS),
    f'collections{version}': CollectionsSitemap(),
    f'reviews{version}': ReviewsSitemap(),
    f'discussions{version}': DiscussionsSitemap(),
    f'persons{version}': PersonsSitemap(),
    f'games-filters{version}': GamesFiltersSitemap(),
}
if LANGUAGE_ISO2 == settings.LANGUAGE_RU:
    sitemaps[f'software'] = SoftwareSitemap()

# disabled:
# sitemaps['amp-games'] = AMPGamesSitemap()
# sitemaps['suggestions'] = SuggestionsSitemap()
# sitemaps['users'] = UsersSitemap()
# sitemaps['tags'] = TagsSitemap()
# sitemaps['developers'] = DeveloperSitemap()
# sitemaps['publishers'] = PublishersSitemap()
# if LANGUAGE_ISO2 == settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
#     sitemaps['screenshots'] = ImagesSitemap()
