import hashlib
from collections import defaultdict
from typing import Optional

from bs4 import BeautifulSoup
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db.models import Model
from django.forms import DateField
from django.utils.html import strip_tags
from django.utils.text import Truncator
from django.utils.timezone import now
from modeltranslation.utils import fallbacks, get_language
from rest_framework.request import Request

from api.games import formats
from apps.common.cache import CommonContentType
from apps.common.models import CatalogFilter, List
from apps.games.cache import GameMinYear, GameYearsCounts, PlatformParentListByPlatform
from apps.games.models import Collection, Developer, Game, Genre, Platform, PlatformParent, Publisher, Store, Tag
from apps.utils.api import int_or_none
from apps.utils.models import LanguageModel
from apps.utils.strings import markdown

COMMON_DESCRIPTION = defaultdict(lambda: 'AG is the site dedicated to videogames. '
                                         'One of the most complete game databases, based on players personal experience')
COMMON_DESCRIPTION[settings.LANGUAGE_RU] = ('AG - это сайт для изучения видеоигр. '
                                            'Самая полная база данных, основанная на личном опыте игрока.')

SUBS = {
    'game': [
        ('screenshots', 'Screenshots'),
        ('imgur', 'Images'),
        ('twitch', 'Streams'),
        ('youtube', 'Videos'),
        ('reviews', 'Reviews'),
        ('posts', 'Comments'),
        ('collections', 'In collections'),
        ('suggestions', 'Games similar to'),
        ('achievements', 'Achievements'),
        ('reddit', 'Posts from Reddit'),
        ('team', 'Team'),
        ('cheats', 'Cheats'),
        ('demos', 'Demos'),
        ('patches', 'Patches'),
        ('review', 'Review'),
    ],
}

GAMES_LIST_MIN_GAMES_FOR_INDEX = 20


def detect_noindex(obj: LanguageModel, request: Request, language: str = ''):
    if not language:
        language = obj.language
    if language == request.LANGUAGE_CODE_ISO3:
        return False
    if request.LANGUAGE_CODE == settings.MODELTRANSLATION_DEFAULT_LANGUAGE:
        return language in settings.LANGUAGES_2_TO_3.values()
    return True


def lists(cls, request):
    try:
        row = List.objects.get(content_type=CommonContentType().get(cls))
    except List.DoesNotExist:
        return {}
    sub_rows = {
        settings.LANGUAGE_EN: 'video game discovery site',
        settings.LANGUAGE_RU: 'сайт для изучения видеоигр',
    }
    title = row.title if row.title else f'{row.name} — {sub_rows.get(request.LANGUAGE_CODE)}'
    description = (
        trunc(row.description) if row.description
        else f'{row.name} — {COMMON_DESCRIPTION[request.LANGUAGE_CODE]}'
    )
    return {
        'description': row.description,
        'seo_title': title,
        'seo_description': description,
        'seo_h1': row.name,
    }


def person(name, positions, request, auto_description=None):
    positions = ', '.join(positions)
    if auto_description:
        seo_description = trunc(auto_description)
    else:
        seo_description = f'{name} - {positions}. {COMMON_DESCRIPTION[request.LANGUAGE_CODE]}'
    return {
        'seo_title': f'{name} - {positions}',
        'seo_description': seo_description,
        'seo_h1': name,
    }


def collection(obj: Collection, request: Request):
    description = trunc(obj.description, truncate='') if obj.description else obj.name.rstrip('.')
    description = f'{description}. {COMMON_DESCRIPTION[request.LANGUAGE_CODE]}'
    noindex = detect_noindex(obj, request) if not obj.noindex else True
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'{obj.name} - список игр от от {obj.creator.visible_name} на Absolute Games',
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': obj.name,
            'noindex': noindex,
        }
    return {
        'seo_title': f'{obj.name} - a list of games by {obj.creator.visible_name} on Absolute Games',
        'seo_description': description,
        'seo_keywords': '',
        'seo_h1': obj.name,
        'noindex': noindex,
    }


class SeoElement:
    id = None
    slug = None
    qs = None
    obj = None
    model = None

    def __init__(self, items, model):
        self.model = model
        if items:
            if type(items[0]) is int:
                self.id = items[0]
                kwargs = {'id': self.id}
            else:
                self.slug = items[0]
                kwargs = {'slug': self.slug}
            self.qs = model.objects.filter(**kwargs)

    def __str__(self):
        if not self.check():
            return ''
        return self.obj.name

    def check(self):
        if not self.qs or not (self.id or self.slug):
            return None
        if not self.obj:
            self.obj = self.qs.first()
            if self.obj:
                hide_description(self.obj)
        return (self.id or self.slug) and self.obj

    @property
    def kwargs(self):
        name = self.model._meta.model_name.lower()
        if self.id:
            return {f'{name}_id': self.id}
        if self.slug:
            return {f'{name}__slug': self.slug}
        return {f'{name}_id': None}


