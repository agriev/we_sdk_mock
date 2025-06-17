import facebook
from allauth.socialaccount.models import SocialAccount, SocialApp, SocialToken
from django.core.exceptions import ObjectDoesNotExist

from apps.utils.lang import fake_request_by_language

API_VERSION = '4.0'


def get_credentials(user_id, user_language):
    try:
        app = SocialApp.objects.get_current('facebook', fake_request_by_language(user_language))
        token = SocialToken.objects.get(app=app, account__user_id=user_id)
    except ObjectDoesNotExist:
        return False, False
    return app, token


def check_write_permissions(user_id, user_language):
    app, token = get_credentials(user_id, user_language)
    if not app:
        return False
    graph = facebook.GraphAPI(access_token=token.token, version=API_VERSION)
    try:
        return 'publish_actions' in graph.get_permissions('me')
    except facebook.GraphAPIError:
        return False


def friends(user_id, user_language):
    app, token = get_credentials(user_id, user_language)
    if not app:
        return []
    graph = facebook.GraphAPI(access_token=token.token, version=API_VERSION)
    ids = []
    try:
        for user in graph.get_all_connections('me', 'friends'):
            ids.append(user['id'])
    except facebook.GraphAPIError:
        return []
    return SocialAccount.objects.filter(uid__in=ids, socialtoken__app=app).values_list('user_id', flat=True)
