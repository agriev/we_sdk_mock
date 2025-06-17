import csv
from collections import OrderedDict
from datetime import datetime

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import connection, transaction
from django.db.models import Case, Count, IntegerField, Prefetch, Q, When
from django.db.models.functions import ExtractYear
from django.forms import DateField
from django.http import Http404, HttpRequest, HttpResponse
from django.utils.decorators import method_decorator
from django.utils.functional import cached_property
from django.utils.timezone import now
from django_filters.rest_framework import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotAuthenticated
from rest_framework.generics import ListCreateAPIView, get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView, Response

from api.credits.serializers import GamePersonListSerializer
from api.functions import get_statistic_data, is_docs
from api.games import formats as games_formats, serializers as games_serializers
from api.games.filters import GameSearchBackend, NOT_UNIQUE_ORDERING_FIELDS, ORDERING_FIELDS
from api.games.paginations import CollectionPagination, GamePagination, ListPagination
from api.reviews.paginations import ReviewPagination
from api.reviews.serializers import ReviewMainSerializer
from api.users import filters, permissions, serializers
from api.users.paginations import UsersPagination
from api.views_mixins import (FakePaginateMixin, GetObjectMixin, PaginateDetailRouteMixin,
                              SearchPaginateMixin, SlugLookupMixin)
from apps.common.cache import CommonContentType
from apps.credits.models import Person
from apps.games import models as games_models
from apps.games.cache import PlatformParentListByPlatform
from apps.merger.models import Import
from apps.merger.profiles import psn, steam, xbox
from apps.recommendations.models import UserRecommendation
from apps.reviews.models import Review
from apps.stat.models import APIUserCounter
from apps.users import models
from apps.users.models import UserFollowElement
from apps.users.tasks import (
    delete_user, save_user_follow_element_last_viewed_id, save_user_follow_element_last_viewed_ids, save_user_setting,
)
from apps.utils.api import filter_int_or_none, int_or_none, true
from apps.utils.dates import split_dates
from apps.utils.elastic import ConfigurableSearchQuerySet
from apps.utils.haystack import clear_id
from apps.utils.lang import get_site_by_current_language
from apps.utils.list import chunky
from apps.utils.rest_framework import CsrfExemptSessionAuthentication


class UserRelatedMixin:
    permission_classes = (permissions.IsUserRelated,)
    filter_backends = ()

    @cached_property
    def user(self):
        user_id = self.kwargs.get('user_pk')
        if user_id == 'current':
            if self.request.user.is_authenticated:
                return self.request.user
            raise NotAuthenticated
        kwargs = {'id' if user_id.isdigit() else 'slug': user_id}
        return get_object_or_404(get_user_model().objects.defer_all(), **kwargs)

    @cached_property
    def user_id(self):
        return self.user.id


class GetUserFromRequestMixin:
    object = None

    def _object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        if self.kwargs[lookup_url_kwarg] == 'current':
            if self.request.user.is_authenticated:
                self.is_current = True
                return self.request.user
            raise NotAuthenticated
        else:
            obj = super().get_object()
            if self.request.user.is_authenticated and self.request.user.username == obj.username:
                self.is_current = True
            return obj

    def get_object(self):
        if not self.object:
            self.object = self._object()
        return self.object


