import requests
from allauth.socialaccount import providers
from allauth.socialaccount.providers.facebook.provider import GRAPH_API_URL, FacebookProvider
from allauth.socialaccount.providers.facebook.views import FacebookOAuth2Adapter as Facebook, compute_appsecret_proof
from allauth.socialaccount.providers.twitter.views import TwitterAPI, TwitterOAuthAdapter as Twitter
from allauth.socialaccount.providers.vk.views import USER_FIELDS, VKOAuth2Adapter as VK

from apps.utils.api import int_or_none
from apps.utils.strings import code


class FacebookOAuth2Adapter(Facebook):
    def complete_login(self, request, app, access_token, **kwargs):
        provider = providers.registry.by_id(FacebookProvider.id, request)
        resp = requests.get(
            GRAPH_API_URL + '/me',
            params={
                'fields': ','.join(provider.get_fields()),
                'access_token': access_token.token,
                'appsecret_proof': compute_appsecret_proof(app, access_token)
            })
        resp.raise_for_status()
        extra_data = resp.json()
        if not extra_data.get('email'):
            extra_data['email'] = '{}@facebook.com'.format(extra_data.get('id') or code())
        return provider.sociallogin_from_response(request, extra_data)


class TwitterOAuthAdapter(Twitter):
    def complete_login(self, request, app, token, response):
        client = TwitterAPI(request, app.client_id, app.secret, self.request_token_url)
        extra_data = client.get_user_info()
        if not extra_data.get('email'):
            extra_data['email'] = '{}@twitter.com'.format(extra_data.get('id') or code())
        return self.get_provider().sociallogin_from_response(request, extra_data)


class VKOAuth2Adapter(VK):
    def complete_login(self, request, app, token, **kwargs):
        params = {
            'v': '5.95',
            'access_token': token.token,
            'fields': ','.join(USER_FIELDS + ['email']),
        }
        resp = requests.get(self.profile_url, timeout=10, params=params)
        resp.raise_for_status()
        extra_data = resp.json()['response'][0]
        if kwargs.get('email'):
            extra_data['email'] = kwargs['email']
        if not extra_data.get('email'):
            extra_data['email'] = '{}@vk.com'.format(extra_data.get('id') or code())
        if not int_or_none(extra_data.get('screen_name')):
            request.original_username = extra_data['screen_name']
        elif not int_or_none(extra_data.get('nickname')):
            request.original_username = extra_data['nickname']
        return self.get_provider().sociallogin_from_response(request, extra_data)