class GamesStringsEn:
    available_at = ' Available at {store}'
    year = ' of {years}'
    games = 'Games'
    games_platform = 'Games for {platform}'
    games_genre = '{genre} Games'
    games_store = 'Games Available at {store}'
    games_tag = '{tag} Games'
    games_developer = 'Developed by {developer}'
    games_publisher = 'Published by {publisher}'
    games_years = 'Games of {years}'
    best = 'Best {seo_h1}'
    best_platform = '{platform} Games | Best Games for {platform}'
    best_genre = 'Best {genre} Games'
    best_store = 'Best Games Available at {store}'
    best_tag = '{tag} - List of Best Games on AG'
    best_developer = '{developer} - List of Developer\'s Best Games on AG'
    best_publisher = '{publisher} - List of Publisher\'s Best Games on AG'
    best_years = 'Best Games of {years}'
    description = (
        '{count} - {seo_title}. Full description of games, rating and reviews.'
    )
    description_platform = (
        '{count} - сatalog of {platform} games. '
        'Best games for {platform} - full description of games, rating and reviews.'
    )
    description_genre = (
        '{count} - сatalog of {genre} games. '
        'Best {genre} games - full description of games, rating and reviews.'
    )
    description_store = (
        '{count} - сatalog of games on {store}. '
        'Best games on {store} - full description of games, rating and reviews.'
    )
    description_tag = (
        '{count} - {seo_title}. {common_description}'
    )
    description_developer = (
        '{seo_h1} on AG ✔ Video game discovery site ✔ '
        'The most comprehensive database that is powered by personal player experiences'
    )
    description_publisher = (
        '{seo_h1} on AG ✔ Video game discovery site ✔ '
        'The most comprehensive database that is powered by personal player experiences'
    )
    description_years = (
        '{count} - сatalog of games {years}. '
        'Best games of {years} - full description of games, rating and reviews.'
    )


class GamesStringsRu:
    available_at = ' Доступно в {store}'
    year = ' {years}'
    games = 'Игры'
    games_platform = 'Игры на {platform}'
    games_genre = 'Игры с жанром {genre}'
    games_store = 'Игры доступные на {store}'
    games_tag = 'Игры с тегом {tag}'
    games_developer = 'Разработано {developer}'
    games_publisher = 'Издано {publisher}'
    games_years = 'Игры {years}'
    best = 'Лучшее {seo_h1}'
    best_platform = 'Игры на {platform} | Лучшие игры для {platform}'
    best_genre = 'Лучшие игры в жанре {genre}'
    best_store = 'Лучшие игры доступные в {store}'
    best_tag = '{tag} - Список лучших игр на Absolute Games'
    best_developer = '{developer} - Список лучших игр разработчика на Absolute Games'
    best_publisher = '{publisher} - Список лучших игр издателя на Absolute Games'
    best_years = 'Лучшие игры {years}'
    description = (
        '{count} - {seo_title}. Полные описания игр, рейтинги и отзывы.'
    )
    description_platform = (
        '{count} - каталог игр для {platform}. '
        'Лучшие игры для {platform} - полные описания игр, рейтинги и отзывы.'
    )
    description_genre = (
        '{count} - каталог игр с жанром {genre}. '
        'Лучшие игры жанра {genre}  - полные описания игр, рейтинги и отзывы.'
    )
    description_store = (
        '{count} - каталог игр на {store}. '
        'Лучшие игры в {store} - полные описания игр, рейтинги и отзывы.'
    )
    description_tag = (
        '{count} - {seo_title}. {common_description}'
    )
    description_developer = (
        '{seo_h1} на Absolute Games ✔ Сайт для изучения видеоигр ✔ '
        'Самая полная база данных, основанная на личном опыте игрока.'
    )
    description_publisher = (
        '{seo_h1} на Absolute Games ✔ Сайт для изучения видеоигр ✔ '
        'Самая полная база данных, основанная на личном опыте игрока.'
    )
    description_years = (
        '{count} - каталог игр {years}. '
        'Лучшие игры {years} - полные описания игр, рейтинги и отзывы.'
    )


