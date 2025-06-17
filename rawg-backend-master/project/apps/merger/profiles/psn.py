import json
import logging
import os
import re
from datetime import timedelta
from time import sleep

import dateutil.parser
import requests
from constance import config
from django.conf import settings
from django.core.cache import cache
from django.utils.timezone import now
from psnawp_api import psnawp
from requests.exceptions import ConnectionError

from apps.merger import counters

consts = {
    'client_id': 'ebee17ac-99fd-487c-9b1e-18ef50c39ab5',
    'client_secret': 'e4Ru_s*LrL4_B2BD',
    'web_client_id': '71a7beb8-f21a-47d9-a604-2e71bee24fe0',
    'web_client_secret': 'xSk2YI8qJqZfeLQv',
    'user_agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:76.0) Gecko/20100101 Firefox/76.0',
    'scope':
        'kamaji:get_players_met kamaji:get_account_hash kamaji:activity_feed_submit_feed_story kamaji:'
        'activity_feed_internal_feed_submit_story kamaji:activity_feed_get_news_feed kamaji:communities kamaji:'
        'game_list kamaji:ugc:distributor oauth:manage_device_usercodes psn:sceapp user:account.profile.get user:'
        'account.attributes.validate user:account.settings.privacy.get kamaji:activity_feed_set_feed_privacy kamaji:'
        'satchel kamaji:satchel_delete user:account.profile.update',
    # 'scope':
    #      'kamaji:get_players_met kamaji:get_account_hash kamaji:activity_feed_submit_feed_story '
    #      'kamaji:activity_feed_internal_feed_submit_story kamaji:activity_feed_get_news_feed kamaji:communities '
    #      'kamaji:game_list kamaji:ugc:distributor oauth:manage_device_usercodes psn:sceapp '
    #      'user:account.profile.get user:account.attributes.validate user:account.settings.privacy.get '
    #      'kamaji:activity_feed_set_feed_privacy kamaji:satchel kamaji:satchel_delete user:account.profile.update',
    'scope_sso': 'openid:user_id openid:ctry_code openid:lang kamaji:get_privacy_settings '
                 'kamaji:activity_feed_get_feed_privacy kamaji:game_list kamaji:get_account_hash',
    'scope_auth': 'oauth:authenticate',
    'service_entity': 'urn:service-entity:psn',
    'duid': '0000000d00040080027BC1C3FBB84112BFC9A4300A78E96A',  # 0000000d000400808F4B3AA3301B4945B2E3636E38C0DDFC
    'app_context': 'inapp_ios',
    'redirect': 'com.playstation.PlayStationApp://redirect',
}

urls = {
    'sign_in':
        f'https://id.sonyentertainmentnetwork.com/signin/?response_type=token&scope=capone%3Areport_submission'
        f'%2Ckamaji%3Agame_list%2Ckamaji%3Aget_account_hash%2Cuser%3Aaccount.get%2Cuser%3Aaccount.profile.get'
        f'%2Ckamaji%3Asocial_get_graph%2Ckamaji%3Augc%3Adistributor%2Cuser%3Aaccount.identityMapper%2Ckamaji'
        f'%3Amusic_views%2Ckamaji%3Aactivity_feed_get_feed_privacy%2Ckamaji%3Aactivity_feed_get_news_feed'
        f'%2Ckamaji%3Aactivity_feed_submit_feed_story%2Ckamaji%3Aactivity_feed_internal_feed_submit_story'
        f'%2Ckamaji%3Aaccount_link_token_web%2Ckamaji%3Augc%3Adistributor_web%2Ckamaji%3Aurl_preview&'
        f'client_id=656ace0b-d627-47e6-915c-13b259cd06b2&redirect_uri=https%3A%2F%2Fmy.playstation.com%2'
        f'Fauth%2Fresponse.html%3FrequestID%3Dexternal_request_89ba0f95-adca-4498-b39f-9265cb521838%26'
        f'baseUrl%3D%2F%26returnRoute%3D%2F%26targetOrigin%3Dhttps%3A%2F%2Fmy.playstation.com%26'
        f'excludeQueryParams%3Dtrue&prompt=login&tp_console=true&ui=pr&error=login_required&error_code=4165&'
        f'error_description=User+is+not+authenticated&no_captcha=true#/signin?entry=%2Fsignin',
    'token': 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token',
    'ssocokie': 'https://auth.api.sonyentertainmentnetwork.com/2.0/ssocookie',
    'check': 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorizeCheck',
    'authorize': 'https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize',
    'redirect': consts['redirect'],
}

