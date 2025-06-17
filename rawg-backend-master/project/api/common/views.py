import operator
from functools import reduce
from hashlib import sha1

from cachetools.func import ttl_cache
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.db.models import Q
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from drf_haystack.generics import HaystackGenericAPIView
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, viewsets
from rest_framework.mixins import ListModelMixin
from rest_framework.views import APIView
from rest_framework.viewsets import ViewSetMixin

from api.common import serializers
from api.common.filters import SearchBackend
from api.common.paginations import ListPagination
from api.games.serializers import GameShortestSerializer
from apps.common import models
from apps.common.cache import CommonContentType
from apps.common.models import SeoLink
from apps.common.tasks import update_crawl, update_show
from apps.credits.models import Person
from apps.games.models import Collection, Developer, Game, Genre, Platform, Publisher, Tag
from apps.users.models import UserFollowElement
from apps.utils.api import true
from apps.utils.decorators import headers
from apps.utils.elastic import ConfigurableSearchQuerySet
from apps.utils.haystack import clear_id
from apps.utils.request import get_client_ip, get_user_agent


class ListView(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.List.objects.prefetch_related('content_type').all()
    serializer_class = serializers.ListSerializer
    filter_backends = []
    pagination_class = None
    is_short = False

    @swagger_auto_schema(
        operation_summary='The list of site items lists.',
        operation_description='Cached for an hour.',
        manual_parameters=[
            openapi.Parameter(
                'short', openapi.IN_QUERY, description='Get lists with a short count of items and without games.',
                type=openapi.TYPE_BOOLEAN,
            )
        ]
    )
    @method_decorator([
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        headers({'X-Accel-Expires': 3600}),
        cache_page(3600),
    ])
    def list(self, request, *args, **kwargs):
        self.is_short = true(request.GET.get('short'))
        response = super().list(request, *args, **kwargs)
        response.data = {'results': response.data}

        # count
        counts = []
        condition = 'where hidden = false'
        count_condition = 'where hidden = false and games_count > 5'
        for i, row in enumerate(response.data['results']):
            counts.append('select count(*), {} from {} {}'.format(
                i,
                row['count']['table'],
                count_condition if row['count']['is_games_count'] else (condition if row['count']['is_hidden'] else '')
            ))
        if counts:
            with connection.cursor() as cursor:
                sql = ' union '.join(counts)
                cursor.execute(f'{sql} order by 2 asc', [])
                counts = cursor.fetchall()
            for i, row in enumerate(counts):
                response.data['results'][i]['count'] = row[0]
                if response.data['results'][i]['slug'] == 'persons':
                    response.data['results'][i]['slug'] = 'creators'

        # games
        if not self.is_short:
            ids = []
            items_games = {}
            for i, row in enumerate(response.data['results']):
                for j, item in enumerate(row['items']):
                    ids += item['top_games']
                    items_games.setdefault(i, {})[j] = item['top_games']
            games = Game.objects.in_bulk(ids)
            for i, row in enumerate(response.data['results']):
                for j, item in enumerate(row['items']):
                    response.data['results'][i]['items'][j]['games'] = GameShortestSerializer(
                        [games[pk] for pk in items_games[i][j] if games.get(pk)],
                        many=True,
                        context=self.get_serializer_context()
                    ).data
                    del response.data['results'][i]['items'][j]['top_games']

        return response


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='The search by all elements.',
    operation_description='Publisher, Developer, Person, Genre, Platform, Tag, Collection, User, Game',
))
class SearchView(ListModelMixin, ViewSetMixin, HaystackGenericAPIView):
    queryset = models.List.objects.all()
    serializer_class = serializers.SearchSerializer
    filter_backends = (SearchBackend,)
    pagination_class = ListPagination
    index_models = [Publisher, Developer, Person, Genre, Platform, Tag, Collection, get_user_model(), Game]
    important_models = [Person, Genre, Platform, Game]
    object_class = ConfigurableSearchQuerySet
    search_count = 0

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            kwargs['context'] = self.get_serializer_context()
            with_games = self.filter_with_games(args)
            if with_games:
                kwargs['context']['top_games'] = Game.objects.only_short().in_bulk(with_games)
            persons = self.filter_args(args, Person)
            if persons:
                kwargs['context'].update(Person.get_many_context(persons, self.request, games=False))
            games = self.filter_args(args, Game)
            if games:
                kwargs['context'].update(Game.get_many_context(games, self.request))
            collections = self.filter_args(args, Collection)
            if collections:
                kwargs['context']['collections_creators'] = get_user_model().objects.defer_all().in_bulk([
                    collection.creator_id for collection in collections
                ])
            kwargs['context']['following_elements'] = {}
            if self.request.user.is_authenticated:
                data = []
                for row in args[0]:
                    data.append(Q(object_id=clear_id(row.id), content_type_id=CommonContentType().get(row.model).id))
                if data:
                    objects = UserFollowElement.objects.filter(user_id=self.request.user.id).filter(
                        reduce(operator.or_, data)
                    ).prefetch_related('content_type')
                    kwargs['context']['following_elements'] = {
                        (follow.object_id, follow.content_type.model) for follow in objects
                    }
        return serializer_class(*args, **kwargs)

    def filter_args(self, args, model):
        data = []
        for row in args[0]:
            if row.app_label == model._meta.app_label and row.model_name == model._meta.model_name:
                data.append(row)
        return data

    def filter_with_games(self, args):
        data = []
        for row in args[0]:
            if getattr(row, 'top_games', None):
                data += row.top_games[0:3]
        return data

    def paginate_queryset(self, queryset):
        if self.paginator is None:
            return None
        return self.paginator.paginate_count_queryset(queryset, self.search_count, self.request, self, True)


class SeoLinkView(APIView):
    def get(self, request, *args, **kwargs):
        if request.LANGUAGE_CODE != settings.LANGUAGE_EN:
            return HttpResponse('')

        uri = request.GET.get('uri') or ''
        page_num = int(sha1(uri.encode()).hexdigest(), 16)
        mod = page_num % SeoLink.BLOCKS
        data = []
        link_ids = []
        offset = mod * SeoLink.ON_PAGE
        for link in SeoLink.objects.visible()[offset:offset + SeoLink.ON_PAGE]:
            data.append(f'<a href="{link.uri}">{link.name}</a>')
            link_ids.append(link.id)
        html = ''
        if data:
            html = ', '.join(data)
            text = _('Related pages')
            html = f'<div className="game__seo-links__header">{text}</div>{html}'

        user_agent = get_user_agent(request)
        if uri and 'googlebot' in user_agent.lower() and 'agbot' not in user_agent.lower():
            ip = get_client_ip(request) or ''
            update_show.delay(link_ids, uri, ip, user_agent)
            update_crawl.delay(uri, ip, user_agent)

        return HttpResponse(html)


class FileApiAuthView(APIView):
    def get(self, request, *args, **kwargs):
        uri = request.META.get('HTTP_X_ORIGINAL_URI')
        key = uri.split('?key=').pop()
        api_group = self.api_group(key)
        if api_group != settings.API_GROUP_ENTERPRISE:
            return HttpResponse('{} {}'.format(api_group, key), status=401)
        return HttpResponse('')

    @ttl_cache(maxsize=1000, ttl=300)
    def api_group(self, key):
        cache_key = f'file.api.1.{key}'
        cache_result = cache.get(cache_key)
        if cache_result is None:
            user = get_user_model().objects.filter(api_key=key).first()
            cache_result = user.api_group if user else False
            cache.set(cache_key, cache_result, 600)
        return cache_result
