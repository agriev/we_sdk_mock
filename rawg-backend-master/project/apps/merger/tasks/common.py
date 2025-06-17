import sys
from collections import namedtuple
from hashlib import sha1
from random import shuffle

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError
from django.db.models.signals import post_save
from django.utils.timezone import now
from psycopg2 import errorcodes
from rest_framework.fields import DateTimeField

from apps.games.models import Game, GameStore
from apps.merger.tasks.mocks import sync_mocks
from apps.users.signals import user_game_post_save, user_game_post_save_base
from apps.utils.api import get_object_or_none
from apps.utils.strings import normalize_apostrophes

Param = namedtuple('Param', (
    'field', 'field_status', 'field_date', 'field_duration', 'field_games', 'field_last_sync',
    'field_uid', 'title', 'store_slug', 'network_slug', 'platforms', 'sync'
))
STORES = (
    Param(
        'steam_id', 'steam_id_status', 'steam_id_date', 'steam_id_duration', 'steam_id_games', 'last_sync_steam',
        'steam_id_uid', 'Steam', 'steam', 'steam', ['pc'], True
    ),
    Param(
        'gamer_tag', 'gamer_tag_status', 'gamer_tag_date', 'gamer_tag_duration', 'gamer_tag_games', 'last_sync_xbox',
        'gamer_tag_uid', 'Xbox', 'xbox-store', 'xbox', ['xbox-one', 'xbox360'], True
    ),
    Param(
        'psn_online_id', 'psn_online_id_status', 'psn_online_id_date', 'psn_online_id_duration',
        'psn_online_id_games', 'last_sync_psn',
        None, 'PlayStation', 'playstation-store', 'playstation', ['playstation4', 'playstation3'], True
    ),
    # Param(
    #     'raptr', 'raptr_status', 'raptr_date', 'raptr_duration', 'raptr_games', None,
    #     None, 'Raptr', 'steam', 'raptr', [], False
    # ),
    Param(
        'gog', 'gog_status', 'gog_date', 'gog_duration', 'gog_games', 'last_sync_gog',
        None, 'GOG', 'gog', 'gog', ['pc'], True
    ),
)
FIELDS_STORES = {store.field: store for store in STORES}


def fill(container, fields, user):
    for f in fields:
        container[f] = DateTimeField().to_representation(user.get(f)) if 'date' in f else user.get(f)


def save_game(user, game, platforms, store, is_sync=False):
    from apps.users.models import UserGame

    game_instance, name = get_game_cached(game.get('appid'), game['name'], store.slug)
    if game_instance:
        local_platforms = game['set_platforms'] if game.get('set_platforms') else platforms
        playtime = 0
        if game.get('playtime_forever'):
            playtime = game.get('playtime_forever') * 60
        elif game.get('playtime'):
            playtime = game.get('playtime')
        return UserGame.create_user_game(
            game_instance, user, local_platforms, playtime, True, is_sync,
            # game.get('raptr'),
            game.get('last_played'), store.slug,
        )

    return None


def save_games(games, user_id, attr, account_id, is_sync=False, is_fast=False, is_achievements=True, started=None):
    from apps.games.models import Store
    from apps.users.models import UserGame

    try:
        user = get_user_model().objects.get(id=user_id)
    except Exception:
        return {}

    store_params = FIELDS_STORES.get(attr)

    user_games = []
    user_games_objects = []
    store = Store.objects.get(slug=store_params.store_slug)
    post_save.disconnect(user_game_post_save, UserGame)

    if len(games) > 3000:
        # shuffle to write every time different games in cases of big user libraries and timeouts
        shuffle(games)

    for game in sync_mocks(games, user_id):
        try:
            user_game = save_game(user, game, store_params.platforms, store, is_sync)
        except IntegrityError as e:
            if e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION:
                raise
            # retry one time
            user_game = save_game(user, game, store_params.platforms, store, is_sync)
        if user_game:
            user_games_objects.append(user_game)
            user_games.append({
                'status': user_game.status,
                'game_id': user_game.game_id,
            })

    user_game_post_save_base(user_games_objects, from_import=True)

    post_save.connect(user_game_post_save, UserGame)

    result = {
        attr: account_id,
        store_params.field_status: 'ready',
        store_params.field_date: now(),
        store_params.field_duration: (now() - started).seconds if started else 0,
        store_params.field_games: user_games,
    }
    if store_params.field_last_sync and is_achievements:
        # save a date of last sync immediately to prevent double requests to achievements
        # in case of emergency exits in synchronizations
        fields = {'{}_fast'.format(store_params.field_last_sync): now()}
        if not is_fast:
            fields[store_params.field_last_sync] = now()
        get_user_model().objects.filter(id=user_id).update(**fields)
    return result


def clear_name(name, store):
    sys.path.append(settings.BASE_DIR)
    from crawlers.utils.clear import clear_name as _clear
    store = {
        'xbox-store': 'xbox',
        'playstation-store': 'playstation',
        'apple-appstore': 'ios',
        'google-play': 'android',
    }.get(store, store)
    name = normalize_apostrophes(name)
    return _clear(name, store)


def filter_by_store(game):
    for store in game.stores.all():
        if store.use_in_sync:
            return False
    return True


def get_game_cached(app_id, name, store_slug, custom_store_kwargs=None):
    cache_key = sha1(f'{app_id}.{name}.{store_slug}.{custom_store_kwargs}'.encode('utf-8')).hexdigest()
    result = cache.get(cache_key)
    if not result:
        game, name = get_game(app_id, name, store_slug, custom_store_kwargs)
        if game:
            cache.set(cache_key, (game, name), 60 * 60 * 3)
            save_game_cached_tag(game.id, cache_key)
        return game, name
    return result


def save_game_cached_tag(game_id, cache_key):
    tag_key = f'get_game_cached_{game_id}'
    keys = cache.get(tag_key)
    if keys:
        keys = keys.split(',')
    else:
        keys = []
    if cache_key not in keys:
        keys.append(cache_key)
    cache.set(tag_key, ','.join(keys), 60 * 60 * 3)


def remove_game_cached(game_id):
    tag_key = f'get_game_cached_{game_id}'
    keys = cache.get(tag_key)
    if not keys:
        return
    for key in keys.split(','):
        cache.delete(key)
    cache.set(tag_key, '')


def get_game(app_id, name, store_slug, custom_store_kwargs=None):
    name = clear_name(name, store_slug)
    # find by store id
    kwargs = {'store__slug': store_slug}
    if custom_store_kwargs:
        kwargs.update(custom_store_kwargs)
    else:
        kwargs['store_internal_id'] = app_id
    store = get_object_or_none(GameStore, **kwargs)
    if store:
        return store.game, name
    # find by synonyms
    results = Game.find_by_synonyms(name)
    for result in results:
        if result.released > now().date() or filter_by_store(result):
            continue
        return result, name
    # find by a name
    game = get_object_or_none(Game, name=name)
    if game and filter_by_store(game):
        game = None
    if not game:
        # find by a ru name
        game = get_object_or_none(Game, name_ru=name)
        if game and filter_by_store(game):
            game = None
    return game, name