pattern = re.compile('trophies', re.I)
auth_proxies = {
    'http': settings.PROXY_TWO,
    'https': settings.PROXY_TWO,
}
logger = logging.getLogger('psn')


class PlayStationAPIException(Exception):
    pass


def get_headers():
    tokens = json.loads(config.IMPORT_PSN_TOKENS)[settings.PSN_API_USERNAME]
    return {
        'Authorization': f'Bearer {tokens["access_token"]}',
        'TE': 'Trailers',
        'User-Agent': consts['user_agent'],
        'Accept-Language': 'en-us',
    }


# async def get_cookies(username, password):
#     browser = await launch(args=[
#         f'--proxy-server={auth_proxies["http"]}',
#         '--no-sandbox',
#         '--disable-dev-shm-usage',
#         '--window-size=1680,1050',
#         f'--user-agent="{consts["user_agent"]}"'
#     ])
#     page = await browser.newPage()
#     await page.setViewport({
#         'width': 1680,
#         'height': 988,
#     })
#     await page.goto(urls['sign_in'], options={'waitUntil': 'domcontentloaded'})
#     await page.waitForSelector('input[name=nds-pmd]')
#     await page.waitFor(random.randint(1, 2000))
#     await page.click('form input[type=email]')
#     await page.type('form input[type=email]', username)
#     await page.waitFor(random.randint(1, 2000))
#     await page.click('form input[type=password]')
#     await page.type('form input[type=password]', password)
#     await page.waitFor(random.randint(1, 2000))
#     await page.click('form button.primary-button')
#     await page.waitForSelector('.tertiary-logo')
#     await page.goto('https://auth.api.sonyentertainmentnetwork.com')
#     cookies = {}
#     for cookie in await page.cookies():
#         cookies[cookie['name']] = cookie['value']
#     await browser.close()
#     return cookies


def get_npsso_code(select_username: str) -> str:
    npsso_codes = {}
    for line in (config.IMPORT_PSN_NPSSO or '').split('\n'):
        try:
            login, code = line.strip().split(',')
        except ValueError:
            continue
        npsso_codes[login] = code
    return npsso_codes.get(select_username)


# def get_code(select_username):
#     username = settings.PSN_API_USERNAME
#     # password = settings.PSN_API_PASSWORD
#     if select_username:
#         username = select_username
#         # for row in settings.IMPORT_DATA.values():
#         #     if username == row['PSN_API_USERNAME']:
#         #         password = row['PSN_API_PASSWORD']
#
#     session = requests.Session()
#
#     # TODO disabled because the new PSN anti-bot protection
#     # npsso = None
#     # cookies = asyncio.get_event_loop().run_until_complete(get_cookies(username, password))
#     # for name, value in cookies.items():
#     #     if name == 'npsso':
#     #         npsso = value
#     #     session.cookies.set(name, value, domain='.sonyentertainmentnetwork.com', path='/')
#
#     npsso = get_npsso_code(select_username)
#     session.cookies.set('npsso', npsso, domain='.sonyentertainmentnetwork.com', path='/')
#     if not npsso:
#         raise PlayStationAPIException('The npsso cookie is not found')
#
#     session.post(
#         urls['check'],
#         data={
#             'client_id': consts['client_id'],
#             'npsso': npsso,
#             'scope': consts['scope'],
#             'service_entity': consts['service_entity'],
#         },
#         headers={
#             'Origin': 'https://id.sonyentertainmentnetwork.com',
#             'Referer': 'https://id.sonyentertainmentnetwork.com/',
#             'X-Referer-Info': urls['sign_in'],
#             'User-Agent': consts['user_agent'],
#         },
#         allow_redirects=False,
#         proxies=auth_proxies
#     )
#
#     session.post(
#         urls['token'],
#         data={
#             'grant_type': 'sso_cookie',
#             'scope': consts['scope_sso'],
#             'client_id': consts['web_client_id'],
#             'client_secret': consts['web_client_secret'],
#         },
#         headers={
#             'Origin': 'https://id.sonyentertainmentnetwork.com',
#             'Referer': 'https://id.sonyentertainmentnetwork.com/',
#             'X-Referer-Info': urls['sign_in'],
#             'User-Agent': consts['user_agent'],
#         },
#         allow_redirects=False,
#         proxies=auth_proxies
#     )
#
#     response = session.get(
#         urls['authorize'],
#         params={
#             'client_id': consts['client_id'],
#             'redirect_uri': urls['redirect'],
#             'request_locale': 'en_US',
#             'response_type': 'code',
#             'scope': consts['scope'],
#             'service_entity': consts['service_entity'],
#         },
#         headers={
#             'Origin': 'https://id.sonyentertainmentnetwork.com',
#             'Referer': 'https://id.sonyentertainmentnetwork.com/',
#             'X-Referer-Info': urls['sign_in'],
#             'User-Agent': consts['user_agent'],
#         },
#         allow_redirects=False,
#         proxies=auth_proxies
#     )
#     session.close()
#     if not response.headers.get('X-NP-GRANT-CODE'):
#         raise PlayStationAPIException(
#             'PSN Network error. Please try to login https://auth.api.sonyentertainmentnetwork.com/login.do '
#             'with this username: {}'.format(username)
#         )
#
#     logger.info('base_url - {} x2'.format(username))
#     return response.headers['X-NP-GRANT-CODE']


