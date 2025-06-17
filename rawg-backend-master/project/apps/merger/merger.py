import os
import subprocess
from urllib.parse import urlparse

import dateutil.parser
import nltk
from bs4 import BeautifulSoup
from django.conf import settings
from django.core.files import File
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils.html import strip_tags

from apps.credits.models import GamePerson
from apps.games import models
from apps.games.esrb import ESRBConverter
from apps.games.models import GameStore
from apps.games.tasks import update_game_totals
from apps.merger.models import MergedSlug, SimilarGame, StoreAdd
from apps.reviews.models import Review
from apps.reviews.tasks import update_reviews_totals
from apps.utils.dicts import find
from apps.utils.images import (
    ImageException, content_to_jpeg_file, fix_http_url, get_images, is_gif, jpeg_optimize, resize,
)
from apps.utils.lang import check_russian_letters, local_lang_detect
from apps.utils.strings import bare_text, keep_tags as default_keep_tags
from apps.utils.video import video_to_image

_ntlk_stopwords = None
_project_stopwords = [
    'game', 'games', 'ios', 'pc', 'test', 'software', 'time', 'flash', 'mac', 'earth', 'cool', 'internet', 'life',
    'audio', 'platform', 'heart', 'home', 'house', 'levels', 'world', 'mouse', 'video', 'experience', 'computer',
    'america', 'upgrades', 'jump', 'star', 'stars', 'score', 'spanish', 'pool', 'number', 'project', 'nintendo',
    'power', 'money', 'coffee', 'web', 'brazil', 'language', 'support',
]


class Platform:
    cache = None

    def __new__(cls, key, name=None):
        if Platform.cache is None or settings.ENVIRONMENT == 'TESTS':
            Platform.cache = {p.slug: p for p in models.Platform.objects.all()}
        if Platform.cache.get(key):
            return Platform.cache.get(key)
        platform, _ = models.Platform.objects.get_or_create(slug=key, defaults={'name': name if name else key})
        Platform.cache[platform.slug] = platform
        return platform


def get_related(data, model, defaults=None):
    if not data:
        return []
    data = [d.strip() for d in data if d]
    check_names = {}
    all_elements = set()
    for name in data:
        check_names[name] = False
    for name in data:
        for e in model.find_by_synonyms(name):
            all_elements.add(e)
            check_names[name] = True
    for name, value in check_names.items():
        if not value:
            default_defaults = {'synonyms': [name.lower()]}
            if defaults:
                default_defaults.update(defaults)
            new_element, created = model.objects.get_or_create(name=name[0:100], defaults=default_defaults)
            if not created:
                new_element.add_synonym(name)
                new_element.save()
            all_elements.add(new_element)
    return all_elements


def check_image(image):
    try:
        return image.image.url
    except ValueError:
        return False


def date(value):
    if not value:
        return None
    try:
        return dateutil.parser.parse(value).date()
    except (ValueError, OverflowError):
        return None


def create_store(collection, platforms):
    store = None
    store, _ = models.Store.objects.get_or_create(slug=collection, defaults={'name': collection})
    for platform in platforms:
        store.platforms.add(Platform(platform))
    return store, similar(store)


def similar(store=None):
    exclude = models.Game.objects
    if store:
        exclude = exclude.exclude(stores__in=[store.id])
    return exclude.values_list('id', 'name')


def get_released(item):
    if item.get('release_date'):
        return date(item.get('release_date'))
    return None


def check_store_internal_id(item_id, store_id, game_id):
    try:
        game_store = models.GameStore.objects.get(store_id=store_id, game_id=game_id)
        return game_store.store_internal_id == str(item_id)
    except models.GameStore.DoesNotExist:
        return True


def find_game(item, similar_list, collection='', merge_by_date=True, store=None, suffix_in_synonyms=False):
    name = item['name'].strip()[0:200]

    # find a game by steam_id
    if item.get('steam_id'):
        game_store = models.GameStore.objects.filter(store_internal_id=item['steam_id'], store__slug='steam')
        if game_store:
            game = game_store.first().game
            game.add_synonym(name)
            return game, False, False

    # find a game by synonyms
    results = models.Game.find_by_synonyms(name)
    for result in results:
        # cases for some crawlers with indie and old games
        if result.import_collection != collection:
            if not merge_by_date:
                continue
            # don't merge if games have different release dates or names
            release_date = get_released(item)
            if not release_date or result.name != name or result.released.year - release_date.year not in (-1, 0, 1):
                continue
        elif collection and store:
            # don't merge indie games if they have different internal ids
            if not check_store_internal_id(item['id'], store.id, result.id):
                continue
        return result, False, False

    # create a new game if synonyms don't exist
    defaults = {
        'description': keep_tags(item.get('description')),
        'synonyms': [name.lower()],
        'import_collection': collection,
    }
    game, created = models.Game.objects.get_or_create(name=name, defaults=defaults)
    if not created:
        game.add_synonym(name)
        # cases for some crawlers with indie and old games
        game, created = get_new_name(
            name, item, game, created, store, defaults, collection, merge_by_date, suffix_in_synonyms
        )

    add_similar = []
    if similar_list:
        for pk, name in similar_list:
            result = SimilarGame.check_games(pk, name, game.id, game.name)
            if result:
                add_similar.append(result)

    return game, created, add_similar