class UserGameViewSet(
    FakePaginateMixin, UserRelatedMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.UserGame.objects.prefetch_visible()
    serializer_class = serializers.UserGameSerializer
    pagination_class = GamePagination
    ordering_fields = ('usergame__added', 'usergame__rating', 'usergame__last_played') + ORDERING_FIELDS
    joins = {
        'games_game': 'INNER JOIN games_game ON (games_game.id = users_usergame.game_id)',
        'games_game_platforms':
            'LEFT JOIN games_gameplatform ON (games_game.id = games_gameplatform.game_id)',
        'games_platform': 'LEFT JOIN games_platform ON (games_gameplatform.platform_id = games_platform.id)',
        'reviews_review':
            'LEFT JOIN reviews_review ON (games_game.id = reviews_review.game_id AND reviews_review.user_id = %s '
            'AND NOT reviews_review.hidden)',
        'games_gamestore': 'LEFT JOIN games_gamestore ON (users_usergame.game_id = games_gamestore.game_id)',
        'games_game_genres': 'LEFT JOIN games_game_genres ON (users_usergame.game_id = games_game_genres.game_id)',
    }

    def get_object(self):
        obj = get_object_or_404(
            self.get_queryset().select_for_update(), user_id=self.user_id, game_id=self.kwargs['pk'],
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list' or not self.action:
            return games_models.Game.objects
        return self.queryset

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            serializer_class = games_serializers.UserGameNewCardSerializer
            kwargs['context'].update(games_models.Game.get_many_context(
                args[0], self.request,
                user_reviews_ratings=self.user,
                user_selected_platforms=self.user,
            ))
        return serializer_class(*args, **kwargs)

    def get_paginated_response(self, data):
        response = super().get_paginated_response(data)
        response.data['counters'] = self.user.get_user_games_counters()
        return response

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        base_args = [self.user.id]
        args = base_args.copy()
        base_where = 'users_usergame.user_id = %s AND users_usergame.hidden = false'
        where = base_where
        joins = OrderedDict([('games_game', self.joins['games_game'])])
        join_games_game_for_count = False
        add_select = ''

        # filters

        statuses = request.GET.get('statuses')
        if statuses:
            statuses = statuses.split(',')
            args += statuses
            templates = ', '.join('%s' for _ in statuses)
            where += ' AND users_usergame.status IN ({})'.format(templates)
        else:
            where += " AND users_usergame.status != 'toplay'"

        parent_platforms = filter_int_or_none(request.GET.get('parent_platforms'))
        if parent_platforms:
            args += parent_platforms
            templates = ', '.join('%s' for _ in enumerate(parent_platforms))
            where += ' AND games_platform.parent_id IN ({})'.format(templates)
            joins['games_game_platforms'] = self.joins['games_game_platforms']
            joins['games_platform'] = self.joins['games_platform']
            join_games_game_for_count = True

        platforms = filter_int_or_none(request.GET.get('platforms'))
        if platforms:
            args += platforms
            templates = ', '.join('%s' for _ in enumerate(platforms))
            where += ' AND games_gameplatform.platform_id IN ({})'.format(templates)
            joins['games_game_platforms'] = self.joins['games_game_platforms']
            join_games_game_for_count = True

        stores = filter_int_or_none(request.GET.get('stores'))
        if stores:
            args += stores
            templates = ', '.join('%s' for _ in enumerate(stores))
            where += ' AND games_gamestore.store_id IN ({})'.format(templates)
            joins['games_gamestore'] = self.joins['games_gamestore']

        genres = request.GET.get('genres')
        if genres:
            genres = filter_int_or_none(genres)
            if genres:
                args += genres
                templates = ', '.join('%s' for _ in enumerate(genres))
                where += ' AND games_game_genres.genre_id IN ({})'.format(templates)
                joins['games_game_genres'] = self.joins['games_game_genres']

        dates = request.GET.get('dates')
        if dates:
            pairs = dates.split('.')
            dates = []
            for pair in pairs:
                try:
                    from_date, to_date = pair.split(',')
                except ValueError:
                    continue
                date_field = DateField()
                try:
                    from_date = date_field.to_python(from_date)
                    to_date = date_field.to_python(to_date)
                except ValidationError:
                    continue
                if not from_date or not to_date:
                    continue
                args += [from_date, to_date]
                dates.append('games_game.released BETWEEN %s AND %s')
            if dates:
                where += ' AND ({})'.format(' OR '.join(dates))
                join_games_game_for_count = True

        # params

        attach = ' '.join(v for k, v in joins.items() if k != 'games_game')
        if join_games_game_for_count:
            attach = 'INNER JOIN games_game ON (users_usergame.game_id = games_game.id) ' + attach

        # get ordering

        order = None
        ordering_field = 'added'
        ordering_direction = False
        ordering = request.GET.get('ordering')
        if ordering:
            ordering_field = ordering
            ordering_direction = 'ASC'
            if ordering[0] == '-':
                ordering_field = ordering[1:]
                ordering_direction = 'DESC'
            if ordering_field not in self.ordering_fields:
                ordering_field = 'added'
                ordering_direction = False

        # search

        search = request.GET.get('search')
        if search:
            with connection.cursor() as cursor:
                cursor.execute(
                    'SELECT users_usergame.game_id FROM users_usergame {} WHERE {}'.format(attach, where),
                    args
                )
                ids = [int(row[0]) for row in cursor.fetchall()]
                search_results = []

                ids_scores = []
                for chunk in chunky(ids, 5000):
                    fake_request = HttpRequest()
                    fake_request.query_params = {'ids': ','.join(map(str, chunk)), 'search': search}
                    custom_query, _ = GameSearchBackend().build_custom_query(fake_request)
                    qs = ConfigurableSearchQuerySet().custom_query(custom_query).values_list('id', 'score')
                    chunk_ids = []
                    for pk, score in qs:
                        pk = clear_id(pk)
                        chunk_ids.append(pk)
                        ids_scores.append((pk, score))
                    search_results.extend(chunk_ids)

                if not ordering_direction:
                    cases = []
                    for pk, score in ids_scores:
                        cases.append(f'WHEN {pk} THEN {score}')
                    if cases:
                        add_select += f', CASE games_game.id {" ".join(cases)} END ordering'
                        order = 'ordering DESC, id DESC'

                attach = ''
                args = base_args + search_results
                sub_where = '= 0'
                if search_results:
                    templates = ', '.join('%s' for _ in search_results)
                    sub_where = 'IN ({})'.format(templates)
                where = base_where + ' AND users_usergame.game_id {}'.format(sub_where)

        # total count

        with connection.cursor() as cursor:
            cursor.execute('SELECT COUNT(*) FROM users_usergame {} WHERE {}'.format(attach, where), args)
            count = cursor.fetchone()[0]

        # ordering

        if not order:
            add_nulls = False
            field = ordering_field
            field_second = None
            if ordering_field in ('usergame__added', 'created'):
                field = 'users_usergame.added'
            elif ordering_field == 'usergame__rating':
                args.insert(0, self.user.id)
                joins['reviews_review'] = self.joins['reviews_review']
                field = 'reviews_review.rating'
                add_select += ', reviews_review.rating'
                add_nulls = True
            elif ordering_field == 'usergame__last_played':
                field = 'users_usergame.last_played'
                add_select += ', users_usergame.last_played'
                field_second = 'users_usergame.added DESC'
                add_nulls = True
            elif ordering_field == 'added':
                field = 'games_game.added'
            order = '{} {}{}'.format(field, ordering_direction or 'ASC', ' NULLS LAST' if add_nulls else '')
            if field_second:
                order = f'{order}, {field_second}'
            if ordering_field in NOT_UNIQUE_ORDERING_FIELDS:
                order += ', id DESC'

        # pagination

        args = self.raw_paginate(request, count, args)
        fields = ', '.join(f'games_game.{field}' for field in games_models.Game.objects.raw_list_fields)
        rows = list(queryset.raw('''
            SELECT
            {}
                {}, users_usergame.is_new, users_usergame.added{}
            FROM users_usergame
            {}
            WHERE {}
            ORDER BY {}
            LIMIT %s OFFSET %s
        '''.format('DISTINCT' if where else '', fields, add_select, ' '.join(joins.values()), where, order), args))
        serializer = self.get_serializer(rows, many=True, context=self.get_serializer_context())

        response = self.get_paginated_response(serializer.data)

        # update the is_new field

        ids = []
        for result in response.data['results']:
            if not request.user.is_authenticated or self.user.id != request.user.id or not result['is_new']:
                result['is_new'] = False
                continue
            ids.append(result['id'])
        if ids:
            self.queryset.filter(user_id=self.user.id, game_id__in=ids).update(is_new=False)

        return response

    def perform_destroy(self, instance):
        if instance.status == models.UserGame.STATUS_TOPLAY:
            super().perform_destroy(instance)
            return
        instance.hidden = True
        instance.save()

    def create(self, request, *args, **kwargs):
        if request.data and 'game' in request.data:
            with transaction.atomic():
                return super().create(request, *args, **kwargs)
        else:
            return self.bulk_post(request)

    def bulk_post(self, request, *args, **kwargs):
        serializer = serializers.UserGameBulkSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.bulk_create(), status=status.HTTP_201_CREATED, headers=headers)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except Http404:
            request._load_data_and_files()
            request._full_data['game'] = kwargs['pk']
            return super().create(request, *args, **kwargs)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_id='users_games_partial_update_bulk',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'games': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_INTEGER),
                    description='List of game ids.',
                ),
                'batch_statuses': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description='New statuses of games.',
                ),
                'batch_platforms': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description='New platforms of games.',
                ),
                'batch_added': openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    description='Dates of creation.',
                ),
                'status': openapi.Schema(
                    type=openapi.TYPE_STRING,
                    description='A new status of games.',
                ),
                'platforms': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_INTEGER),
                    description='New platforms of games.',
                ),
            },
            required=['games'],
            example={
                'games': [123, 234],
                'batch_statuses': {
                    123: 'playing',
                    234: 'dropped'
                },
                'batch_platforms': {
                    123: [1],
                    234: [4, 5],
                },
                'batch_added': {
                    123: '2018-03-23T06:49:49.271280Z',
                    234: '2018-03-23T06:48:49.271280Z',
                },
            },
        ),
        manual_parameters=[
            openapi.Parameter(
                'user_pk', openapi.IN_PATH, type=openapi.TYPE_STRING,
            ),
        ],
    )
    def patch(self, request, user_pk, *args, **kwargs):
        """
        Bulk updating of user games.

        You can use a `batch_statuses` or `status` and a `batch_platforms` or `platforms` body parameters
        to set values per game or for all games respectively. Batch body parameters have priority.
        """
        self.action = 'bulk_update'
        serializer = serializers.UserGameBulkSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        return Response(serializer.bulk_update())

    @swagger_auto_schema(
        operation_id='users_games_delete_bulk',
        request_body=openapi.Schema(
            type=openapi.TYPE_OBJECT,
            properties={
                'games': openapi.Schema(
                    type=openapi.TYPE_ARRAY,
                    items=openapi.Items(type=openapi.TYPE_INTEGER),
                    description='List of game ids.',
                )
            },
            example={
                'games': [123, 234],
            }
        ),
        manual_parameters=[
            openapi.Parameter(
                'user_pk', openapi.IN_PATH, type=openapi.TYPE_STRING,
            ),
        ],
    )
    def delete(self, request, user_pk, *args, **kwargs):
        """
        Bulk deleting of user games.
        """
        self.action = 'bulk_delete'
        serializer = serializers.UserGameBulkSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        return Response(serializer.bulk_destroy())