def get_token(username=None):
    # username = username if username else settings.PSN_API_USERNAME
    # data = {
    #     'app_context': consts['app_context'],
    #     'client_id': consts['client_id'],
    #     'client_secret': consts['client_secret'],
    #     'code': get_code(username),
    #     'duid': consts['duid'],
    #     'grant_type': 'authorization_code',
    #     'scope': consts['scope'],
    #     'redirect_uri': urls['redirect'],
    # }
    # response = requests.post(urls['token'], data=data, proxies=auth_proxies)
    # try:
    #     response = response.json()
    #     logger.info('base_url - {}'.format(username))
    # except JSONDecodeError:
    #     raise PlayStationAPIException('PSN Network error: {}'.format(response.text))
    os.environ['HTTP_PROXY'] = os.environ['http_proxy'] = settings.PROXY_ONE
    os.environ['HTTPS_PROXY'] = os.environ['https_proxy'] = settings.PROXY_ONE
    client = psnawp.PSNAWP(get_npsso_code(username))
    os.environ['HTTP_PROXY'] = os.environ['http_proxy'] = ''
    os.environ['HTTPS_PROXY'] = os.environ['https_proxy'] = ''
    save_tokens(client.authenticator.oauth_token_response, username)


def refresh_token(username=None, retry=True):
    all_tokens = {}
    username = username if username else settings.PSN_API_USERNAME
    if config.IMPORT_PSN_TOKENS:
        all_tokens = json.loads(config.IMPORT_PSN_TOKENS)
    tokens = all_tokens.get(username)
    if not tokens:
        get_token(username)
        return
    # data = {
    #     'app_context': consts['app_context'],
    #     'client_id': consts['client_id'],
    #     'client_secret': consts['client_secret'],
    #     'refresh_token': tokens['refresh_token'],
    #     'duid': consts['duid'],
    #     'grant_type': 'refresh_token',
    #     'scope': consts['scope'],
    #     'redirect_uri': urls['redirect'],
    # }
    # try:
    #     response = requests.post(urls['token'], data=data, proxies=auth_proxies)
    #     logger.info('base_url - {}'.format(username))
    # except (ConnectionError, SSLError):
    #     if retry:
    #         sleep(5)
    #         return refresh_token(username, False)
    #     raise
    # try:
    #     response = response.json()
    # except JSONDecodeError:
    #     get_token(username)
    #     return
    # if response.get('error'):
    #     get_token(username)
    #     return
    client = psnawp.PSNAWP(get_npsso_code(username))
    client.authenticator.obtain_fresh_access_token()
    save_tokens(client.authenticator.oauth_token_response, username)