def get_new_name(name, item, game, created, store, defaults, collection, merge_by_date, suffix_in_synonyms):
    new_name = name
    if game.import_collection != collection:
        if game.is_indie:
            game.name_en = f'{game.name} ({game.import_collection})'
            game.name = game.name_en
            game.save(update_fields=['name', 'name_en'])
        elif merge_by_date:
            released = get_released(item)
            suffix = released.year if released else (collection.title() if collection else 'new')
            new_name = '{} ({})'.format(name, suffix)
        else:
            new_name = '{} ({})'.format(name, collection if collection else 'new')
    elif collection and store:
        # don't merge indie games if they have different internal ids
        if not check_store_internal_id(item['id'], store.id, game.id):
            new_name = '{} ({})'.format(name, ', '.join(item.get('developers')))
        else:
            return game, created
    else:
        return game, created
    if suffix_in_synonyms:
        defaults['synonyms'] = [new_name.lower()]
    game, created = models.Game.objects.get_or_create(name=new_name, defaults=defaults)
    if created:
        return game, created
    return get_new_name(new_name, item, game, created, store, defaults, collection, merge_by_date, suffix_in_synonyms)


def get_esrb_rating_instance(game, required_age):
    converter = ESRBConverter()
    if not game.esrb_rating:
        required_age = str(required_age).strip()[0:500]
        esrb_short_name = converter.convert(required_age)
        if not esrb_short_name:
            return
        esrb = models.ESRBRating.objects.get(short_name=esrb_short_name)
        return esrb


def keep_tags(text):
    text = default_keep_tags(text, ['h1', 'h2', 'h3'])
    soup = BeautifulSoup(text, 'html.parser')
    for el in ('h1', 'h2'):
        for node in soup.findAll(el):
            if not node.string:
                node.unwrap()
                continue
            h3 = soup.new_tag('h3')
            h3.string = node.string
            node.replace_with(h3)
    return str(soup)


def select_name(game, name, suffix='', developer=False, year=False, genre=False):
    full_name = name
    if suffix:
        full_name = f'{name} ({suffix})'
    if not models.Game.objects.filter(name_ru=full_name).count():
        return full_name
    if not developer:
        row = game.developers.first()
        if row:
            return select_name(game, name, row.name, developer=True)
    if not year and game.is_released:
        return select_name(game, name, game.released.year, developer=True, year=True)
    if not genre:
        row = game.genres.first()
        if row:
            return select_name(game, name, row.name, developer=True, year=True, genre=True)
    return ''


def generate_tags(description):
    global _ntlk_stopwords
    if not _ntlk_stopwords:
        nltk.download('stopwords')
        nltk.download('averaged_perceptron_tagger')
        _ntlk_stopwords = nltk.corpus.stopwords.words('english')
    tags = [t.lower() for t in models.Tag.objects.visible().filter(games_count__gte=50).values_list('name', flat=True)]
    words = nltk.tokenize.wordpunct_tokenize(strip_tags(description))
    words = [
        word.lower() for word in words
        if word.isalpha() and word.lower() in tags
        and word.lower() not in _project_stopwords and word.lower() not in _ntlk_stopwords
    ]
    words = nltk.FreqDist(
        word for (word, pos) in nltk.pos_tag(words)
        if (pos[:2] == 'NN' or pos[:2] == 'ADJ')
    )
    return [name for name, _ in words.most_common(20)]


