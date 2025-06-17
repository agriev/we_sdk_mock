from time import sleep

import dateutil
import requests
from requests.exceptions import ChunkedEncodingError, ConnectionError
from simplejson import JSONDecodeError

from apps.merger import counters


class GOGAPIException(Exception):
    pass


def get_response_raw(url, params, retry_on_errors=True, timeout=None):
    try:
        response = requests.get(url, params=params, timeout=timeout, allow_redirects=False)
        counters.add('gog')
    except (ConnectionError, ChunkedEncodingError) as e:
        if retry_on_errors:
            sleep(10)
            return get_response_raw(url, params, False, timeout)
        raise GOGAPIException('GOG Network error: {}'.format(e.__class__.__name__))
    if response.status_code != 200:
        if response.status_code in (302, 404):
            # Profile is not found
            return response, 'not-found'
        if response.status_code == 403:
            # Profile is not public
            return response, 'private-games'
        if retry_on_errors:
            sleep(10)
            return get_response_raw(url, params, False, timeout)
        raise GOGAPIException('GOG Network error: {}'.format(response.text))
    return response, 'ok'


def get_response(url, params, retry_on_errors=True, timeout=None):
    try:
        response, status = get_response_raw(url, params, retry_on_errors, timeout)
        if status != 'ok':
            return {}
        return response.json()
    except JSONDecodeError as e:
        if retry_on_errors:
            sleep(10)
            return get_response(url, params, False)
        raise GOGAPIException('GOG Network error: {}'.format(e.__class__.__name__))


def get_gog_id(gog_id):
    if not gog_id:
        return False
    if gog_id.startswith('https://') or gog_id.startswith('http://'):
        try:
            return gog_id.split('/')[4]
        except IndexError:
            return False
    return gog_id


def get_games(gog_id, retry_on_errors=True, timeout=None, page=1):
    gog_id = get_gog_id(gog_id)
    if not gog_id:
        return False
    data = get_response(
        f'https://www.gog.com/u/{gog_id}/games/stats',
        {
            'sort': 'recent_playtime',
            'order': 'desc',
            'page': page,
        },
        retry_on_errors,
        timeout,
    )
    if not data or not data.get('total'):
        return []
    games = []
    for row in data['_embedded']['items']:
        game = row['game']
        game['name'] = row['game']['title']
        game['playtime_forever'] = 0
        game['last_played'] = None
        if row['stats']:
            stat = list(row['stats'].values()).pop(0)
            if stat.get('playtime'):
                game['playtime_forever'] = stat['playtime']
            if stat.get('lastSession'):
                game['last_played'] = dateutil.parser.parse(stat['lastSession'])
        games.append(game)
    if page == 1 and data['pages'] > 1:
        for i in range(2, data['pages'] + 1):
            games += get_games(gog_id, retry_on_errors, timeout, i)
    return games


def check_profile(gog_id, timeout):
    gog_id = get_gog_id(gog_id)
    if not gog_id:
        return 'not-found'
    _, error = get_response_raw(
        f'https://www.gog.com/u/{gog_id}/games/stats',
        {
            'sort': 'recent_playtime',
            'order': 'desc',
            'page': 1,
        },
        False,
        timeout
    )
    return error