def save_tokens(oauth_token_response, username=None):
    all_tokens = {}
    username = username if username else settings.PSN_API_USERNAME
    if config.IMPORT_PSN_TOKENS:
        all_tokens = json.loads(config.IMPORT_PSN_TOKENS)
    tokens = all_tokens.get(username) or {}
    tokens['access_token'] = oauth_token_response['access_token']
    tokens['refresh_token'] = oauth_token_response['refresh_token']
    tokens['refresh_time'] = (now() + timedelta(minutes=45)).isoformat()
    all_tokens[username] = tokens
    setattr(config, 'IMPORT_PSN_TOKENS', json.dumps(all_tokens))


def check_tokens(username=None, retry=True):
    tokens = {}
    username = username if username else settings.PSN_API_USERNAME
    if config.IMPORT_PSN_TOKENS:
        tokens = json.loads(config.IMPORT_PSN_TOKENS).get(username) or {}
    if not tokens or not tokens.get('access_token') or not tokens.get('refresh_token'):
        if not retry:
            raise PlayStationAPIException('PSN check tokens error')
        get_token(username)
        return check_tokens(username, False)
    if not tokens.get('refresh_time') or now() > dateutil.parser.parse(tokens['refresh_time']):
        refresh_token(username)
    return True


def get_response(url, retry_on_errors=True, timeout=None):
    try:
        response = requests.get(
            url, headers=get_headers(), timeout=timeout,
            proxies=auth_proxies if not os.environ.get('HTTPS_PROXY') else None
        )
        counters.add('psn_online_id')
    except ConnectionError as e:
        if retry_on_errors:
            sleep(10)
            return get_response(url, False)
        raise PlayStationAPIException('PSN Network error: {}'.format(e.__class__.__name__))
    response = response.json()
    if response.get('error'):
        if response['error'].get('code') == 2105356:  # user is not found
            return None
        if response['error'].get('code') == 3241984:  # hidden games list
            return None
        if response['error'].get('code') == 2138124:  # not found
            return None
        if response['error'].get('code') == 2240525:  # resource not found
            return None
        if response['error'].get('code') == 2240513:  # Bad Request (query: npTitleId)
            return None
        elif response['error'].get('code') in (2105858, 2138626):  # auth error
            get_token()
            return get_response(url, False)
        else:  # 2138881 Internal server error, 2138635 Rate limit exceeded
            if retry_on_errors:
                sleep(10)
                return get_response(url, False)
            raise PlayStationAPIException('PSN Network error: {}'.format(response['error']))
    return response


def get_account_id(psn_online_id, timeout=None):
    url = (
        f'https://us-prof.np.community.playstation.net/userProfile/v1/users/{psn_online_id}/profile2'
        '?fields=accountId,onlineId,currentOnlineId'
    )
    response = get_response(url, timeout=timeout)
    if not response:
        return
    return response['profile']['accountId']


def get_npwr_from_cusa_id(account_id, app_id, timeout=None):
    # Get the communication id (NPWR...) from a title id (CUSA...)
    # Only works for PS4/PS5 titles.
    # Doesn't work with PPSA... title ids.

    cache_key = f'psn.npwr.{app_id}'
    cache_result = cache.get(cache_key)
    if cache_result is None:
        url = f'https://m.np.playstation.net/api/trophy/v1/users/{account_id}/titles/trophyTitles?npTitleIds={app_id}'
        try:
            cache_result = get_response(url, timeout=timeout)['titles'][0]['trophyTitles'][0]['npCommunicationId']
        except PlayStationAPIException as e:
            logger.exception(e)
            return
        except (IndexError, TypeError):
            cache_result = None
        cache.set(cache_key, cache_result, 3600 * 24)
    return cache_result


def get_names(data, account_id):
    result = []
    for row in data:
        last_played = row.get('lastPlayedDateTime')
        result.append({
            'id': row['titleId'],
            'alt_id': get_npwr_from_cusa_id(account_id, row['titleId']),
            'name': pattern.sub('', row['name']),
            'last_played': dateutil.parser.parse(last_played) if last_played else None
        })
    return result


def get_games(psn_online_id, timeout=None, offset=None, account_id=None):
    if not offset:
        check_tokens()

    if not account_id:
        account_id = get_account_id(psn_online_id, timeout=timeout)
        if not account_id:
            return False

    url = f'https://m.np.playstation.net/api/gamelist/v2/users/{account_id}/titles'
    if offset:
        url += f'?offset={offset}'

    response = get_response(url, timeout=timeout)
    if not response:
        return False

    games = get_names(response['titles'], account_id)
    if response['nextOffset']:
        next_games = get_games(psn_online_id, timeout=timeout, offset=response['nextOffset'], account_id=account_id)
        if not next_games:
            return games
        return games + next_games

    return games


