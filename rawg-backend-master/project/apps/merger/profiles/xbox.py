import json
from time import sleep

import dateutil
import urllib3
from constance import config
from django.conf import settings
from requests.exceptions import ConnectionError, SSLError
from xbox.webapi.api.client import XboxLiveClient
from xbox.webapi.common.exceptions import AuthenticationException

from apps.merger import counters
from apps.utils.xbox import AuthenticationManager

headers = {
    'Connection': None,
    'Accept': None,
    'Accept-Encoding': None,
    'Accept-Language': 'en-US',
    'Content-Type': 'application/json',
    'User-Agent': None,
    'x-xbl-contract-version': '2',
}

urls = {
    'id': 'https://profile.xboxlive.com/users/gt({})/profile/settings',
    'profile': 'https://profile.xboxlive.com/users/xuid({})/gamercard',
    'games_one': 'https://achievements.xboxlive.com/users/xuid({})/history/titles'
                 '?orderBy=unlockTime&maxItems=400',
    'games_360': 'https://achievements.xboxlive.com/users/xuid({})/history/titles'
                 '?orderBy=unlockTime&maxItems=400',
    'achievements': 'https://achievements.xboxlive.com/users/xuid({})/achievements?titleId={}',
}

urllib3.disable_warnings()


class XboxAPIException(Exception):
    pass


def get_client():
    auth_mgr = AuthenticationManager()
    all_tokens = {settings.XBOX_API_USERNAME: ''}
    if config.IMPORT_XBOX_TOKENS:
        all_tokens = json.loads(config.IMPORT_XBOX_TOKENS)
    tokens = all_tokens.get(settings.XBOX_API_USERNAME)
    try:
        if not tokens:
            raise AuthenticationException
        auth_mgr.load_tokens(tokens)
        auth_mgr.authenticate(do_refresh=True)
    except AuthenticationException:
        auth_mgr.email_address = settings.XBOX_API_USERNAME
        auth_mgr.password = settings.XBOX_API_PASSWORD
        auth_mgr.authenticate(do_refresh=False)
    all_tokens[settings.XBOX_API_USERNAME] = auth_mgr.save_tokens()
    setattr(config, 'IMPORT_XBOX_TOKENS', json.dumps(all_tokens))
    xbl_client = XboxLiveClient(auth_mgr.userinfo.userhash, auth_mgr.xsts_token.jwt, auth_mgr.userinfo.xuid)
    return xbl_client


def get_response(url, set_headers, retry_on_errors=True, timeout=None):
    try:
        response = get_client().session.get(url, headers=set_headers, verify=False, timeout=timeout)
        counters.add('gamer_tag')
    except (ConnectionError, SSLError) as e:
        if retry_on_errors:
            sleep(10)
            return get_response(url, set_headers, False)
        raise XboxAPIException('Xbox Network error: {}'.format(e.__class__.__name__))
    if response.status_code != 200:
        if response.status_code in (403, 404):
            # The caller does not have permission to view this data for the requested user
            # The server found no data for the requested entity
            return {}
        if retry_on_errors:
            sleep(10)
            return get_response(url, set_headers, False)
        raise XboxAPIException('Xbox Network error: {}'.format(response.text))
    response = response.json()
    if response.get('error_message'):
        if retry_on_errors:
            sleep(10)
            return get_response(url, set_headers, False)
        raise XboxAPIException('Xbox Network error: {}'.format(response.get('error_message')))
    return response


def get_id(gamer_tag, timeout=None):
    try:
        return get_response(urls['id'].format(gamer_tag), headers, timeout=timeout)['profileUsers'].pop()['id']
    except KeyError:
        return None


def get_profile(gamer_uid):
    return get_response(urls['profile'].format(gamer_uid), headers)


def get_titles(url, token=None, update_headers=None, timeout=None):
    if update_headers:
        sleep(1)
    result_url = url
    if token:
        result_url = '{}&continuationToken={}'.format(url, token)

    new_headers = headers.copy()
    if update_headers:
        new_headers.update(update_headers)

    response = get_response(result_url, new_headers, timeout=timeout)
    if not response.get('titles'):
        return []

    token = (response.get('pagingInfo') or {}).get('continuationToken')
    if token:
        return response['titles'] + get_titles(url, token, update_headers)

    return response['titles']


def get_games(gamer_uid, timeout=None):
    if not gamer_uid:
        return False
    titles1 = get_titles(urls['games_one'].format(gamer_uid), timeout=timeout)
    titles2 = get_titles(
        urls['games_360'].format(gamer_uid), update_headers={'x-xbl-contract-version': '1'}, timeout=timeout
    )
    titles = titles1 + titles2
    for title in titles:
        last_played = title.get('lastPlayed') or title.get('lastUnlock')
        title['last_played'] = dateutil.parser.parse(last_played) if last_played else None
    return titles


def get_achievements(app_id, gamer_uid, update_headers=False, token=None, retry_on_errors=True):
    url = urls['achievements'].format(gamer_uid, app_id)
    if token:
        sleep(1)
        url = '{}&continuationToken={}'.format(url, token)

    new_headers = headers.copy()
    if update_headers:
        new_headers.update({'x-xbl-contract-version': '1'})

    response = get_response(url, new_headers)
    if not response.get('achievements'):
        return []

    rows = []
    for achieve in response['achievements']:
        assets = achieve.get('mediaAssets')
        earned_time = None
        if assets:
            # xbox one
            image = assets.pop()['url'] if assets else ''
            earned = achieve['progressState'] == 'Achieved'
            if earned:
                earned_time = achieve.get('progression', {}).get('timeUnlocked')
        else:
            # xbox 360
            image = 'http://image.xboxlive.com/global/t.{}/ach/0/{}'.format(
                hex(app_id)[2:], hex(achieve['imageId'])[2:]
            )
            earned = achieve['unlocked']
            if earned:
                earned_time = achieve['timeUnlocked']
        rows.append({
            'id': achieve['id'],
            'name': achieve['name'],
            'description': achieve['description'],
            'image': image,
            'earned': earned,
            'earned_time': earned_time,
            'hidden': achieve['isSecret'],
        })

    token = (response.get('pagingInfo') or {}).get('continuationToken')
    if token:
        return rows + get_achievements(app_id, gamer_uid, update_headers, token)

    return rows


def get_account_confirmation(user, fields):
    if user.gamer_tag_confirm:
        return fields
    if not user.gamer_tag:
        raise XboxAPIException('You do not have an Xbox account')
    if not user.gamer_tag_uid:
        user.gamer_tag_uid = get_id(user.gamer_tag)
        if not user.gamer_tag_uid:
            raise XboxAPIException('The account is not found or private')
        fields.append('gamer_tag_uid')
    if user.gamer_tag_uid_first_confirm and user.gamer_tag_uid_first_confirm != user.gamer_tag_uid:
        raise XboxAPIException(
            'Please, use your first account with uid {}'.format(user.gamer_tag_uid_first_confirm)
        )
    profile = get_profile(user.gamer_tag_uid)
    if not profile:
        raise XboxAPIException('The Xbox API error, please try again later')
    if 'ag.ru/@{}'.format(user.slug).lower() not in profile['bio'].lower():
        raise XboxAPIException('The link is not found or the account is private')
    user.gamer_tag_confirm = True
    user.gamer_tag_uid_first_confirm = user.gamer_tag_uid
    user.last_sync_xbox = None
    fields += ['gamer_tag_confirm', 'gamer_tag_uid_first_confirm', 'last_sync_xbox']
    return fields