def update(game, created, item, store=None, important_descriptions=None, small_images=None):
    # descriptions
    if store:
        def is_only_store():
            return game.stores.count() == 1 and store.id == game.stores.first().id

        is_important = store.slug in important_descriptions if important_descriptions else False
        if (
            item.get('description')
            and not game.description_en_is_plain_text
            and (is_important or not game.description_en or is_only_store())
        ):
            game.description_en = keep_tags(item.get('description'))
            game.description = game.description_en
        if (
            item.get('description_ru')
            and not game.description_ru_is_plain_text
            and (is_important or not game.description_ru or is_only_store())
        ):
            description_ru = keep_tags(item['description_ru'])
            only_text = bare_text(description_ru)[0]
            if only_text and local_lang_detect(only_text) == settings.LANGUAGE_RU:
                game.description_ru = description_ru

    if item.get('required_age'):
        game.esrb_rating = get_esrb_rating_instance(game, item['required_age'])

    if item.get('website') and not game.website:
        game.website = item['website'].strip()[0:500] or ''

    if item.get('wikipedia_name'):
        game.wikipedia_name = item['wikipedia_name'].strip()[0:200] or ''

    if item.get('is_free'):
        game.is_free = True

    release_date = get_released(item)
    if release_date and (not game.is_released or release_date < game.released):
        game.released = release_date

    for key, value in find(item, 'platforms', {}).items():
        game_platform, _ = models.GamePlatform.objects.get_or_create(
            game=game,
            platform=Platform(key, value.get('name'))
        )
        requirements = value.get('requirements')
        if type(requirements) is dict and requirements.get('devices'):
            devices = [d for d in requirements.get('devices')]
            requirements = {'minimum': ', '.join(devices)}
        game_platform.requirements = requirements or game_platform.requirements
        game_platform.released_at = release_date or game_platform.released_at
        game_platform.save()

    if release_date:
        game.set_tba_field()

    if store and item.get('url'):
        stores = game.stores.all()
        if len(stores) and store.id not in [s.pk for s in stores]:
            store_add = StoreAdd.objects.create(game=game, store_add=store)
            for s in stores:
                store_add.stores_was.add(s)

        url = item['url'][0:500]
        game_store, _ = models.GameStore.objects.get_or_create(game=game, store=store, defaults={
            'url': url,
            'url_en': url,
            'url_ru': (item.get('url_ru') or '')[0:500],
            'store_internal_id': item['id'],
        })

    for developer in get_related(item.get('developers'), models.Developer):
        game.developers.add(developer)

    for publisher in get_related(item.get('publishers'), models.Publisher):
        game.publishers.add(publisher)

    for genre in get_related(item.get('genres'), models.Genre):
        game.genres.add(genre)

    for category in get_related(item.get('categories'), models.Tag):
        game.tags.add(category)

    if created and not item.get('tags') and game.description_en:
        item['tags'] = generate_tags(game.description_en)
    for tag in get_related(item.get('tags'), models.Tag, {'language': settings.LANGUAGE_ENG}):
        game.tags.add(tag)

    for tag in get_related(item.get('tags_ru'), models.Tag, {'language': settings.LANGUAGE_RUS}):
        game.tags.add(tag)

    if item.get('name_ru') and not game.name_ru and check_russian_letters(item['name_ru']):
        game.name_ru = select_name(game, item['name_ru'])

    for i, movie in enumerate(find(item, 'movies', [])):
        video = movie['data'].get('max')
        tmp_file = '/tmp/movie_{}_{}.jpg'.format(game.id, i)
        try:
            video_to_image(video, tmp_file)
            jpeg_optimize(tmp_file)
        except subprocess.CalledProcessError:
            continue
        record, _ = models.Movie.objects.get_or_create(game=game, store=store, internal_id=movie['id'], defaults={
            'name': movie['name'],
            'preview': movie['preview'],
            'data': movie['data'],
        })
        try:
            record.preview.save('{}.jpg'.format(record.id), File(open(tmp_file, 'rb')))
            os.unlink(tmp_file)
        except FileNotFoundError:
            record.delete()

    screenshots = map(fix_http_url, find(item, 'screenshots', []))
    if screenshots:
        screens_count = game.screenshots.count()
        if not screens_count or game.screenshots.filter(is_small=True).count() == screens_count:
            if settings.CRAWLING_SAVE_IMAGES:
                images = get_images(screenshots)
            else:
                images = [(screen, None) for screen in screenshots]
            for screen, content in images:
                kwargs = {'game': game, 'source': screen, 'defaults': {'is_external': True}}
                try:
                    image, _ = models.ScreenShot.objects.get_or_create(**kwargs)
                except models.ScreenShot.MultipleObjectsReturned:
                    models.ScreenShot.objects.filter(game=game, source=screen).delete()
                    image, _ = models.ScreenShot.objects.get_or_create(**kwargs)
                if settings.CRAWLING_SAVE_IMAGES:
                    if not image.image or not default_storage.exists(image.image.name) or not check_image(image):
                        try:
                            screen_name, jpg_content, image.width, image.height = \
                                content_to_jpeg_file(screen, content, min_size=50, sizes=True)
                        except ImageException:
                            image.delete()
                            continue
                        image.image.save(screen_name, jpg_content)
                        if screen.lower().endswith('.gif') and is_gif(content):
                            image.image_alternate.save(screen_name.replace('.jpg', '.gif'), ContentFile(content))
                        resize(image.image, settings.PRE_RESIZE_SCREENS)
                else:
                    if image.image:
                        image.image = None
                        image.image_alternate = None
                image.is_small = bool(
                    (store and small_images and store.slug in small_images)
                    or item.get('screenshots_small')
                )
                image.save()
        game.set_background_image()

    game.save()
    return game