def games(parent_platforms, platforms, genres, stores, tags, developers, publishers, dates, count, request):
    parent_platform = SeoElement(parent_platforms, PlatformParent)
    platform = SeoElement(platforms, Platform)
    genre = SeoElement(genres, Genre)
    store = SeoElement(stores, Store)
    tag = SeoElement(tags, Tag)
    developer = SeoElement(developers, Developer)
    publisher = SeoElement(publishers, Publisher)
    year = None
    years = []
    if dates:
        for date in dates:
            if date[0].year == date[1].year:
                years.append(str(date[0].year))
                if not year:
                    year = date[0].year
            else:
                years.append(f'{date[0].year}-{date[1].year}')
        years = ', '.join(years)
        if years and not year:
            year = -1

    def check(strict=True):
        data = [platform.check(), parent_platform.check(), genre.check(), store.check(), years]
        if not strict:
            data += [tag.check(), developer.check(), publisher.check()]
        return len([i for i in data if i])

    seo_h1 = ''
    seo_title = ''
    seo_description = ''
    description = ''
    try:
        kwargs = {'year': year}
        kwargs.update(parent_platform.kwargs)
        kwargs.update(platform.kwargs)
        kwargs.update(genre.kwargs)
        kwargs.update(store.kwargs)
        kwargs.update(tag.kwargs)
        kwargs.update(developer.kwargs)
        kwargs.update(publisher.kwargs)
        with fallbacks(False):
            row = CatalogFilter.objects.get(**kwargs)
        if row.name:
            seo_h1 = row.name
        if row.title:
            seo_title = row.title
        if row.description:
            description = markdown(row.description)
            seo_description = trunc(description)
    except CatalogFilter.DoesNotExist:
        pass

    checked = check(False)
    if not platform.check() and parent_platform.check():
        platform = parent_platform
        parent_platform = SeoElement([], PlatformParent)

    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        strings = GamesStringsRu()
    else:
        strings = GamesStringsEn()

    if not seo_h1:
        if checked > 1:
            pre_platform = f'{platform} ' if platform.check() else ''
            pre_genre = f'{genre} ' if genre.check() else ''
            pre_tag = f'{tag} ' if tag.check() else ''
            pre_developer = f'{developer} ' if developer.check() else ''
            pre_publisher = f'{publisher} ' if publisher.check() else ''
            pre = f'{pre_tag}{pre_developer}{pre_publisher}{pre_platform}{pre_genre}'
            on_store = strings.available_at.format(store=store) if store.check() else ''
            by_year = strings.year.format(years=years) if years else ''
            seo_h1 = f'{pre}{strings.games}{by_year}{on_store}'
        elif platform.check():
            seo_h1 = strings.games_platform.format(platform=platform)
        elif genre.check():
            seo_h1 = strings.games_genre.format(genre=genre)
        elif store.check():
            seo_h1 = strings.games_store.format(store=store)
        elif tag.check():
            seo_h1 = strings.games_tag.format(tag=tag)
        elif developer.check():
            seo_h1 = strings.games_developer.format(developer=developer)
        elif publisher.check():
            seo_h1 = strings.games_publisher.format(publisher=publisher)
        elif years:
            seo_h1 = strings.games_years.format(years=years)
    if not seo_title:
        common_title = strings.best.format(seo_h1=seo_h1)
        if checked > 1:
            seo_title = common_title
        elif platform.check():
            seo_title = strings.best_platform.format(platform=platform)
        elif genre.check():
            seo_title = strings.best_genre.format(genre=genre)
        elif store.check():
            seo_title = strings.best_store.format(store=store)
        elif tag.check():
            seo_title = strings.best_tag.format(tag=tag)
        elif developer.check():
            seo_title = strings.best_developer.format(developer=developer)
        elif publisher.check():
            seo_title = strings.best_publisher.format(publisher=publisher)
        elif years:
            seo_title = strings.best_years.format(years=years)
    if not seo_description:
        common_description = strings.description.format(count=count, seo_title=seo_title)
        if checked > 1:
            seo_description = common_description
        elif platform.check():
            seo_description = strings.description_platform.format(count=count, platform=platform)
        elif genre.check():
            seo_description = strings.description_genre.format(count=count, genre=genre)
        elif store.check():
            seo_description = strings.description_store.format(count=count, store=store)
        elif tag.check():
            seo_description = strings.description_tag.format(
                count=count, tag=tag, seo_title=seo_title,
                common_description=COMMON_DESCRIPTION[request.LANGUAGE_CODE]
            )
        elif developer.check():
            seo_description = strings.description_developer.format(seo_h1=seo_h1)
        elif publisher.check():
            seo_description = strings.description_publisher.format(seo_h1=seo_h1)
        elif years:
            seo_description = strings.description_years.format(count=count, years=years)
    if not description:
        if checked <= 1:
            elements = [parent_platform, platform, genre, store, tag, developer, publisher]
            for element in elements:
                if not element.check():
                    continue
                obj = element.obj
                if element.model is PlatformParent and not obj.description:
                    try:
                        obj = Platform.objects.get(parent=obj)
                    except (Platform.MultipleObjectsReturned, Platform.DoesNotExist):
                        continue
                if not getattr(obj, f'description_{request.LANGUAGE_CODE}', None):
                    continue
                description = markdown(obj.description)
                seo_description = trunc(description)
                break

    checked_strict = check()
    no_index = True
    if count >= GAMES_LIST_MIN_GAMES_FOR_INDEX:
        if checked_strict == 0:
            no_index = False
            if checked == 1 and tag.check():
                no_index = detect_noindex(tag.obj, request)
        elif checked_strict == 1 and checked == 1 and (not year or 2018 <= year <= now().year):
            no_index = False
        elif checked_strict == 2 and checked == 2 and (
            (platform.check() and genre.check())
            or (platform.check() and year and 2018 <= year <= now().year)
            or (genre.check() and year and 2018 <= year <= now().year)
        ):
            no_index = False
        elif (
            checked_strict == 3 and checked == 3
            and platform.check() and genre.check() and year and 2018 <= year <= now().year
        ):
            no_index = False

    return {
        'seo_title': seo_title,
        'seo_description': seo_description,
        'seo_keywords': '',
        'seo_h1': seo_h1,
        'noindex': no_index,
        'nofollow': no_index or checked > checked_strict,
        'description': description,
    }