# def get_trophies_titles(psn_online_id, timeout=None):
#     account_id = get_account_id(psn_online_id, timeout=timeout)
#
#     url = f'https://m.np.playstation.net/api/trophy/v1/users/{account_id}/trophyTitles'
#     response = get_response(url, timeout=timeout)
#
#     data = []
#     for trophy in response['trophyTitles']:
#         data.append(trophy['npCommunicationId'])
#
#     return data


def get_achievements_data(alt_id, timeout=None):
    cache_key = f'psn.achievements.{alt_id}'
    cache_result = cache.get(cache_key)
    if cache_result is None:
        url = (
            f'https://m.np.playstation.net/api/trophy/v1/npCommunicationIds/{alt_id}/'
            f'trophyGroups/all/trophies?npServiceName=trophy'
        )
        response = get_response(url, timeout=timeout)
        if not response:
            return False
        cache_result = {}
        for trophy in response['trophies']:
            cache_result[trophy['trophyId']] = trophy
        cache.set(cache_key, cache_result, 3600 * 24)
    return cache_result


def get_achievements(alt_id, psn_online_id, timeout=None):
    check_tokens()

    account_id = get_account_id(psn_online_id, timeout=timeout)

    trophies = get_achievements_data(alt_id, timeout=timeout)
    if not trophies:
        return False

    url = (
        f'https://m.np.playstation.net/api/trophy/v1/users/{account_id}/npCommunicationIds/{alt_id}/'
        f'trophyGroups/all/trophies?npServiceName=trophy'
    )

    response = get_response(url, timeout=timeout)
    if not response:
        return False

    rows = []
    for trophy in response['trophies']:
        rows.append({
            'id': trophy['trophyId'],
            'name': trophies[trophy['trophyId']]['trophyName'],
            'description': trophies[trophy['trophyId']]['trophyDetail'],
            'image': trophies[trophy['trophyId']]['trophyIconUrl'],
            'type': trophy['trophyType'],
            'earned': trophy['earned'],
            'earned_time': trophy.get('earnedDateTime'),
            'hidden': trophy['trophyHidden'],
        })

    return rows


def get_profile(psn_online_id):
    check_tokens()

    url = 'https://us-prof.np.community.playstation.net/userProfile/v1/users/{}/profile2?fields=onlineId,aboutMe,' \
          'consoleAvailability,languagesUsed,avatarUrls,personalDetail,personalDetail(%40default,' \
          'profilePictureUrls),primaryOnlineStatus,trophySummary(level,progress,earnedTrophies),plus,' \
          'isOfficiallyVerified,friendRelation,personalDetailSharing,presences(%40default,platform),npId,blocking,' \
          'following,mutualFriendsCount,followerCount&profilePictureSizes=s,m,l&avatarSizes=s,m,l&' \
          'languagesUsedLanguageSet=set4'
    response = get_response(url.format(psn_online_id))
    if not response:
        return None

    return response


def get_account_confirmation(user, fields):
    if user.psn_online_id_confirm:
        return fields
    if not user.psn_online_id:
        raise PlayStationAPIException('You do not have a PSN account')
    if user.psn_online_id_first_confirm and user.psn_online_id_first_confirm != user.psn_online_id:
        raise PlayStationAPIException(
            'Please, use your first account with uid {}'.format(user.psn_online_id_first_confirm)
        )
    profile = get_profile(user.psn_online_id)
    if not profile:
        raise PlayStationAPIException('The PSN API error, please try again later')
    if 'ag.ru/@{}'.format(user.slug).lower() not in profile['profile']['aboutMe'].lower():
        raise PlayStationAPIException('The link is not found or the account is private')
    user.psn_online_id_confirm = True
    user.psn_online_id_first_confirm = user.psn_online_id
    user.last_sync_psn = None
    fields += ['psn_online_id_confirm', 'psn_online_id_first_confirm', 'last_sync_psn']
    return fields