def merge(game: models.Game, game_from: models.Game) -> None:
    if not game.name_ru and game_from.name_ru:
        game.name_ru = game_from.name_ru
    if not game.description_ru and game_from.description_ru:
        game.description_ru = game_from.description_ru
        game.description_ru_is_plain_text = game_from.description_ru_is_plain_text
    if not game.description_en and game_from.description_en:
        game.description_en = game_from.description_en
        game.description_en_is_plain_text = game_from.description_en_is_plain_text

    if game_from.metacritic and not game.metacritic:
        game.metacritic = game_from.metacritic

    if game_from.is_released and (not game.is_released or game_from.released < game.released):
        game.released = game_from.released

    for game_store in models.GameStore.objects.select_for_update().filter(game=game_from):
        new_game_store, created = models.GameStore.objects.get_or_create(
            game=game,
            store=game_store.store,
            defaults={'url': game_store.url, 'url_en': game_store.url_en, 'url_ru': game_store.url_ru}
        )
        if created:
            store_add = StoreAdd.objects.create(game=game, store_add=game_store.store)
            for s in game.stores.all():
                store_add.stores_was.add(s)

    fields = ['developers', 'publishers', 'genres', 'tags']
    for f in fields:
        add = set()
        for e in getattr(game, f).all():
            add.add(e)
        for e in getattr(game_from, f).all():
            add.add(e)
        getattr(game, f).set(add)

    for game_platform in models.GamePlatform.objects.select_for_update().filter(game=game_from):
        new_game_platform, created = models.GamePlatform.objects.get_or_create(
            game=game,
            platform=game_platform.platform,
            defaults={
                'requirements': game_platform.requirements,
                'released_at': game_platform.released_at,
            }
        )
        if not created:
            update_fields = []
            not_set = game_platform.released_at and not new_game_platform.released_at
            less = (
                game_platform.released_at and new_game_platform.released_at
                and game_platform.released_at < new_game_platform.released_at
            )
            if not_set or less:
                new_game_platform.released_at = game_platform.released_at
                update_fields.append('released_at')
            if not new_game_platform.requirements:
                new_game_platform.requirements = game_platform.requirements
                update_fields.append('requirements')
            if update_fields:
                new_game_platform.save(update_fields=update_fields)

    for screen in models.ScreenShot.objects.select_for_update().filter(game=game_from):
        screen.game_id = game.id
        screen.save(update_fields=['game_id'])

    for game_person in GamePerson.objects.select_for_update().filter(game=game_from):
        GamePerson.objects.get_or_create(
            game=game,
            person=game_person.person,
            position=game_person.position,
            defaults={'hidden': game_person.hidden},
        )

    new_slug, old_slug = MergedSlug.save_merged_slugs(game_from.slug, game.slug, game)
    MergedSlug.rewrite_merged_slugs(new_slug, old_slug, game)
    game.set_background_image()
    game.add_synonym(game_from.name)
    game_from.replace(game)
    game_from.delete()
    game.slug = new_slug
    game.save()
    update_game_totals(game.id, None)
    rebuild_external_reviews_store(game.id)
    update_reviews_totals(game.id, True, True)


def rebuild_external_reviews_store(game_id):
    domains = {
        'itunes.com': 'apple-appstore',
        'steamcommunity.com': 'steam',
    }
    reviews_qs = Review.objects.filter(game_id=game_id, user_id=None)
    for review in reviews_qs:
        # TODO: move to Store model if any new store
        if not review.external_store_id:
            url = urlparse(review.external_source)
            store_slug = domains.get(url.netloc)
            external_store = GameStore.objects.filter(game_id=game_id, store__slug=store_slug)
            if external_store:
                Review.objects.filter(id=review.id).update(external_store=external_store.first())
