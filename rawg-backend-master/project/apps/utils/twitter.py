import requests
import tweepy
from allauth.socialaccount.models import SocialAccount, SocialApp, SocialToken
from django.core.exceptions import ObjectDoesNotExist
from requests_oauthlib import OAuth1
from tweepy import TweepError

from apps.utils.lang import fake_request_by_language


def get_credentials(user_id, user_language):
    try:
        app = SocialApp.objects.get_current('twitter', fake_request_by_language(user_language))
        token = SocialToken.objects.get(app=app, account__user_id=user_id)
    except ObjectDoesNotExist:
        return False, False
    return app, token


def check_write_permissions(user_id, user_language):
    app, token = get_credentials(user_id, user_language)
    if not app:
        return False
    auth = OAuth1(app.client_id, app.secret, token.token, token.token_secret)
    response = requests.get('https://api.twitter.com/1.1/account/verify_credentials.json', auth=auth)
    return response.headers.get('x-access-level') == 'read-write'


def friends(user_id, user_language):
    app, token = get_credentials(user_id, user_language)
    if not app:
        return []
    auth = tweepy.OAuthHandler(app.client_id, app.secret)
    auth.set_access_token(token.token, token.token_secret)
    api = tweepy.API(auth)
    try:
        return SocialAccount.objects.filter(uid__in=api.friends_ids(), socialtoken__app=app) \
            .values_list('user_id', flat=True)
    except TweepError:
        return []