def games_list_seo(request, response, count, search=None):
    parent_platforms = request.GET.get('parent_platforms')
    if parent_platforms:
        parent_platforms = [i for i in map(int_or_none, parent_platforms.split(',')) if i]

    platforms = request.GET.get('platforms')
    if platforms:
        platforms = [i for i in map(int_or_none, platforms.split(',')) if i]

    stores = request.GET.get('stores')
    if stores:
        stores = [i for i in map(int_or_none, stores.split(',')) if i]

    items = {}
    for el, els in (('genre', 'genres'), ('tag', 'tags'), ('developer', 'developers'), ('publisher', 'publishers')):
        items[els] = request.GET.get(els)
        if not items[els]:
            continue
        items_data = items[els].split(',')
        if not items_data:
            continue
        is_id = items_data[0].isdigit()
        if is_id:
            items_data = map(int_or_none, items[els].split(','))
        items[els] = [i for i in items_data if i]

    dates = request.GET.get('dates')
    if dates:
        pairs = dates.split('.')
        dates = []
        for pair in pairs:
            try:
                from_date, to_date = pair.split(',', maxsplit=1)
            except ValueError:
                continue
            if not from_date or not to_date:
                continue
            date_field = DateField()
            try:
                from_date = date_field.to_python(from_date)
                to_date = date_field.to_python(to_date)
            except ValidationError:
                continue
            dates.append([from_date, to_date])

    response.data.update(games(
        parent_platforms, platforms, items.get('genres'), stores, items.get('tags'),
        items.get('developers'), items.get('publishers'), dates, count, request
    ))

    if search:
        games_list_filters(request, response, search)
    else:
        games_list_filters_default(request, response)


def games_list_filters(request, response, facets):
    flat_years = dict(facets['released_year'])
    no_follow = response.data['nofollow']
    del response.data['nofollow']

    # all

    for key, value in facets.items():
        facets[key] = []
        for pk, count in value:
            facets[key].append({
                'id': int(pk),
                'count': count,
                'nofollow': True if key == 'stores' else no_follow,
            })

    # years

    min_year = GameMinYear().get()
    facets['years'] = formats.years(sorted(
        year['id'] for year in facets['released_year'] if year['id'] > min_year
    ))
    games_list_years(facets['years'], flat_years, request, no_follow)
    del facets['released_year']

    # platforms

    parents_all = PlatformParentListByPlatform().get()
    parents = {}
    for platform in facets['platforms']:
        parent = parents_all.get(platform['id'])
        if not parent:
            continue
        parents.setdefault(parent.id, []).append(platform)
    for parent_platform in facets['parent_platforms']:
        parent_platform['platforms'] = parents.get(parent_platform['id'], [])
    del facets['platforms']

    # genres

    facets['genres'] = facets['genres_ids']
    del facets['genres_ids']

    response.data['filters'] = facets


def games_list_filters_default(request, response):
    years_counts = GameYearsCounts().get()
    flat_years = dict(years_counts)
    response.data['filters'] = {
        'years': formats.years(year for year, _ in years_counts),
    }
    response.data['nofollow_collections'] = ['stores']
    games_list_years(response.data['filters']['years'], flat_years, request, response.data['noindex'])


def games_list_years(years, flat_years, request, no_follow):
    for group in years:
        total = 0
        for year in group['years']:
            year['count'] = flat_years.get(year['year'])
            year['nofollow'] = True
            if not no_follow and 2018 <= year['year'] <= now().year and not request.GET.get('stores'):
                year['nofollow'] = False
            total += year['count']
        group['nofollow'] = True
        group['count'] = total


