from datetime import date, timedelta
from urllib import parse

from cachetools.func import ttl_cache
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.contrib.sites.shortcuts import get_current_site
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import CsrfViewMiddleware, get_token, rotate_token
from django.utils import translation
from django.utils.deprecation import MiddlewareMixin
from django.utils.http import is_same_domain
from django.utils.timezone import now
from knbauth.middleware import AuthenticationMiddleware as BaseAuthenticationMiddleware
from modeltranslation.utils import get_language

from apps.stat.models import APIUserCounter
from apps.stat.tasks import dump_api_stat

_api_counter = {}
_api_counter_last_dump = None


class AddPathHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # todo maybe cache it
        response = self.get_response(request)
        if request.resolver_match and request.resolver_match.url_name:
            path = request.resolver_match.view_name
            # clean
            if '<' in request.resolver_match.url_name:
                parts = []
                for part in request.resolver_match.view_name.split('/'):
                    if '<' in part:
                        part = part.split('<').pop().split('>')[0]
                    parts.append(part)
                path = '/'.join(parts)
            response['Path'] = path.replace('/', '-').replace(':', '-').replace('_', '-')
        return response


class XAccelExpiresHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if not response.get('X-Accel-Expires'):
            response['X-Accel-Expires'] = 0
        return response


class LocaleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        language = None
        try:
            language = translation.get_supported_language_variant(request.GET.get('lang'))
        except LookupError:
            pass
        if not language:
            try:
                language = translation.get_supported_language_variant(request.META.get('HTTP_X_API_LANGUAGE'))
            except LookupError:
                pass
        if not language and settings.SET_LANGUAGE_BY_HOST:
            try:
                language = settings.SITE_ID_LANGUAGES.get(get_current_site(request).id)
            except Site.DoesNotExist:
                pass
        translation.activate(language or settings.LANGUAGE_CODE)
        request.LANGUAGE_CODE = get_language()
        request.LANGUAGE_CODE_ISO3 = settings.LANGUAGES_2_TO_3[request.LANGUAGE_CODE]

        response = self.get_response(request)
        response.setdefault('Content-Language', request.LANGUAGE_CODE)
        return response


class ApiClientMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.API_CLIENT = request.META.get('HTTP_X_API_CLIENT') or request.GET.get('api_client')
        request.API_CLIENT_IS_WEBSITE = request.API_CLIENT == 'website'
        return self.get_response(request)


class ApiKeyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        global _api_counter, _api_counter_last_dump

        request.API_KEY = request.GET.get('key')
        request.API_GROUP = None
        user_id = ''
        closed_urls = (
            'browse',
            'developers',
            'cheats',
            'creators',
            'demos',
            'games',
            'genres',
            'platforms',
            'creator-roles',
            'patches',
            'publishers',
            'search',
            'software',
            'stores',
            'suggestions',
            'tags',
        )
        witelist_actions = {
            'games': ('playerinfo',)
        }
        path_parts = request.path_info.strip('/').split('/')
        if (
            request.method == 'GET'
            and len(path_parts) > 1
            and path_parts[0] == 'api'
            and path_parts[1] in closed_urls
            and path_parts[-1] not in witelist_actions.get(path_parts[1], [])
        ):
            if not request.API_KEY and settings.ENVIRONMENT != 'TESTS':
                return JsonResponse({'error': 'The key parameter is not provided'}, status=401)
            if request.API_KEY:
                cache_result = self.api_key(request.API_KEY)
                if not cache_result:
                    return JsonResponse({'error': 'The API key is not found'}, status=401)
                user_id, request.API_GROUP, date_api = cache_result
                if settings.API_LIMITS[request.API_GROUP]:
                    counter = _api_counter.get(user_id, 0)
                    if not counter and self.check_limit_reached(user_id, request.API_GROUP, date_api):
                        return JsonResponse({'error': 'The monthly API limit reached'}, status=401)
                    _api_counter[user_id] = counter + 1
                    if not _api_counter_last_dump:
                        _api_counter_last_dump = now()
                    elif (now() - _api_counter_last_dump) > timedelta(minutes=3):
                        dump_api_stat.delay(_api_counter)
                        _api_counter = {}
                        _api_counter_last_dump = now()

        response = self.get_response(request)
        response['Api-User'] = user_id
        return response

    @ttl_cache(maxsize=1000, ttl=300)
    def api_key(self, key):
        cache_key = f'api.1.{key}'
        cache_result = cache.get(cache_key)
        if cache_result is None:
            user = get_user_model().objects.filter(api_key=key).first()
            cache_result = (user.id, user.api_group, user.api_dates[0]) if user else False
            cache.set(cache_key, cache_result, 600)
        return cache_result

    @ttl_cache(maxsize=1000, ttl=60)
    def check_limit_reached(self, user_id: str, api_group: str, date_api: date) -> bool:
        api_limit = settings.API_LIMITS[api_group]
        if not api_limit:
            return False
        counter = sum(
            APIUserCounter.objects
            .filter(user_id=user_id, date__gte=date_api)
            .values_list('count', flat=True)
        )
        return counter >= api_limit


class AuthenticationMiddleware(BaseAuthenticationMiddleware, MiddlewareMixin):
    pass


class ForceCsrfCookieMiddleware(CsrfViewMiddleware):
    def process_request(self, request):
        super().process_request(request)
        if not request.COOKIES.get(settings.CSRF_COOKIE_NAME):
            get_token(request)