class UserFavoriteGameViewSet(
    UserRelatedMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.UserFavoriteGame.objects.all()
    serializer_class = serializers.UserFavoriteGameSerializer

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), user_id=self.user_id, position=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list':
            return games_models.Game.objects.defer_all()
        return self.queryset

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            serializer_class = games_serializers.GameSerializer
            kwargs['context'].update(games_models.Game.get_many_context(
                args[0], self.request,
                user_reviews_ratings=self.user,
                user_selected_platforms=self.user,
            ))
        return serializer_class(*args, **kwargs)

    def list(self, request, *args, **kwargs):
        favorites = self.queryset.filter(user_id=self.user_id).order_by('position').values_list('position', 'game_id')
        ids = [game_id for _, game_id in favorites]
        games = self.get_serializer(games_models.Game.objects.defer_all().filter(id__in=ids), many=True).data
        games = {item['id']: item for item in games}
        items = [None for _ in range(models.UserFavoriteGame.MIN_POSITION, models.UserFavoriteGame.MAX_POSITION + 1)]
        for position, game_id in favorites:
            items[position] = games[game_id]
        return Response({
            'count': len(items),
            'results': items,
        })


class UserFollowMixin(UserRelatedMixin, GetObjectMixin):
    @cached_property
    def content_type_id(self):
        return CommonContentType().get(self.content_type_model).id

    def _object(self):
        obj = get_object_or_404(
            self.get_queryset(), user_id=self.user_id, object_id=self.kwargs['pk'],
            content_type_id=self.content_type_id,
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list':
            return self.queryset.filter(content_type_id=self.content_type_id, user_id=self.user_id)
        return self.queryset

    def get_args(self, args, queryset):
        ids = [obj.object_id for obj in args[0]]
        cases = [When(id=pk, then=i) for i, pk in enumerate(ids)]
        position = Case(*cases, default=len(ids), output_field=IntegerField())
        return (queryset.filter(id__in=ids).annotate(position=position).order_by('position'), *args[1:])


class UserFollowUserViewSet(
    FakePaginateMixin, UserFollowMixin, PaginateDetailRouteMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.UserFollowElement.objects.all()
    serializer_class = serializers.UserFollowUserSerializer
    pagination_class = UsersPagination
    content_type_model = get_user_model()

    def get_serializer(self, *args, **kwargs):
        self.pagination_class = UsersPagination
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            args = self.get_args(args, get_user_model().objects.defer_all())
            serializer_class = serializers.UserSerializer
            kwargs['context'].update(get_user_model().get_many_context(args[0], self.request, following=True))
        elif self.action == 'games':
            self.pagination_class = GamePagination
            serializer_class = games_serializers.GameSerializer
            kwargs['context'].update(games_models.Game.get_many_context(args[0], self.request))
        elif self.action == 'reviews':
            self.pagination_class = ReviewPagination
            serializer_class = ReviewMainSerializer
            kwargs['context'].update(models.Review.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    @action(detail=False, permission_classes=[permissions.IsUserStrict])
    def games(self, request, user_pk):
        all_joins = {
            'games_game': 'INNER JOIN games_game ON games_game.id = users_usergame.game_id',
            'games_game_platforms': 'LEFT JOIN games_gameplatform ON games_game.id = games_gameplatform.game_id',
            'games_platform': 'LEFT JOIN games_platform ON games_gameplatform.platform_id = games_platform.id',
        }
        joins = {}
        args = [self.user_id, self.content_type_id]
        where = ''
        group_by = '1'
        order_by = '2 DESC'

        dates = split_dates(request.GET.get('dates'))
        if dates:
            args += [dates[0], dates[1]]
            where = f'AND games_game.released BETWEEN %s AND %s'
            joins['games_game'] = all_joins['games_game']

        parent_platforms = filter_int_or_none(request.GET.get('parent_platforms'))
        if parent_platforms:
            args += parent_platforms
            templates = ', '.join('%s' for _ in enumerate(parent_platforms))
            where += ' AND games_platform.parent_id IN ({})'.format(templates)
            joins['games_game'] = all_joins['games_game']
            joins['games_game_platforms'] = all_joins['games_game_platforms']
            joins['games_platform'] = all_joins['games_platform']

        platforms = filter_int_or_none(request.GET.get('platforms'))
        if platforms:
            args += platforms
            templates = ', '.join('%s' for _ in enumerate(platforms))
            where += ' AND games_gameplatform.platform_id IN ({})'.format(templates)
            joins['games_game'] = all_joins['games_game']
            joins['games_game_platforms'] = all_joins['games_game_platforms']

        ordering = request.GET.get('ordering')
        if ordering:
            order = 'DESC' if ordering.startswith('-') else 'ASC'
            field = ordering.lstrip('-')
            if field in ORDERING_FIELDS:
                if field == 'created':
                    order_by = f'2 {order}'
                else:
                    order_by = f'games_game.{field} {order}'
                    group_by += f', games_game.{field}'
                    joins['games_game'] = all_joins['games_game']

        with connection.cursor() as cursor:
            cursor.execute(
                f'''
                SELECT COUNT(*) FROM (
                    SELECT DISTINCT users_usergame.game_id
                    FROM users_usergame
                    {' '.join(joins.values())}
                    WHERE
                        users_usergame.user_id IN (
                            SELECT object_id FROM users_userfollowelement WHERE user_id = %s AND content_type_id = %s
                        )
                        {where}
                ) sub
                ''',
                args
            )
            count = cursor.fetchone()[0]

        args = self.raw_paginate(request, count, args)
        fields = ', '.join(f'games_game.{field}' for field in games_models.Game.objects.raw_list_fields)
        rows = list(games_models.Game.objects.raw(
            f'''
            SELECT {fields}, earliest, users_ids FROM (
                SELECT
                    users_usergame.game_id,
                    MIN(users_usergame.created) AS earliest,
                    ARRAY_AGG(users_usergame.user_id) AS users_ids
                FROM users_usergame
                {' '.join(joins.values())}
                WHERE
                    users_usergame.user_id IN (
                        SELECT object_id FROM users_userfollowelement WHERE user_id = %s AND content_type_id = %s
                    )
                    {where}
                GROUP BY {group_by}
                ORDER BY {order_by}
                LIMIT %s OFFSET %s
            ) sub
            INNER JOIN games_game ON (games_game.id = sub.game_id)
            ''',
            args,
        ))

        last_date = None
        if request.query_params.get('page', 1) == 1:
            last_date, last_date_key = request.user.get_following_games_last_date()
            save_user_setting.delay(request.user.id, last_date_key, now().isoformat())

        earliest = {row.id: row.earliest for row in rows}
        games_users = {row.id: row.users_ids[0:10] for row in rows}
        users_ids = {user_id for users in games_users.values() for user_id in users}
        users = get_user_model().objects.defer_all().in_bulk(users_ids)

        context = self.get_serializer_context()
        serializer = self.get_serializer(rows, many=True, context=context)
        response = self.get_paginated_response(serializer.data)
        for row in response.data['results']:
            row['friends'] = [
                serializers.UserSerializer(users[user_id], context=context).data
                for user_id in games_users.get(row['id'], [])
            ]
            row['is_new'] = earliest[row['id']] > last_date if last_date else False
        return response

    @action(detail=False, url_path='games/years')
    def games_years(self, request, user_pk):
        result = models.UserGame.objects.visible().filter(
            user_id__in=models.UserFollowElement.objects.filter(
                user_id=self.user_id, content_type_id=self.content_type_id
            ).values_list('object_id')) \
            .annotate(released_year=ExtractYear('game__released')) \
            .filter(released_year__gt=1900) \
            .values_list('released_year') \
            .annotate(count=Count('id')) \
            .order_by('released_year')
        years = games_formats.years(result.values_list('released_year', flat=True))
        return Response({
            'count': len(years),
            'results': years,
        })

    @action(detail=False, permission_classes=[permissions.IsUserStrict])
    def reviews(self, request, user_pk):
        users = (
            UserFollowElement.objects
            .filter(user_id=request.user.id, content_type_id=CommonContentType().get(get_user_model()).id)
            .values_list('object_id', flat=True)
        )
        return self.get_paginated_detail_response(
            models.Review.objects.following(request, users),
            count_queryset=models.Review.objects.following_count(users)
        )


class UserFollowCollectionViewSet(
    UserFollowMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.UserFollowElement.objects.all()
    serializer_class = serializers.UserFollowCollectionSerializer
    pagination_class = GamePagination
    content_type_model = games_models.Collection

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            args = self.get_args(args, games_models.Collection.objects.prefetch_related(
                Prefetch('creator', queryset=get_user_model().objects.defer_all())
            ))
            serializer_class = games_serializers.CollectionSerializer
            full = true(self.request.GET.get('with_games'))
            kwargs['context'].update(games_models.Collection.get_many_context(args[0], full))
            kwargs['context'].update({'following_collections': True})
        return serializer_class(*args, **kwargs)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='List UserFollowElements.',
))
@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Create a UserFollowElement.',
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete a UserFollowElement.',
    manual_parameters=[
        openapi.Parameter(
            'id', openapi.IN_PATH, description='An ID identifying this UserFollowElement: {instance}:{object_id}.',
            type=openapi.TYPE_STRING, required=True,
        ),
    ],
))
class UserFollowElementViewSet(
    UserFollowMixin, PaginateDetailRouteMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.UserFollowElement.objects.all()
    serializer_class = serializers.UserFollowElementSerializer
    pagination_class = ListPagination
    permission_classes = [permissions.IsUserStrict]

    def _object(self):
        try:
            instance, pk = self.kwargs['pk'].split(':', maxsplit=1)
        except ValueError:
            raise Http404
        if not models.UserFollowElement.INSTANCES.get(instance):
            raise Http404
        obj = get_object_or_404(
            self.get_queryset(), user_id=self.user_id, object_id=pk,
            content_type_id=CommonContentType().get(models.UserFollowElement.INSTANCES[instance]).id,
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list':
            cases = [
                When(content_type_id=CommonContentType().get(model).id, then=i)
                for i, model in enumerate(models.UserFollowElement.INSTANCES_ORDERING)
            ]
            position = Case(*cases, default=0, output_field=IntegerField())
            return self.queryset.filter(user_id=self.user_id) \
                .exclude(content_type_id=CommonContentType().get(get_user_model()).id) \
                .prefetch_related('content_type') \
                .annotate(position=position) \
                .order_by('position', '-added') \
                .only('id', 'object_id', 'content_type_id', 'last_viewed_id')
        return self.queryset

    def get_count_queryset(self):
        return self.queryset.filter(user_id=self.user_id) \
            .exclude(content_type_id=CommonContentType().get(get_user_model()).id).count()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            kwargs['context'].update(models.UserFollowElement.get_many_context(args[0], self.request))
        elif self.action in ('games', 'games_list'):
            serializer_class = games_serializers.GameSerializer
            kwargs['context'].update(games_models.Game.get_many_context(args[0], self.request))
            if self.action == 'games':
                kwargs['context'].update({'games_add_field': 'relation_id'})
        return serializer_class(*args, **kwargs)

    def list(self, request, *args, **kwargs):
        response = self.get_paginated_detail_response(
            self.filter_queryset(self.get_queryset()),
            count_queryset=self.get_count_queryset()
        )
        response.data['results'] = [
            row for row in response.data['results']
            if not row.get('object_id') and row.get('id')
        ]

        sqls = []
        args = []
        for row in response.data['results']:
            table_name = models.UserFollowElement.INSTANCES_ID_TABLES[row['instance']]
            field_name = f'{row["instance"]}_id'
            sqls.append(
                f"SELECT '{row['instance']}:' || {field_name}, id FROM {table_name} "
                f"WHERE {field_name} = %s ORDER BY 2 DESC LIMIT 1"
            )
            args.append(row['id'])
        last_viewed_ids = {}
        if sqls:
            with connection.cursor() as cursor:
                cursor.execute(f'({") union all (".join(sqls)})', args)
                last_viewed_ids = dict(cursor.fetchall())
        for row in response.data['results']:
            key = last_viewed_ids.get(f'{row["instance"]}:{row["id"]}')
            row['is_new'] = key > row['last_viewed_id'] if row['last_viewed_id'] and key else False
            del row['last_viewed_id']

        response.data['friends'] = {'is_new': False}
        with connection.cursor() as cursor:
            cursor.execute(
                '''
                SELECT MIN(created)
                FROM users_usergame
                WHERE user_id IN (
                    SELECT object_id FROM users_userfollowelement WHERE user_id = %s AND content_type_id = %s
                )
                GROUP BY game_id
                ORDER BY 1 DESC
                LIMIT 1
                ''',
                [self.user_id, CommonContentType().get(get_user_model()).id]
            )
            last_game_date = cursor.fetchone()
            last_game_date = last_game_date[0] if last_game_date else None
        last_date, _ = request.user.get_following_games_last_date()
        if last_date and last_game_date:
            response.data['friends']['is_new'] = last_game_date > last_date

        return response

    @action(detail=True)
    def games(self, request, pk, user_pk):
        model = self.get_object().content_type.model_class()
        object_id = self.get_object().object_id
        last_viewed_id = self.get_object().last_viewed_id
        qs = models.UserFollowElement.INSTANCES_GAME_QUERIES.get(model)
        if not qs:
            raise Http404
        table = models.UserFollowElement.INSTANCES_ID_TABLES.get(self.get_object().content_type.model)
        kwargs, distinct = qs(object_id)
        games = games_models.Game.objects.defer_all().filter(**kwargs).extra(
            order_by=[f'-{table}.id'],
            select={'relation_id': f'{table}.id'}
        )
        if distinct:
            games = games.distinct()
        response = self.get_paginated_detail_response(
            games,
            count_queryset=model.objects.values_list('games_count', flat=True).get(id=object_id),
        )

        new_last_viewed_id = response.data['results'][0]['relation_id'] if response.data['results'] else None
        if request.query_params.get('page', 1) == 1 and new_last_viewed_id and last_viewed_id != new_last_viewed_id:
            save_user_follow_element_last_viewed_id.delay(
                request.user.id, object_id, self.get_object().content_type_id, new_last_viewed_id
            )

        for row in response.data['results']:
            row['is_new'] = row['relation_id'] > last_viewed_id if last_viewed_id else False
            del row['relation_id']
        return response

    @action(detail=False, url_path='games')
    def games_list(self, request, user_pk):
        qs = UserRecommendation.objects.visible().filter(
            user=request.user, sources=[UserRecommendation.SOURCES_SUBSCRIBE]
        )
        qs = games_models.Game.objects.recent_games_main_auth(games_ids=qs.values_list('game_id', flat=True))
        save_user_follow_element_last_viewed_ids.delay(request.user.id)
        return self.get_paginated_detail_response(qs)


class UserViewSet(
    SearchPaginateMixin, SlugLookupMixin, GetUserFromRequestMixin, PaginateDetailRouteMixin,
    mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet
):
    queryset = get_user_model().objects
    serializer_class = serializers.UserSingleSerializer
    pagination_class = UsersPagination
    permission_classes = (permissions.IsUser,)
    filter_backends = (filters.UserSearchFilter, filters.UserSearchBackend)
    search_fields = ('name',)
    is_current = False
    lookup_value_regex = '[^/]+'

    def get_queryset(self):
        if self.action == 'list':
            return self.queryset.filter(id=0)
        elif self.action in ('import_waiting', 'games_years', 'games_recently'):
            return self.queryset.only('id', 'username')
        elif self.action in ('games_platforms', 'games_platforms_parents', 'games_genres'):
            return self.queryset.only('id', 'username', 'statistics')
        elif self.action in ('statistics', 'similar') or self.action.startswith('statistics_'):
            return self.queryset.defer_all('statistics')
        elif self.action in ('followers', 'reviews', 'collections', 'collections_by_game', 'collections_by_object'):
            return self.queryset.defer_all()
        return super().get_queryset()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        if not kwargs.get('context'):
            kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            request = self.request
            if getattr(self, 'is_search', None):
                serializer_class = serializers.UserSearchSerializer
                request = None
            kwargs['context'].update(get_user_model().get_many_context(args[0], request))
        elif self.action == 'similar':
            serializer_class = serializers.UserSerializer
            kwargs['context'].update(get_user_model().get_many_context(args[0], self.request))
        elif self.action == 'retrieve' and is_request:
            kwargs['context']['following_users'] = False
            kwargs['context'].update(self.get_object().get_context(self.request, self.is_current))
        elif self.action == 'followers':
            serializer_class = games_serializers.UserSerializer
            kwargs['context'].update(get_user_model().get_many_context(args[0], self.request))
        elif self.action == 'collections':
            serializer_class = games_serializers.CollectionSerializer
            full = true(self.request.GET.get('with_games'))
            kwargs['context'].update(games_models.Collection.get_many_context(args[0], full, self.request))
        elif self.action in ('reviews', 'reviews_top'):
            self.pagination_class = ReviewPagination
            serializer_class = ReviewMainSerializer
            if self.action == 'reviews':
                kwargs['context'].update(Review.get_many_context(args[0], self.request))
                kwargs['context'].update({'is_one_user': True})
            else:
                kwargs['context'].update(Review.get_many_context(args[0], self.request, False))
        elif self.action in ('games_recently', 'statistics', 'statistics_years') and is_request:
            serializer_class = games_serializers.GameSerializer
            kwargs['context'].update(games_models.Game.get_many_context(
                args[0], self.request,
                user_reviews_ratings=self.get_object(),
                user_selected_platforms=self.get_object(),
            ))
        return serializer_class(*args, **kwargs)

    def get_statistic(self, target, request):
        is_all = False
        targets = request.GET.get('get') or None
        if targets and target == 'all':
            targets = targets.split(',')
        elif target == 'all':
            is_all = True
            targets = []
        else:
            targets = [target]

        user = self.get_object()
        data = {}

        if 'games' in targets or is_all:
            data['games'] = {
                'count': user.games_count,
                'statuses': self.get_games_statuses(user),
                'graph': self.get_graph((user.statistics or {}).get('games_graph') or []),
            }

        if 'reviews' in targets or is_all:
            data['reviews'] = {
                'count': user.reviews_count,
                'ratings': self.get_reviews_ratings(user),
                'graph': self.get_graph((user.statistics or {}).get('reviews_graph') or []),
            }

        if 'collections' in targets or is_all:
            data['collections'] = {
                'count': user.collections_count,
                'items': self.get_collections_last(user),
                'graph': self.get_graph((user.statistics or {}).get('collections_graph') or []),
            }

        get_statistic_data(data, user.statistics, targets, self.request, is_all)

        if 'timeline' in targets or is_all:
            data['timeline'] = (user.statistics or {}).get('years') or []
            for row in data['timeline']:
                row['decade'] = row['year'] in user.get_statistic_decades()

        if 'years' in targets or is_all:
            years = (user.statistics or {}).get('years_top') or []
            games_ids = []
            for year in years:
                games_ids += year['games']
            if games_ids:
                games = games_models.Game.objects.defer_all().order_by('-added').in_bulk(games_ids)
                games_data = {row['id']: row for row in self.get_serializer(games.values(), many=True).data}
                for year in years:
                    rows = []
                    for game_id in year['games']:
                        if not games_data.get(game_id):
                            continue
                        rows.append(games_data[game_id])
                    year['games'] = rows
            data['years'] = years

        if len(data) == 1:
            return list(data.values()).pop()
        return data

    @staticmethod
    def get_games_statuses(user):
        games_statuses = []
        percent = user.games_count / 100
        for stat, count in ((user.statistics or {}).get('games_statuses') or {}).items():
            if stat == 'owned':
                continue
            games_statuses.append({
                'status': stat,
                'count': count,
                'percent': round(count / percent, 2) if percent else 0,
            })
        return sorted(games_statuses, key=lambda x: -x['count'])

    @staticmethod
    def get_reviews_ratings(user):
        reviews = (user.statistics or {}).get('reviews_ratings') or []
        percent = user.reviews_count / 100
        for review in reviews:
            review['percent'] = round(review['count'] / percent, 2) if percent else 0
        exists = [review['id'] for review in reviews]
        for rating, title in Review.RATINGS:
            if rating not in exists:
                reviews.append({
                    'id': rating,
                    'title': title,
                    'count': 0,
                    'percent': 0,
                })
        return reviews

    @staticmethod
    def get_collections_last(user):
        result = []
        collections_last = (user.statistics or {}).get('collections_items') or []
        if collections_last:
            collections = games_models.Collection.objects.only('name', 'slug', 'games_count').in_bulk(collections_last)
            for pk in collections_last:
                collection = collections.get(pk)
                if not collection:
                    continue
                result.append({
                    'id': pk, 'name': collection.name, 'slug': collection.slug, 'count': collection.games_count,
                })
        return result

    @staticmethod
    def get_graph(data):
        week = now().isocalendar()[1]
        template = OrderedDict([(num, (num, 0)) for num in range(week - 9, week + 1)])
        for row in data:
            if row[0] not in template:
                continue
            template[row[0]] = row
        return [{'week': row[0], 'count': row[1]} for row in template.values()]

    @action(detail=True)
    def statistics(self, request, pk):
        return Response(self.get_statistic('all', request))

    @action(detail=True, url_path='statistics/games')
    def statistics_games(self, request, pk):
        return Response(self.get_statistic('games', request))

    @action(detail=True, url_path='statistics/reviews')
    def statistics_reviews(self, request, pk):
        return Response(self.get_statistic('reviews', request))

    @action(detail=True, url_path='statistics/collections')
    def statistics_collections(self, request, pk):
        return Response(self.get_statistic('collections', request))

    @action(detail=True, url_path='statistics/platforms')
    def statistics_platforms(self, request, pk):
        return Response(self.get_statistic('platforms', request))

    @action(detail=True, url_path='statistics/genres')
    def statistics_genres(self, request, pk):
        return Response(self.get_statistic('genres', request))

    @action(detail=True, url_path='statistics/developers')
    def statistics_developers(self, request, pk):
        return Response(self.get_statistic('developers', request))

    @action(detail=True, url_path='statistics/timeline')
    def statistics_timeline(self, request, pk):
        return Response(self.get_statistic('timeline', request))

    @action(detail=True, url_path='statistics/years')
    def statistics_years(self, request, pk):
        return Response(self.get_statistic('years', request))

    @action(detail=True, url_path='games/platforms')
    def games_platforms(self, request, pk):
        platforms = []
        stat = self.get_object().statistics or {}
        key = 'games_platforms_to_play' if true(request.GET.get('toplay')) else 'games_platforms_all'
        for platform in stat.get(key, stat.get('games_platforms', [])):
            platforms.append({
                'count': platform['count'],
                'percent': platform['percent'],
                'platform': {
                    'id': platform['platform'],
                    'name': platform['name'],
                    'slug': platform['slug'],
                },
            })
        return Response({
            'count': len(platforms),
            'results': platforms,
        })

    @action(detail=True, url_path='games/platforms/parents')
    def games_platforms_parents(self, request, pk):
        parents_all = PlatformParentListByPlatform().get()
        parents = set()
        parents_children = {}
        stat = self.get_object().statistics or {}
        key = 'games_platforms_to_play' if true(request.GET.get('toplay')) else 'games_platforms_all'
        for platform in stat.get(key, stat.get('games_platforms', [])):
            parent = parents_all.get(platform['platform'])
            if not parent:
                continue
            parents.add(parent)
            parents_children.setdefault(parent.id, []).append({
                'id': platform['platform'],
                'name': platform['name'],
                'slug': platform['slug'],
            })
        data = []
        for parent in sorted(parents, key=lambda x: x.order):
            data.append({
                'id': parent.id,
                'name': parent.name,
                'slug': parent.slug,
                'platforms': parents_children[parent.id],
            })
        return Response({
            'count': len(data),
            'results': data,
        })

    @action(detail=True, url_path='games/genres')
    def games_genres(self, request, pk):
        genres = []
        for genre in (self.get_object().statistics or {}).get('games_genres', []):
            genres.append({
                'count': genre['count'],
                'percent': genre['percent'],
                'genre': {
                    'id': genre['genre'],
                    'name': genre['name'],
                    'slug': genre['slug'],
                },
            })
        return Response({
            'count': len(genres),
            'results': genres,
        })

    @action(detail=True, url_path='games/years')
    def games_years(self, request, pk):
        years = games_formats.years(self.get_object().get_years(to_play=true(request.GET.get('toplay'))))
        return Response({
            'count': len(years),
            'results': years,
        })

    @action(detail=True, url_path='games/recently')
    def games_recently(self, request, pk):
        user_games = dict(models.UserGame.objects.visible()
                          .filter(user_id=self.get_object().id)
                          .values_list('game_id', 'created')
                          .order_by('-created')[0:9])
        games = games_models.Game.objects.defer_all().filter(id__in=user_games.keys())
        items = self.get_serializer(games, many=True).data
        for item in items:
            item['month'] = user_games[item['id']].month
        items = sorted(items, key=lambda x: user_games[x['id']], reverse=True)
        return Response({
            'count': len(items),
            'results': items,
        })

    @action(detail=True)
    def collections(self, request, pk):
        self.pagination_class = CollectionPagination
        self.filter_backends = ()
        user = self.get_object()
        collections = user.collections.prefetch()
        if not request.user.is_authenticated or request.user.id != user.id:
            collections = collections.filter(is_private=False)
        search = request.GET.get('search')
        if search:
            collections = collections.filter(name__icontains=search)
        return self.get_paginated_detail_response(collections)

    @action(detail=True, url_path=r'collections/(?P<game_id>[-_\w]+)')
    def collections_by_game(self, request, pk, game_id):
        kwargs = {'slug': game_id}
        if game_id.isdigit():
            kwargs = {'id': game_id}
        game = get_object_or_404(games_models.Game.objects.all(), **kwargs)
        user = self.get_object()
        queryset = self.filter_queryset(user.collections.all())[0:10]
        serializer = games_serializers.CollectionByGameSerializer(
            queryset, many=True, context={
                'game_collections': game.collectiongame_set.values_list('collection_id', flat=True),
            },
        )
        return Response(serializer.data)

    @action(detail=True, url_path=r'collections/(?P<content_type>[-_\w]+)/(?P<object_id>[\d]+)')
    def collections_by_object(self, request, pk, content_type, object_id):
        user = self.get_object()
        variants = {
            'discussion': {'model': 'discussion', 'app_label': 'discussions'},
            'review': {'model': 'review', 'app_label': 'reviews'},
            'discussion_comment': {'model': 'commentdiscussion', 'app_label': 'comments'},
            'review_comment': {'model': 'commentreview', 'app_label': 'comments'},
        }
        try:
            content_type = ContentType.objects.get(**variants[content_type])
        except KeyError:
            return Response({'content_type': ['Bad content type']}, status=status.HTTP_400_BAD_REQUEST)
        queryset = self.filter_queryset(user.collections.all())[0:10]
        serializer = games_serializers.CollectionByItemSerializer(
            queryset, many=True, context={
                'item_collections': games_models.CollectionFeed.objects.filter(
                    collection__creator_id=user.id,
                    content_type_id=content_type,
                    object_id=object_id,
                ).values_list('collection_id', flat=True),
            },
        )
        return Response(serializer.data)

    @action(detail=True)
    def followers(self, request, pk):
        queryset = UserFollowElement.objects.filter(
            object_id=self.get_object().id,
            content_type=CommonContentType().get(get_user_model())
        ).prefetch_related(
            Prefetch('user', queryset=self.get_queryset())
        )
        count_queryset = self.get_object().followers_count
        page = self.paginator.paginate_count_queryset(queryset, count_queryset, self.request, view=self)
        serializer = self.get_paginated_detail_serializer([el.user for el in page])
        return self.get_paginated_response(serializer.data)

    @action(detail=True)
    def reviews(self, request, pk):
        data = self.get_object().reviews.visible().prefetch_related('reactions', 'game')
        rating = int_or_none(request.GET.get('rating'))
        if rating:
            data = data.filter(rating=rating)
        is_text = true(request.GET.get('is_text'))
        if is_text:
            data = data.filter(is_text=True)
        response = self.get_paginated_detail_response(data)
        counters = self.get_object().get_reviews_counters(is_text)
        response.data['ratings'] = {
            'count': len(counters),
            'results': counters,
            'total': sum([rating['count'] for rating in counters]),
        }
        return response

    @action(detail=True, url_path='reviews/top')
    def reviews_top(self, request, pk):
        data = self.get_object().reviews.visible().filter(is_text=True, likes_rating__gt=0) \
                   .prefetch_related('reactions', 'game').order_by('-likes_rating')[0:6]
        items = self.get_serializer(data, many=True).data
        return Response({
            'count': len(items),
            'results': items,
        })

    @action(detail=True)
    def persons(self, request, pk):
        ids = (self.get_object().statistics or {}).get('persons_top') or []
        cases = [When(id=pk, then=i) for i, pk in enumerate(ids)]
        position = Case(*cases, default=len(ids), output_field=IntegerField())
        qs = Person.objects.filter(id__in=ids[0:9]).annotate(position=position).order_by('position')
        context = self.get_serializer_context()
        context.update(Person.get_many_context(qs, self.request, True))
        items = GamePersonListSerializer(qs, many=True, context=context).data
        return Response({
            'count': len(items),
            'results': items,
        })

    @action(detail=True, url_path='import-waiting')
    def import_waiting(self, request, pk):
        user = self.get_object()
        position_in_queue = Import.position_in_queue(user.id)
        approximate_seconds = 0
        if position_in_queue:
            approximate_seconds = Import.approximate_seconds(position_in_queue)
        return Response({
            'position_in_queue': position_in_queue,
            'approximate_seconds': approximate_seconds,
        })

    @action(detail=True)
    def similar(self, request, pk):
        count = 5
        similar_users = (self.get_object().statistics or {}).get('recommended_users') or []
        following = models.UserFollowElement.objects.filter(
            user_id=self.get_object().id,
            content_type=CommonContentType().get(get_user_model()),
            object_id__in=[u['user'] for u in similar_users],
        ).values_list('object_id', flat=True)
        similar_users = [u for u in similar_users if u['user'] not in following]
        if not similar_users:
            qs = get_user_model().objects \
                .exclude(Q(id=self.get_object().id) | Q(reviews_text_count=0)) \
                .order_by('-reviews_text_count')[0:count]
        else:
            ids = [u['user'] for u in similar_users][0:count]
            cases = [When(id=pk, then=i) for i, pk in enumerate(ids)]
            position = Case(*cases, default=len(ids), output_field=IntegerField())
            qs = self.get_queryset().filter(id__in=ids).annotate(position=position).order_by('position')
        items = self.get_serializer(qs, many=True).data
        for i, item in enumerate(items):
            item['games'] = []
            if similar_users:
                item['percent'] = similar_users[i]['percent']
                item['games'] = similar_users[i]['games'][0:3]
        return Response({
            'count': len(items),
            'results': items,
        })

    @action(detail=True, methods=['post', 'delete'])
    def setting(self, request, pk):
        key = request.data.get('key')
        if not key:
            return Response({'key': 'Key is not set'}, status.HTTP_400_BAD_REQUEST)
        user = self.get_object()
        if not user.settings:
            user.settings = {}
        if request.method.lower() == 'delete':
            del user.settings[key]
        else:
            value = request.data.get('value')
            if 'value' not in request.data:
                return Response({'value': 'Value is not set'}, status.HTTP_400_BAD_REQUEST)
            user.settings[key] = value
        user.save(update_fields=['settings'])
        return Response(user.settings)

    @action(detail=True, methods=['post'], url_path='confirm-accounts', permission_classes=[IsAuthenticated])
    def confirm_accounts(self, request, pk):
        confirm = request.data.get('account') or 'all'
        result = {}
        fields = []
        if confirm in ('steam_id', 'all'):
            try:
                fields = steam.get_account_confirmation(request.user, fields)
                result['steam_id'] = {
                    'confirmed': True,
                }
            except steam.SteamAPIException as e:
                result['steam_id'] = {
                    'confirmed': False,
                    'error': str(e),
                }
        if confirm in ('gamer_tag', 'all'):
            try:
                fields = xbox.get_account_confirmation(request.user, fields)
                result['gamer_tag'] = {
                    'confirmed': True,
                }
            except xbox.XboxAPIException as e:
                result['gamer_tag'] = {
                    'confirmed': False,
                    'error': str(e),
                }
        if confirm in ('psn_online_id', 'all'):
            try:
                fields = psn.get_account_confirmation(request.user, fields)
                result['psn_online_id'] = {
                    'confirmed': True,
                }
            except psn.PlayStationAPIException as e:
                result['psn_online_id'] = {
                    'confirmed': False,
                    'error': str(e),
                }
        if fields:
            request.user.save(update_fields=fields)
        return Response(result, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def export(self, request, pk):
        def date_format(date, only_date=False):
            if not date:
                return ''
            return date.strftime('%Y-%m-%d' if only_date else '%Y-%m-%d %H:%M:%S')
        ratings_ru = {
            'exceptional': 'Шедевр',
            'recommended': 'Советую',
            'meh': 'Так себе',
            'skip': 'Ужасно',
        }
        statuses_ru = {
            'uncategorized': 'Без категории',
            'wishlist': 'Вишлист',
            'currently playing': 'Играю',
            'completed': 'Пройдено',
            'played': 'Заброшено',
            'not played': 'В планах',
        }
        user = self.get_object()
        if request.user.id != user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        cache_key = f'{user.slug}#{request.LANGUAGE_CODE}'
        response = cache.get(cache_key)
        if response is None:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="{user.slug}.csv"'
            writer = csv.writer(response)
            writer.writerow([
                'Game', 'Released', 'Game platforms', 'Status', 'Played on', 'Created', 'Updated',
                'Rating', 'Review', 'Rating Created', 'Url'
            ])
            user_games = (
                models.UserGame.objects.visible()
                .prefetch_related(
                    Prefetch('game', queryset=games_models.Game.objects.only(
                        'id', 'slug', 'name', 'released', 'tba', 'platforms_json'
                    ))
                )
                .filter(user_id=user.id)
                .prefetch_related(Prefetch('platforms', queryset=games_models.Platform.objects.only('name')))
                .only('id', 'added', 'created', 'game_id', 'status')
            )
            user_reviews = (
                Review.objects.visible()
                .prefetch_related(
                    Prefetch('game', queryset=games_models.Game.objects.only(
                        'id', 'slug', 'name', 'released', 'tba', 'platforms_json'
                    ))
                )
                .filter(user_id=user.id)
                .only('id', 'text_bare', 'rating', 'created', 'game_id')
            )
            reviews = {}
            for user_review in user_reviews:
                reviews[user_review.game_id] = {
                    'rating': ratings_ru[user_review.get_rating_display().lower()]
                    if request.LANGUAGE_CODE == settings.LANGUAGE_RU else user_review.get_rating_display(),
                    'text': user_review.text_bare,
                    'created': user_review.created,
                    'game': user_review.game,
                }
            for user_game in user_games:
                review = reviews.get(user_game.game_id)
                writer.writerow([
                    user_game.game.name,
                    date_format(user_game.game.released, True) if not user_game.game.tba else 'TBA',
                    ', '.join([platform['platform']['name'] for platform in user_game.game.platforms_json or []]),
                    statuses_ru[user_game.get_status_display().lower()]
                    if request.LANGUAGE_CODE == settings.LANGUAGE_RU else user_game.get_status_display(),
                    ', '.join([platform.name for platform in user_game.platforms.all()]),
                    date_format(user_game.created),
                    date_format(user_game.added),
                    review['rating'] if review else '',
                    review['text'] if review else '',
                    date_format(review['created']) if review else '',
                    f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/{user_game.game.slug}'
                ])
                if review:
                    del reviews[user_game.game_id]
            for review in reviews.values():
                writer.writerow([
                    review['game'].name,
                    date_format(review['game'].released, True) if not review['game'].tba else 'TBA',
                    ', '.join([platform['platform']['name'] for platform in review['game'].platforms_json]),
                    '',
                    '',
                    '',
                    '',
                    review['rating'],
                    review['text'],
                    date_format(review['created']),
                    f'{settings.SITE_PROTOCOL}://{get_site_by_current_language().name}/games/{review["game"].slug}'
                ])
            cache.set(cache_key, response, 180)
        return response

    @action(detail=True, methods=['post'], url_path='delete', permission_classes=[IsAuthenticated])
    def user_delete(self, request, pk):
        password = request.data.get('password')
        if not password:
            return Response({'password': 'The password is not set'}, status.HTTP_400_BAD_REQUEST)
        user = self.get_object()
        if request.user.id != user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        if not user.check_password(password):
            return Response({'password': 'The password is not valid'}, status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            EmailAddress.objects.filter(user=user).delete()
            user.email = f'{user.id}@steam.com'
            user.slug = f'deleted_{user.id}'
            user.username = f'deleted_{user.id}'
            user.full_name = f'deleted_{user.id}'
            user.save(update_fields=['email', 'slug', 'username', 'full_name'])
            delete_user.delay(user.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, url_path='api-requests', permission_classes=[IsAuthenticated])
    def api_requests(self, request, pk):
        from apps.utils.middlewares import _api_counter
        user = self.get_object()
        if request.user.id != user.id:
            return Response(status=status.HTTP_403_FORBIDDEN)
        api_limit = settings.API_LIMITS[request.user.api_group] or 0
        date_from, date_to = user.api_dates
        db = sum(
            APIUserCounter.objects
            .filter(user_id=user.id, date__gte=date_from)
            .values_list('count', flat=True)
        )
        memory = _api_counter.get(user.id, 0)
        return Response(
            {
                'count': api_limit - db,
                'date_from': datetime.combine(date_from, datetime.min.time()).isoformat(),
                'date_to': datetime.combine(date_to, datetime.min.time()).isoformat(),
                '_db': db,
                '_memory': memory,
                '_limit': api_limit,
            },
            status=status.HTTP_200_OK,
        )


class PlayerView(APIView):
    permission_classes = ()
    serializer_class = serializers.PlayerSerializer

    def get(self, request):
        players = self.get_players(request)
        serializer = self.serializer_class(players, many=True)
        return Response(serializer.data)

    def get_players(self, request):
        params_serializer = serializers.GetPlayersParamSerializer(data=request.query_params)
        params_serializer.is_valid(raise_exception=True)
        uids = params_serializer.validated_data['players_ids']
        return list(models.PlayerBase.all_by_uids(uids))


class SubscriptionView(ListCreateAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = serializers.SubscriptionSerializer
    filter_backends = (DjangoFilterBackend,)
    filterset_class = filters.SubscriptionFilterSet
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def get_queryset(self):
        return models.Subscription.objects.filter(user=self.request.user).select_related('program')