def game(game_obj, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return game_ru(game_obj)
    return game_en(game_obj)


game_ru_titles = {
    'screenshots':
        '{name} - фото и скриншоты игры на рабочий стол',
    'imgur':
        '{name} картинки',
    'twitch':
        'Стримы {name} Twitch - смотреть онлайн прохождение',
    'youtube':
        'Видео {name}: прохождение, видео обзоры, как играть, трейлеры, геймплей',
    'reviews':
        'Отзывы для игры {name} ',
    'posts':
        'Посты от игры {name}',
    'collections':
        'Коллекции с игрой {name}',
    'suggestions':
        'Игры похожие на {name}',
    'achievements':
        'Достижения игры {name}',
    'reddit':
        '{name} Reddit',
    'team':
        'Разработчики игры {name}',
    'cheats':
        'Читы {name} сохранения, секреты, подсказки и коды по прохождению игры {name}',
    'demos':
        'Демо-версия для игры {name} на AG.ru',
    'patches':
        'Скачать патчи и дополнения для игры {name}',
    'review':
        '{name} - рецензия и обзор на игру на AG.ru',
}

game_ru_descriptions = {
    'screenshots':
        'Более {screenshots_count} фото к игре {name} - скриншоты на рабочий стол в высоком качестве, HD картинки',
    'imgur':
        '{name} картинки',
    'twitch':
        '{name} Twitch',
    'youtube':
        'Смотреть онлайн более {movies_count} видео об игре {name} - трейлеры, как играть, прохождение, видео обзоры',
    'reviews':
        'Отзывы для игры {name} ',
    'posts':
        'Посты от игры {name}',
    'collections':
        'Коллекции с игрой {name}',
    'suggestions':
        'Игры похожие на {name}',
    'achievements':
        'Достижения игры {name}',
    'reddit':
        '{name} Reddit',
    'team':
        'Разработчики игры {name}',
    'cheats':
        'На сайте представлен самый полный список '
        'читов и кодов к игре {name}. Вы можете скачать у нас трейнеры и '
        'сохраненные игры (сейвы) бесплатно и без регистрации. Советы и подсказки '
        'по прохождению игры {name} на AG.ru.',
    'demos':
        'Вы можете бесплатно скачать демо-версию игры {name} с нашего сайта прямо сейчас и без регистрации.',
    'patches':
        'Вы можете без регистрации скачать все патчи для игры {name}. На сайте AG.ru собрана полная база патчей, '
        'дополнений, русификаторов, модов и обновлений для игры {name}.',
    'review':
        'Рецензия на Grand {name}. Иными словами, обзор, review.',
}

game_ru_keywords = {
    'screenshots':
        '{name} компьютерные игры game screenshots скриншоты галерея gallery',
    'imgur':
        '{name} картинки imgur',
    'twitch':
        '{name} twitch',
    'youtube':
        'скачать бесплатно {name} компьютерные игры ролики видео видеоролики games videos '
        'trailers movies download',
    'reviews':
        '{name} отзывы',
    'posts':
        '{name} посты',
    'collections':
        '{name} коллекции',
    'suggestions':
        '{name} похожие',
    'achievements':
        '{name} достижения ачивки',
    'reddit':
        '{name} reddit',
    'team':
        '{name} разработчики создатели',
    'cheats':
        '{name} компьютерные игры коды к играм прохождения трейнеры тренеры trainers cheats codes cheat-codes '
        'solutions hacks советы hints редакторы editors',
    'demos':
        'скачать бесплатно {name} компьютерные игры демо демка демо-версии demo видео demos games full versions '
        'полные версии download',
    'patches':
        'скачать бесплатно {name} компьютерные игры патч патчи patch patches download',
    'review':
        'компьютерные игры {name} рецензия обзор review game screenshots скриншоты',
}

game_ru_h1 = {
    'screenshots': '{name} скриншоты игры',
    'imgur': '{name} картинки',
    'twitch': '{name} Twitch',
    'youtube': '{name} видео',
    'reviews': '{name} отзывы',
    'posts': '{name} посты',
    'collections': '{name} коллекции',
    'suggestions': '{name} похожие',
    'achievements': '{name} достижения',
    'reddit': '{name} Reddit',
    'team': '{name} разработчики',
    'cheats': '{name} читы',
    'demos': '{name} демо игры',
    'patches': '{name} патчи игры',
    'review': '{name} обзор игры',
}


def game_ru(game_obj: Game):
    name = game_obj.name
    titles = {}
    descriptions = {}
    keywords = {}
    h1s = {}
    platforms = ', '.join(platform['platform']['name'] for platform in game_obj.platforms_json or [])
    for slug, _ in subs('game'):
        titles[slug] = (game_ru_titles.get(slug) or '{name}').format(
            name=name, screenshots_count=game_obj.screenshots_count, movies_count=game_obj.movies_count,
        )
        descriptions[slug] = (game_ru_descriptions.get(slug) or '{name}').format(
            name=name, screenshots_count=game_obj.screenshots_count, movies_count=game_obj.movies_count,
        )
        keywords[slug] = (game_ru_keywords.get(slug) or '{name}').format(name=name.lower())
        h1s[slug] = (game_ru_h1.get(slug) or '{name}').format(name=name)

    seo = {
        'seo_h1': name,
        'seo_keyword':
            f'{name.lower()} компьютерные игры games коды прохождения cheats codes solutions демо-версии '
            f'демки demos видео ролики videos trailers скриншоты screenshots',
        'seo_titles': titles,
        'seo_descriptions': descriptions,
        'seo_keywords': keywords,
        'seo_h1s': h1s,
    }

    if game_obj.is_playable:
        seo.update(
            {
                'seo_title': f'Игра {name} - играть онлайн бесплатно на AG.ru',
                'seo_description': f'Играть в браузерную игру {name} онлайн бесплатно и без регистрации на '
                                   f'портале AG.ru. Полная информация об игре, как играть, системные требования '
                                   f'и отзывы игроков. Играй в {name} прямо сейчас!',
                'og_title': name,
                'og_description': game_obj.description[:250]
            }
        )
    else:
        seo.update(
            {
                'seo_title': f'{name} вся информация об игре, читы, дата выхода, системные требования, '
                             f'купить игру {name}',
                'seo_description': f'Вся информация об игре {name}: дата выхода на {platforms} читы, патчи и '
                                   f'дополнения, рецензии, системные требования, видео, фото'
            }
        )
    return seo


game_en_titles = {
    'screenshots':
        '{name} screenshots • AG',
    'imgur':
        '{name} images • AG',
    'twitch':
        '{name} streams from Twitch • AG',
    'youtube':
        '{name} videos • AG',
    'reviews':
        '{name} reviews • AG',
    'posts':
        '{name} comments • AG',
    'collections':
        'Collections with {name} • AG',
    'suggestions':
        'Games like {name} • Games similar to {name} • AG',
    'achievements':
        '{name} achievements • AG',
    'reddit':
        '{name} posts from Reddit • AG',
    'team':
        '{name} created by • AG',
    'cheats':
        '',
    'demos':
        '',
    'patches':
        '',
    'review':
        '',
}

game_en_keywords = {
    'screenshots':
        '',
    'imgur':
        '',
    'twitch':
        '',
    'youtube':
        '',
    'reviews':
        '',
    'posts':
        '',
    'collections':
        '',
    'suggestions':
        '',
    'achievements':
        '',
    'reddit':
        '',
    'team':
        '',
    'cheats':
        '',
    'demos':
        '',
    'patches':
        '',
    'review':
        '',
}

game_en_h1 = {
    'screenshots': '{name} screenshots',
    'imgur': '{name} images',
    'twitch': '{name} streams',
    'youtube': '{name} videos',
    'reviews': '{name} reviews',
    'posts': '{name} comments',
    'collections': 'Collections with {name}',
    'suggestions': 'Games like {name}',
    'achievements': '{name} achievements',
    'reddit': '{name} posts',
    'team': '{name} created by',
    'cheats': '',
    'demos': '',
    'patches': '',
    'review': '',
}


def game_en(game_obj):
    name, description, game_slug = game_obj.name, game_obj.description, game_obj.slug
    titles = {}
    descriptions = {}
    keywords = {}
    h1s = {}
    game_description_seo = ''.join([
        'on AG ✔ Video game discovery site ✔ ',
        'The most comprehensive database that is powered by personal player experiences'
    ])
    for slug, sub_name in subs('game'):
        # title
        titles[slug] = (game_en_titles.get(slug) or '{name}').format(
            name=name, screenshots_count=game_obj.screenshots_count, movies_count=game_obj.movies_count,
        )
        # descriptions
        if slug == 'suggestions':
            description_text = f'{sub_name.rstrip(".")} {name} {game_description_seo}'
        elif slug == 'reddit':
            description_text = f'{name} {sub_name.rstrip(".")} {game_description_seo}'
        else:
            description_text = f'{name} {sub_name.lower().rstrip(".")} {game_description_seo}'
        descriptions[slug] = description_text
        # keywords
        keywords[slug] = (game_en_keywords.get(slug) or '{name}').format(name=name.lower())
        # h1
        h1s[slug] = (game_en_h1.get(slug) or '{name}').format(name=name)
    seo_title = f'{name} - release date, videos, screenshots, reviews on AG'

    if game_slug == 'space-hulk-tactics':
        # https://3.basecamp.com/3964781/buckets/9112158/todos/1355531122
        seo_title = 'Game Space Hulk (2018): strategy, тactics game, reviews, discussion about the GameSpace Hulk'

    if description:
        seo_description = trunc(description)
    else:
        seo_description = f'{name} ✔Game Info ✔ Reviews ✔ Screenshots ✔ Videos ✔ '

    return {
        'seo_title': seo_title,
        'seo_description': seo_description,
        'seo_h1': name,
        'seo_titles': titles,
        'seo_descriptions': descriptions,
        'seo_keywords': keywords,
        'seo_h1s': h1s,
    }


def game_item(name, description, request, language=None):
    noindex = bool(language and detect_noindex(None, request, language=language))
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        description = (
            trunc(description) if description
            else f'{name} - Лучшие игры в которые ты сможешь сыграть. '
            'Храни все игры в одном профиле, следи, во что играют друзья, и найди новую классную игру.'
        )
        return {
            'seo_title': name,
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': name,
            'noindex': noindex,
        }
    description = (
        trunc(description) if description
        else f'The best {name} games you can play. '
        f'Keep all games in one profile, see what friends are playing, and find your next great game.'
    )
    return {
        'seo_title': f'List of {name} video games - AG',
        'seo_description': description,
        'seo_keywords': '',
        'seo_h1': f'{name} games',
        'noindex': noindex,
    }


def game_publisher(name, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Список игр от {name}  - Absolute Games',
            'seo_description': (
                f'Игры опубликованные {name} на Absolute Games ✔ Cайт для изучения видеоигр ✔ '
                f'Самая полная база данных, основанная на личном опыте игрока'
            ),
            'seo_keywords': '',
            'seo_h1': f'Игры от {name}',
        }
    return {
        'seo_title': f'List of {name} video games - AG',
        'seo_description': (
            f'{name} Published Games on AG ✔ Video game discovery site ✔ The most comprehensive database'
            f'that is powered by personal player experiences'
        ),
        'seo_keywords': '',
        'seo_h1': f'{name} games',
    }


def game_developer(name, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Список видеоигр от {name} - Absolute Games',
            'seo_description': (
                f'Игры от {name} на Absolute Games ✔ Cайт для изучения видеоигр ✔ '
                f'Самая полная база данных, основанная на личном опыте игрока'
            ),
            'seo_keywords': '',
            'seo_h1': f'Игры от {name}',
        }
    return {
        'seo_title': f'List of {name} video games - AG',
        'seo_description': (
            f'{name} Games on AG ✔ Video game discovery site ✔ The most comprehensive database'
            f'that is powered by personal player experiences'
        ),
        'seo_keywords': '',
        'seo_h1': f'{name} games',
    }


def game_screenshot(pk, name, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Скриншот для {name}, изображение №{pk}',
            'seo_description': f'Скриншот для {name}, изображение №{pk} - Absolute Games',
            'seo_keywords': '',
            'seo_h1': f'Скриншот для {name}, изображение №{pk}',
        }
    return {
        'seo_title': f'{name} screenshot, image №{pk}',
        'seo_description': f'{name} screenshot, image №{pk} - AG',
        'seo_keywords': '',
        'seo_h1': f'{name} screenshot, image №{pk}',
    }


def suggestion(name, description, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        description = (
            trunc(description) if description
            else f'{name} - Лучшие игры в которые ты сможешь сыграть. '
            'Храни все игры в одном профиле, следи, во что играют друзья, и найди новую классную игру.'
        )
        return {
            'seo_title': f'{name} - Рекоммендуемые игры',
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': name,
        }
    description = (
        trunc(description) if description
        else f'The best {name} games you can play. Keep all games in one profile, see what friends are playing, '
        f'and find your next great game.'
    )
    return {
        'seo_title': f'{name} — Recommended Games',
        'seo_description': description,
        'seo_keywords': '',
        'seo_h1': name,
    }


def story(name, slug, background, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_RU:
        return {
            'seo_title': f'Посмотри {name}',
            'seo_description': 'Часы игровых видео и обзоров. Наслаждайтесь Absolute Games TLDR.',
            'seo_keywords': '',
            'seo_h1': name,
            'seo_image': background if slug != 'welcome' else None,
        }
    return {
        'seo_title': f'Watch {name}',
        'seo_description': 'Hours of video games entertainment and discovery. Enjoy AG TLDR.',
        'seo_keywords': '',
        'seo_h1': name,
        'seo_image': background if slug != 'welcome' else None,
    }


def software(name, description, request):
    description = trunc(description) if description else ''
    if request.LANGUAGE_CODE == settings.LANGUAGE_EN:
        return {
            'seo_title': name,
            'seo_description': description,
            'seo_keywords': '',
            'seo_h1': name,
        }
    return {
        'seo_title': f'{name} (скачать, программа, software, download) на AG.ru',
        'seo_description': description,
        'seo_keywords':
            f'{name} компьютерные игры программы software programs download новые версии '
            f'new versions tracker эмуляторы',
        'seo_h1': f'Программа {name}',
    }


def cheat(game_name, category_name, number, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_EN:
        return {
            'seo_title': game_name,
            'seo_description': game_name,
            'seo_keywords': '',
            'seo_h1': game_name,
        }
    return {
        'seo_title': f'{game_name} // {category_name} на AG.ru',
        'seo_description': f'{category_name} для игры {game_name}',
        'seo_keywords':
            f'{game_name.lower()} компьютерные игры коды к играм прохождения трейнеры тренеры trainers cheats codes '
            f'cheat-codes solutions hacks советы hints редакторы editors',
        'seo_h1': f'{game_name} чит-файл №{number}',
    }


def patch(game_name, name, request):
    if request.LANGUAGE_CODE == settings.LANGUAGE_EN:
        return {
            'seo_title': game_name,
            'seo_description': game_name,
            'seo_keywords': '',
            'seo_h1': game_name,
        }
    return {
        'seo_title': f'{game_name} // {name} (патч, patch) на AG.ru',
        'seo_description': f'{game_name}: список зеркал для скачивания файла {name}',
        'seo_keywords':
            f'скачать бесплатно {game_name.lower()} компьютерные игры патч патчи games patch patches download',
        'seo_h1': f'{game_name} {name}',
    }


def demo(game_name, name, description, request):
    description = trunc(description, 35) if description else ''
    if request.LANGUAGE_CODE == settings.LANGUAGE_EN:
        return {
            'seo_title': game_name,
            'seo_description': game_name,
            'seo_keywords': '',
            'seo_h1': game_name,
        }
    return {
        'seo_title': f'{game_name} // {name} (demo) на AG.ru',
        'seo_description': description,
        'seo_keywords':
            f'скачать бесплатно {game_name.lower()} с грузом по европе 3 компьютерные игры демо демка демо-версии '
            f'demo видео demos games full versions полные версии download',
        'seo_h1': f'{game_name} {name}',
    }


def subs(key):
    return SUBS[key]


def trunc(text, words=20, truncate='…'):
    return Truncator(strip_tags(text)).words(words, truncate=truncate)


def pluralize(
    items_list: list, capitalize: bool = False, pick_one: bool = False,
    for_genres: bool = False, and_string: str = 'and'
) -> str:
    if not items_list:
        return ''
    if capitalize:
        items_list = [item.capitalize() for item in items_list]
    if pick_one:
        random_el = int(hashlib.sha1(str(items_list).encode()).hexdigest(), 16) % len(items_list)
        items_list = [items_list[random_el]]
    if len(items_list) == 2:
        if for_genres:
            pluralized_str = f'{items_list[0]} {items_list[1]}'
        else:
            pluralized_str = f'{items_list[0]} {and_string} {items_list[1]}'
    elif len(items_list) > 2:
        items_list = items_list[:4]
        pluralized_str = ', '.join(items_list[:-1])
        pluralized_str += f' {and_string} {items_list[-1]}'
    else:
        pluralized_str = items_list[0]
    return pluralized_str


def hide_description(obj: Model, data: Optional[dict] = None):
    lang = get_language()
    default_lang = settings.MODELTRANSLATION_DEFAULT_LANGUAGE
    if lang != default_lang and not getattr(obj, f'description_{lang}', None):
        if data:
            data['description'] = ''
        else:
            setattr(obj, f'description_{default_lang}', '')


def clean_text(text, language, is_plain):
    about_text = 'about'
    copyright_text_1 = '©'
    copyright_text_2 = 'copyright'
    if language == settings.LANGUAGE_RU:
        about_text = 'об игре'

    if is_plain:
        new_lines = []
        for line in text.split('\n'):
            check_line = line.lower().strip()
            if check_line.startswith(about_text):
                new_lines = []
                continue
            if check_line.startswith(copyright_text_1) or check_line.startswith(copyright_text_2):
                continue
            new_lines.append(line)
        return '\n'.join(new_lines)

    soup = BeautifulSoup(text, 'html.parser')

    previous_nodes = []
    for node in soup.findAll(text=True):
        previous_nodes.append(node)
        line = node.lower().strip()
        if line.startswith(about_text):
            for prev_node in previous_nodes:
                try:
                    prev_node.replace_with('')
                except ValueError:
                    pass
            previous_nodes = []
            continue
        if line.startswith(copyright_text_1) or line.startswith(copyright_text_2):
            try:
                node.replace_with('')
            except ValueError:
                pass

    for node in soup.findAll(lambda tag: (not tag.contents or not tag.text) and tag.name != 'br'):
        node.decompose()

    for node in soup.findAll(lambda tag: tag.contents):
        new_elements = []
        is_text = False
        for c in node.contents:
            if not is_text and (c == '' or c.name == 'br'):
                continue
            is_text = True
            new_elements.append(str(c))
        new_node = soup.new_tag(name=node.name)
        new_node.append(BeautifulSoup(''.join(new_elements), 'html.parser'))
        node.replaceWith(new_node)

    text = str(soup).strip()

    while text.startswith('<br/>'):
        text = text.replace('<br/>', '', 1)

    return text
