from time import sleep

import requests
from django.conf import settings
from requests.exceptions import ChunkedEncodingError, ConnectionError, ReadTimeout
from simplejson import JSONDecodeError

from apps.merger import counters
from apps.utils.steam import API_URLS

VISIBLE_STATE_PUBLIC = 3


class SteamAPIException(Exception):
    pass


def get_response_raw(url, params, retry_on_errors=True, timeout=None):
    try:
        response = requests.get(url, params=params, timeout=timeout)
        counters.add('steam_id')
    except (ConnectionError, ChunkedEncodingError, ReadTimeout) as e:
        if retry_on_errors:
            sleep(10)
            return get_response_raw(url, params, False, timeout)
        raise SteamAPIException('Steam Network error: {}'.format(e.__class__.__name__))
    if response.status_code != 200:
        if response.status_code == 400:
            # Requested app has no stats
            return response
        if response.status_code == 403:
            # Profile is not public
            return response
        if retry_on_errors:
            sleep(10)
            return get_response_raw(url, params, False, timeout)
        raise SteamAPIException('Steam Network error: {}'.format(response.text))
    return response


def get_response(url, params, retry_on_errors=True, timeout=None):
    try:
        return get_response_raw(url, params, retry_on_errors, timeout).json()
    except JSONDecodeError as e:
        if retry_on_errors:
            sleep(10)
            return get_response(url, params, False)
        raise SteamAPIException('Steam Network error: {}'.format(e.__class__.__name__))


def get_id(steam_id, retry_on_errors=True, timeout=None):
    if not steam_id.isdigit():
        skip_vanity = False
        if 'steamcommunity.com/id/' in steam_id:
            steam_id = steam_id.rstrip('/').split('steamcommunity.com/id/').pop().split('/')[0]
        elif 'steamcommunity.com/profiles/' in steam_id:
            steam_id = steam_id.rstrip('/').split('steamcommunity.com/profiles/').pop().split('/')[0]
            skip_vanity = True
        if not skip_vanity:
            data = get_response(
                API_URLS['steam_id'],
                {'key': settings.STEAM_API_KEY, 'vanityurl': steam_id},
                retry_on_errors,
                timeout,
            )
            if not data.get('response') or data['response'].get('message') == 'No match':
                return False
            steam_id = data['response']['steamid']
    return steam_id


def get_games(steam_uid, retry_on_errors=True, timeout=None):
    if not steam_uid:
        return False
    data = get_response(
        API_URLS['owned_games'],
        {
            'key': settings.STEAM_API_KEY,
            'steamid': steam_uid,
            'include_appinfo': 1,
            'include_played_free_games': 1,
        },
        retry_on_errors,
        timeout,
    )['response']
    if not data.get('game_count'):
        return []
    return data['games']


def get_game(app_id):
    return get_response(API_URLS['game_detail'], {
        'key': settings.STEAM_API_KEY,
        'appid': app_id,
        'l': 'english',
    })


def get_friends(steam_uid, retry_on_errors=True):
    data = get_response(API_URLS['friends'], {
        'key': settings.STEAM_API_KEY,
        'steamid': steam_uid,
        'relationship': 'friend',
    }, retry_on_errors)
    if not (data.get('friendslist') or {}).get('friends'):
        return []
    return [friend['steamid'] for friend in data['friendslist']['friends']]


def get_profile(steam_uid, retry_on_errors=True, timeout=None):
    response = get_response_raw(
        API_URLS['user_info'],
        {'key': settings.STEAM_API_KEY, 'steamids': [steam_uid]},
        retry_on_errors,
        timeout,
    )
    if response.status_code == 200:
        players = response.json()['response']['players']
        if not players:
            return None
        return players.pop()
    else:
        return None


def get_recently_games(steam_uid):
    data = get_response(API_URLS['recently_games'], {
        'key': settings.STEAM_API_KEY,
        'steamid': steam_uid,
        'l': 'english',
    })['response']
    if not data.get('total_count'):
        return []
    return data['games']


def get_achievements(app_id, steam_uid):
    data = get_response(API_URLS['achievements'], {
        'key': settings.STEAM_API_KEY,
        'appid': app_id,
        'steamid': steam_uid,
        'l': 'english',
    })['playerstats']
    if not data['success'] or not data.get('achievements'):
        return False, False
    return data['gameName'], data['achievements']


def get_account_confirmation(user, fields):
    if user.steam_id_confirm:
        return fields
    if not user.steam_id:
        raise SteamAPIException('You do not have a Steam account')
    if not user.steam_id_uid:
        user.steam_id_uid = get_id(user.steam_id)
        if not user.steam_id_uid:
            raise SteamAPIException('The account is not found or private')
        fields.append('steam_id_uid')
    if user.steam_id_uid_first_confirm and user.steam_id_uid_first_confirm != user.steam_id_uid:
        raise SteamAPIException(
            'Please, use your first account with uid {}'.format(user.steam_id_uid_first_confirm)
        )
    profile = get_profile(user.steam_id_uid, False)
    if not profile:
        raise SteamAPIException('The Steam API error, please try again later')
    check_link(profile['profileurl'], user)
    user.steam_id_confirm = True
    user.steam_id_uid_first_confirm = user.steam_id_uid
    user.last_sync_steam = None
    fields += ['steam_id_confirm', 'steam_id_uid_first_confirm', 'last_sync_steam']
    return fields


def check_link(url, user):
    response = requests.get(url)
    if response.status_code != 200:
        raise SteamAPIException('The Steam API error, please try again later')
    if 'ag.ru/@{}'.format(user.slug).lower() not in response.text.lower():
        raise SteamAPIException('The link is not found')
