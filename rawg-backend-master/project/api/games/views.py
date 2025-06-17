import math
import operator
import os
import re
from collections import Counter
from datetime import datetime
from typing import List, Optional
from urllib.parse import urlparse

import pytz
from dateutil.relativedelta import relativedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from django.db.models import BooleanField, Case, Count, F, IntegerField, Prefetch, Value, When
from django.db.models.expressions import Col
from django.http import Http404
from django.utils.decorators import method_decorator
from django.utils.functional import cached_property
from django.utils.timezone import now
from django.views.decorators.cache import cache_page
from django_filters.rest_framework.backends import DjangoFilterBackend
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.generics import ListAPIView, get_object_or_404
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.reverse import reverse
from rest_framework.views import APIView

from api.comments.views import BaseCommentViewSet, BaseLikeViewSet
from api.credits.serializers import GamePersonCreateSerializer, GamePersonListSerializer, GamePersonUpdateSerializer
from api.discussions.paginations import DiscussionPagination
from api.discussions.serializers import DiscussionSerializer
from api.files.serializers import FileSerializer
from api.functions import is_docs
from api.games import filters, formats, paginations, permissions, serializers
from api.games.paginations import ExternalPagination
from api.paginations import PageNumberCountPagination
from api.reviews.paginations import ReviewPagination
from api.reviews.serializers import EditorialReviewSerializer, ReviewSerializer, VersusSerializer
from api.users.permissions import IsUserOwner, IsUserRealEmail
from api.users.serializers import UserSerializer
from api.views_mixins import (
    CacheListAnonMixin, CacheListMixin, DisableEditingMixin, DisablePutMixin, FakePaginateMixin, GetObjectMixin,
    PaginateDetailRouteMixin, RestrictDeletingMixin, SearchPaginateMixin, SlugLookupMixin,
)
from apps.achievements.models import ParentAchievement
from apps.comments.models import CommentCollectionFeed, LikeCollectionFeed
from apps.common import seo
from apps.common.cache import CommonContentType
from apps.common.seo import games_list_seo
from apps.credits.models import GamePerson, Person
from apps.discussions.models import Discussion
from apps.files.models import File
from apps.games import cache, models
from apps.games.cache import PlatformList, PlatformListMain, PlatformParentListByPlatform
from apps.games.tasks import increment_plays, touch_game_visit
from apps.recommendations.models import UserRecommendation
from apps.reviews.models import Review, Versus
from apps.stat.tasks import add_recommendations_visit, add_recommended_game_visit
from apps.users.models import AuthenticatedPlayer, PlayerBase, UserFollowElement, UserGame
from apps.users.tasks import save_user_last_games_show_similar
from apps.utils.api import filter_int_or_none, int_or_none, true
from apps.utils.dates import first_day_of_month, split_dates, tomorrow, yesterday
from apps.utils.db import join
from apps.utils.decorators import headers
from apps.utils.dicts import find
from apps.utils.game_session import CommonPlayerGameSessionData, PlayHistory
from apps.utils.lang import get_languages_condition
from apps.utils.oauth2 import OAuth2Authentication, TokenHasScope
from apps.utils.rest_framework import BinaryParser, CsrfExemptSessionAuthentication
from functions.drf import DetailPaginated, GetObject
from implemented.external import ShowReddit
from implemented.files import ShowCheatCodes


class SearchSerializerMixin:
    def get_serializer_class(self):
        if getattr(self, 'is_search', None):
            return self.search_serializer_class
        return super().get_serializer_class()


class GameRelatedMixin:
    game_related_fields = ('slug',)

    @cached_property
    def game_kwargs(self):
        game_id = self.kwargs.get('game_pk')
        return {'id' if game_id.isdigit() else 'slug': game_id}

    @cached_property
    def game(self):
        return get_object_or_404(models.Game.objects.only(*self.game_related_fields), **self.game_kwargs)

    @cached_property
    def game_id(self):
        return self.game.id


class CollectionRelatedMixin:
    @cached_property
    def collection(self):
        collection_pk = self.kwargs.get('collection_pk')
        if not collection_pk:
            return None
        kwargs = {'id' if collection_pk.isdigit() else 'slug': collection_pk}
        return get_object_or_404(models.Collection.objects.all(), **kwargs)


class GameItemFollowingElementMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.user.is_authenticated:
            user_id = self.request.user.id
            content_type_id = ContentType.objects.get_for_model(self.model)
            followed_objects_ids = list(
                UserFollowElement.objects
                .filter(user_id=user_id, content_type_id=content_type_id)
                .values_list('object_id', flat=True)
            )

            qs = qs.annotate(
                following=Case(
                    When(id__in=followed_objects_ids, then=Value(True)),
                    default=Value(False),
                    output_field=BooleanField()
                )
            )
        return qs


class GameItemBaseMixin(GetObjectMixin, GameItemFollowingElementMixin, SearchPaginateMixin):
    pagination_class = paginations.ListPagination

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            kwargs['context'].update(self.model.get_many_context(args[0], self.request))
        elif self.action == 'retrieve':
            serializer_class = self.retrieve_serializer_class
        return serializer_class(*args, **kwargs)

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.lists(self.model, request))
        return response


game_manual_parameters = [
    openapi.Parameter(
        'id', openapi.IN_PATH, description='An ID or a slug identifying this Game.',
        type=openapi.TYPE_STRING, required=True,
    ),
]


@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Create a Game.',
    operation_description='A `released` or `tba` field is required.',
))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Update a Game.'
))
class GameViewSet(
    DisableEditingMixin, FakePaginateMixin, GetObjectMixin, SlugLookupMixin, DisablePutMixin, mixins.ListModelMixin,
    mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet,
    PaginateDetailRouteMixin
):
    queryset = models.Game.objects.all()
    serializer_class = serializers.GameSerializer
    pagination_class = paginations.GamePagination
    ordering_fields = filters.ORDERING_FIELDS
    filter_backends = (filters.GameSearchBackend,)
    permission_classes = (IsUserRealEmail,)
    related_methods = (
        'movies', 'collections', 'reviews', 'editorial_review', 'discussions', 'owned',
        'twitch', 'youtube', 'imgur', 'achievements',
        'demos', 'patches',
    )
    disable_numeric_retrieve = True
    required_scopes = ['user_info']

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        if not kwargs.get('many'):
            serializer_class = serializers.GameSingleSerializer
        kwargs['context'] = self.get_serializer_context()
        if self.action and self.action.startswith('list_games_') or self.action in (
            'list', 'calendar', 'calendar_today',
        ):
            serializer_class = serializers.GameSerializer
            if getattr(self, 'is_search', False):
                serializer_class = serializers.GameSearchSerializer
            statuses = None
            statuses_count = 3
            if self.action.startswith('list_games_recent_'):
                statuses = 'added'
            kwargs['context'].update(
                models.Game.get_many_context(args[0], self.request, statuses=statuses, statuses_count=statuses_count),
            )
            if self.action in ('list_games_greatest', 'list_games_popular'):
                kwargs['context']['raw_charts'] = True
        elif self.action == 'retrieve' and is_request:
            kwargs['context'].update(self.get_object().get_context(self.request))
        elif self.action == 'collections':
            serializer_class = serializers.CollectionSerializer
            kwargs['context'].update(models.Collection.get_many_context(args[0], False, self.request))
        elif self.action == 'reviews':
            serializer_class = ReviewSerializer
            reviews = list(args[0])
            if 'add_reviews' in kwargs:
                for review in kwargs['add_reviews']:
                    reviews.append(review)
                del kwargs['add_reviews']
            kwargs['context'].update(Review.get_many_context(reviews, self.request))
        elif self.action == 'discussions':
            serializer_class = DiscussionSerializer
            discussions = list(args[0])
            kwargs['context'].update(Discussion.get_many_context(discussions, self.request))
            kwargs['context']['is_one_game'] = True
        elif self.action == 'versus':
            serializer_class = VersusSerializer
            kwargs['context'].update(Versus.get_many_context(args[0], self.request))
        elif self.action == 'twitch':
            serializer_class = serializers.TwitchSerializer
        elif self.action in ('youtube', 'list_youtube'):
            serializer_class = serializers.YoutubeSerializer
        elif self.action in ('imgur', 'list_imgur'):
            serializer_class = serializers.ImgurSerializer
        elif self.action == 'achievements':
            serializer_class = serializers.ParentAchievementSerializer
            kwargs['context'].update(ParentAchievement.get_many_context(args[0]))
        elif self.action == 'movies':
            serializer_class = serializers.MovieSerializer
        elif self.action in ('demos', 'patches'):
            serializer_class = FileSerializer
        elif self.action == 'partial_update':
            serializer_class = serializers.GameUpdateSerializer
        elif self.action == 'create':
            serializer_class = serializers.GameCreateSerializer
        elif self.action == 'playerinfo':
            kwargs['context'].update(player=PlayerBase.from_request(self.request))
            serializer_class = serializers.GetOrCreatePlayerGameSessionSerializer
        if not is_request:
            if self.action == 'reddit':
                serializer_class = ShowReddit.serializer()
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action in ('list', 'retrieve'):
            return models.Game.objects.defer_always()
        elif self.action in self.related_methods:
            self.pagination_class = ExternalPagination
            if self.action == 'youtube':
                return models.Game.objects.only('id', 'display_external', 'added', 'youtube_counts')
            if self.action == 'reviews':
                self.pagination_class = ReviewPagination
            if self.action == 'discussions':
                self.pagination_class = DiscussionPagination
            return models.Game.objects.only('id', 'display_external', 'added')
        elif self.action == 'suggested':
            return models.Game.objects.only(
                'id', 'name', 'slug', 'description', 'suggestions', 'last_modified_json', 'game_seo_fields_json'
            )
        elif self.action == 'playable':
            return models.Game.objects.playable()
        return super().get_queryset()

    @swagger_auto_schema(
        operation_summary='Get details of the game.',
        manual_parameters=game_manual_parameters,
    )
    def retrieve(self, request, *args, **kwargs):
        response = self.retrieve_with_merged(models.Game, request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK and request.user.is_authenticated and response.data.get('id'):
            add_recommended_game_visit.delay(
                request.user.id, response.data['id'], request.META.get('HTTP_X_API_REFERER')
            )
        if response.status_code == status.HTTP_200_OK and response.data.get('id') and self.get_object().is_playable:
            player = PlayerBase.from_request(request)
            touch_game_visit.delay(
                self.get_object().id, player.id.hex, player.expiry_date and player.expiry_date.isoformat()
            )
        return response

    @swagger_auto_schema(
        operation_summary='Get a list of games.',
        manual_parameters=[
            openapi.Parameter(
                'search', openapi.IN_QUERY, description='Search query.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'search_precise', openapi.IN_QUERY, description='Disable fuzziness for the search query.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'search_exact', openapi.IN_QUERY, description='Mark the search query as exact.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'parent_platforms', openapi.IN_QUERY, description='Filter by parent platforms, for example: `1,2,3`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'platforms', openapi.IN_QUERY, description='Filter by platforms, for example: `4,5`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'stores', openapi.IN_QUERY, description='Filter by stores, for example: `5,6`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'developers', openapi.IN_QUERY,
                description='Filter by developers, for example: `1612,18893` or `valve-software,feral-interactive`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'publishers', openapi.IN_QUERY,
                description='Filter by publishers, for example: `354,20987` or `electronic-arts,microsoft-studios`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'genres', openapi.IN_QUERY,
                description='Filter by genres, for example: `4,51` or `action,indie`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'tags', openapi.IN_QUERY,
                description='Filter by tags, for example: `31,7` or `singleplayer,multiplayer`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'creators', openapi.IN_QUERY,
                description='Filter by creators, for example: `78,28` or `cris-velasco,mike-morasky`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'dates', openapi.IN_QUERY,
                description='Filter by a release date, for example: `2010-01-01,2018-12-31.1960-01-01,1969-12-31`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'updated', openapi.IN_QUERY,
                description='Filter by an update date, for example: `2020-12-01,2020-12-31`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'platforms_count', openapi.IN_QUERY,
                description='Filter by platforms count, for example: `1`.',
                type=openapi.TYPE_INTEGER,
            ),
            openapi.Parameter(
                'metacritic', openapi.IN_QUERY,
                description='Filter by a metacritic rating, for example: `80,100`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'exclude_collection', openapi.IN_QUERY,
                description='Exclude games from a particular collection, for example: `123`.',
                type=openapi.TYPE_INTEGER,
            ),
            openapi.Parameter(
                'exclude_additions', openapi.IN_QUERY, description='Exclude additions.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'exclude_parents', openapi.IN_QUERY, description='Exclude games which have additions.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'exclude_game_series', openapi.IN_QUERY, description='Exclude games which included in a game series.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'exclude_stores', openapi.IN_QUERY, description='Exclude stores, for example: `5,6`.',
                type=openapi.TYPE_STRING,
            ),
            openapi.Parameter(
                'ordering', openapi.IN_QUERY,
                description='Available fields: '
                            '`name`, `released`, `added`, `created`, `updated`, `rating`, `metacritic`. '
                            'You can reverse the sort order adding a hyphen, for example: `-released`.',
                type=openapi.TYPE_STRING,
            ),
            # ids=1,2,3
            # exclude=1,2,3 or exclude=slug1,slug2,slug3
        ],
    )
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        if getattr(self, 'is_search', None):
            page = self.paginator.paginate_count_queryset(queryset, self.search_count, self.request, self, True)
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            if true(request.GET.get('filter')):
                if int_or_none(request.GET.get('page', 1)) == 1:
                    results = [x.tags_ids for x in page]
                    related_tags = dict(Counter([tag for sub in results for tag in sub]))
                    related_tags = sorted(related_tags.items(), key=operator.itemgetter(1), reverse=True)
                    related_tags = [x[0] for x in related_tags][:30]
                    tags = serializers.TagShortSerializer(
                        models.Tag.objects.filter(
                            id__in=related_tags,
                            hidden=False,
                            language=request.LANGUAGE_CODE_ISO3,
                        ),
                        many=True
                    )
                    response.data.update({'related_tags': tags.data})
                games_list_seo(request, response, response.data['count'], search=getattr(self, 'facets', {}))

            return self.list_platforms_response(request, response)

        order = 'games_game.added DESC'
        ordering_field = 'added'
        ordering = request.GET.get('ordering')
        if ordering:
            ordering_field = ordering
            ordering_direction = 'ASC'
            if ordering[0] == '-':
                ordering_field = ordering[1:]
                ordering_direction = 'DESC'
            if ordering_field in self.ordering_fields:
                order = '{} {}'.format(ordering_field, ordering_direction)
        if ordering_field in filters.NOT_UNIQUE_ORDERING_FIELDS:
            order += ', id DESC'

        count = cache.GameCount().get()
        args = self.raw_paginate(request, count, [])
        fields = ', '.join(f'games_game.{field}' for field in models.Game.objects.raw_list_fields)
        rows = list(queryset.raw(
            f'''
            SELECT {fields}
            FROM games_game
            ORDER BY {order}
            LIMIT %s OFFSET %s
            ''', args,
        ))
        serializer = self.get_serializer(rows, many=True, context=self.get_serializer_context())
        response = self.get_paginated_response(serializer.data)
        games_list_seo(request, response, count)

        return self.list_platforms_response(request, response, True)

    @action(detail=True, methods=['GET'], authentication_classes=[OAuth2Authentication],
            permission_classes=[TokenHasScope])
    def playerinfo(self, request, pk, *args, **kwargs):
        player = PlayerBase.from_request(request)
        serializer = self.get_serializer(data={'game_id': pk, 'player_id': player.id}, context={'player': player})
        serializer.is_valid(raise_exception=True)
        return Response(serializer.data)

    @swagger_auto_schema(
        operation_summary='Get a list of game trailers.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def movies(self, request, pk):
        return self.get_paginated_detail_response(models.Movie.objects.filter(game=self.get_object()))

    @swagger_auto_schema(
        operation_summary='Get a list of visually similar games, '
                          'available only for business and enterprise API users.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def suggested(self, request, pk):
        api_group = request.API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            return Response(status=401)

        if request.user.is_authenticated:
            save_user_last_games_show_similar.delay(request.user.id, self.get_object().id)

        game = self.get_object()
        pagination = ExternalPagination()

        data = []
        ids = find(game.suggestions, 'games', [])
        if ids:
            ids = pagination.paginate_count_queryset_page(ids, len(ids), request).object_list
            games = models.Game.objects.defer_all(exclude_fields={'game_seo_fields_json'}).in_bulk(ids)
            for pk in ids:
                add_game = games.get(pk)
                if add_game:
                    data.append(add_game)

        context = {'seo_short_description': True}
        context.update(models.Game.get_many_context(data, self.request))
        response = DetailPaginated(self, pagination, self.serializer_class, {'context': context}).response(data)
        response.data['updated'] = find(game.last_modified_json, 'similar_games')
        response.data['seo_text'] = find(game.game_seo_fields_json, f'similar_games.{request.LANGUAGE_CODE}.intro')
        return response

    @swagger_auto_schema(
        operation_summary="Get Game's Collections.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def collections(self, request, pk):
        data = self.get_object().get_latest_collections(request)
        return self.get_paginated_detail_response(data)

    @swagger_auto_schema(
        operation_summary="Get Game's Reviews.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def reviews(self, request, pk):
        add_reviews = []
        default_ordering = 'user_null' if not request.user.is_authenticated else '-created'
        ordering = self.request.GET.get('ordering') or default_ordering
        reviews = self.get_object().reviews.visible_with_empty_users() \
            .prefetch_related('reactions', 'external_store', 'external_store__store')
        reviews_count = self.get_object().reviews.visible_with_empty_users().filter(is_text=True)
        if request.user.is_authenticated:
            reviews = reviews.annotate(lang=get_languages_condition(request))
        else:
            reviews = reviews.filter(language=request.LANGUAGE_CODE_ISO3)
            reviews_count = reviews_count.filter(language=request.LANGUAGE_CODE_ISO3)

        your = None
        if request.user.is_authenticated:
            your = reviews.filter(user=self.request.user).first()
            if your:
                your.user = request.user
                add_reviews.append(your)

        reviews = reviews.filter(is_text=True).prefetch_related(
            Prefetch('user', queryset=get_user_model().objects.defer_all())
        )
        if your and your.is_text:
            reviews = reviews.exclude(id=your.id)
            reviews_count = reviews_count.exclude(id=your.id)

        if ordering == 'user_null':
            reviews = reviews.extra(select={'user_null': 'user_id is null', 'short_text': 'length(text) <= 100'})
            reviews = reviews.extra(order_by=['short_text', '-user_null', '-created'])
        elif ordering in ('-created', 'created', '-likes_rating', 'likes_rating'):
            args = (ordering,)
            if request.user.is_authenticated:
                args = ('lang', ordering)
            reviews = reviews.order_by(*args)
        elif ordering in ('-following', 'following') and request.user.is_authenticated:
            ufe_user_id = Col(
                'users_userfollowelement',
                UserFollowElement._meta.get_field('user_id'),
                output_field=IntegerField()
            )
            ufe_content_type_id = Col(
                'users_userfollowelement',
                UserFollowElement._meta.get_field('content_type_id'),
                output_field=IntegerField()
            )
            condition = Case(
                When(
                    ufe_user_id=request.user.id,
                    ufe_content_type_id=CommonContentType().get(get_user_model()).id,
                    then=1
                ),
                default=0,
                output_field=IntegerField(),
            )
            reviews = reviews.annotate(
                ufe_user_id=ufe_user_id,
                ufe_content_type_id=ufe_content_type_id,
                following=condition
            ).order_by(ordering, 'lang', '-id')
            join(reviews, Review, UserFollowElement, 'user_id', 'object_id')

        page = self.paginator.paginate_count_queryset(reviews, reviews_count.count(), self.request, view=self)
        serializer = self.get_paginated_detail_serializer(page, serializer_kwargs={'add_reviews': add_reviews})
        data = self.get_paginated_response(serializer.data).data

        if your:
            data['your'] = ReviewSerializer(your, context=serializer.context).data
            if your.is_text:
                data['count'] += 1
        return Response(data)

    @swagger_auto_schema(
        operation_summary="Get Game's Discussions.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def discussions(self, request, pk):
        order_by = '-created'
        ordering = self.request.GET.get('ordering') or order_by
        if ordering in ('-created', 'created'):
            order_by = ordering

        discussions = self.get_object() \
            .discussions.visible() \
            .prefetch_related(Prefetch('user', queryset=get_user_model().objects.defer_all()))

        if request.user.is_authenticated:
            discussions = discussions.annotate(lang=get_languages_condition(request)).order_by('lang', order_by)
        else:
            discussions = discussions.filter(language=request.LANGUAGE_CODE_ISO3).order_by(order_by)

        return self.get_paginated_detail_response(discussions)

    @swagger_auto_schema(
        operation_summary="Get a Game's Editorial Review.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True, url_path='editorial-review')
    def editorial_review(self, request, pk):
        try:
            return Response(EditorialReviewSerializer(
                self.get_object().editorial_review, context=self.get_serializer_context()
            ).data)
        except models.Game.editorial_review.RelatedObjectDoesNotExist:
            raise Http404

    @swagger_auto_schema(
        operation_summary="Get a list of most recent posts from the game's subreddit.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def reddit(self, request, pk):
        game = GetObject(self, ('id', 'reddit_count')).aggregate(ShowReddit.game_mapper)
        pagination = ExternalPagination()
        queryset = ShowReddit.service.list(game=game, pagination=pagination, request=request)
        serializer_class = ShowReddit.serializer()
        return DetailPaginated(self, pagination, serializer_class).response(queryset)

    @swagger_auto_schema(
        operation_summary='Get streams on Twitch associated with the game, '
                          'available only for business and enterprise API users.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def twitch(self, request, pk):
        api_group = request.API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            return Response(status=401)

        if not self.get_object().is_display_external:
            return self.get_paginated_detail_response([])
        qs = self.get_object().twitch_set.filter(language=request.LANGUAGE_CODE_ISO3)
        count = find(self.get_object().twitch_counts, request.LANGUAGE_CODE_ISO3, 0)
        return self.get_paginated_detail_response(qs, count_queryset=count)

    @swagger_auto_schema(
        operation_summary='Get videos from YouTube associated with the game, '
                          'available only for business and enterprise API users.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def youtube(self, request, pk):
        api_group = request.API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            return Response(status=401)

        if not self.get_object().is_display_external:
            return self.get_paginated_detail_response([])
        qs = self.get_object().youtube_set.filter(language=request.LANGUAGE_CODE_ISO3)
        count = find(self.get_object().youtube_counts, request.LANGUAGE_CODE_ISO3, 0)
        if count > settings.POPULAR_GAMES_MIN_ADDED:
            count = settings.POPULAR_GAMES_MIN_ADDED
        return self.get_paginated_detail_response(qs, count_queryset=count)

    @swagger_auto_schema(
        operation_summary="Get Game's Imgur images.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def imgur(self, request, pk):
        if not self.get_object().is_display_external:
            return self.get_paginated_detail_response([])
        return self.get_paginated_detail_response(self.get_object().imgur_set.all())

    @swagger_auto_schema(
        operation_summary='Get a list of game achievements.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def achievements(self, request, pk):
        qs = self.get_object().parent_achievements.filter(hidden=False)
        if not request.user.is_authenticated:
            qs = qs.filter(language=request.LANGUAGE_CODE_ISO3)
        qs = qs.order_by(Case(When(percent=0, then=Value(101)), default=F('percent')))
        return self.get_paginated_detail_response(qs)

    @swagger_auto_schema(
        operation_summary="Get Game's Demo.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def demos(self, request, pk):
        return self.get_paginated_detail_response(
            File.objects.filter(game_id=self.get_object().id, category=File.CATEGORY_1)
        )

    @swagger_auto_schema(
        operation_summary="Get Game's Patches.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def patches(self, request, pk):
        return self.get_paginated_detail_response(
            File.objects.filter(game_id=self.get_object().id, category=File.CATEGORY_2)
        )

    @swagger_auto_schema(
        operation_summary="Get Game's Cheats.",
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def cheats(self, request, pk):
        game = GetObject(self, ('id', 'files_count')).aggregate(ShowCheatCodes.game_mapper)
        category = request.GET.get('category') or ''
        pagination = ExternalPagination()
        queryset = ShowCheatCodes.service.list(game=game, category=category, pagination=pagination, request=request)
        serializer_class = ShowCheatCodes.serializer()
        return DetailPaginated(self, pagination, serializer_class).response(queryset)

    @swagger_auto_schema(
        operation_summary='Get last Users with this Game.',
        manual_parameters=game_manual_parameters,
    )
    @action(detail=True)
    def owned(self, request, pk):
        friends = False
        count = 0
        users = []
        qs = UserGame.objects.visible().filter(game=self.get_object())
        if request.user.is_authenticated:
            qs = UserGame.objects.visible().filter(
                user_id__in=UserFollowElement.objects.filter(
                    user_id=request.user.id,
                    content_type=CommonContentType().get(models.Collection)
                ).values_list('object_id', flat=True),
                game=self.get_object(),
            )
            count = qs.count()
            if count:
                friends = True
        if not request.user.is_authenticated or not count:
            count = qs.count()
        if count:
            users = get_user_model().objects.defer_all().filter(
                id__in=qs.order_by('-id').values_list('user_id', flat=True)[0:6 if count < 100 else 5],
            )
        return Response({
            'friends': friends,
            'count': count,
            'users': UserSerializer(users, many=True, context=self.get_serializer_context()).data,
        })

    @swagger_auto_schema(operation_summary='Get Platforms for a list of Games.')
    @action(detail=False, url_path='filters/platforms')
    def filters_platforms(self, request):
        data = []
        games = request.GET.get('games')
        if games:
            games = games.split(',')
            platforms = models.GamePlatform.objects.filter(game_id__in=games).values_list('game_id', 'platform_id')
            result = set()
            games = {int(pk): [] for pk in games if pk.isdigit()}
            for game_id, platform_id in platforms:
                result.add(platform_id)
                games[game_id].append(platform_id)
            for platforms in games.values():
                result.intersection_update(platforms)
            data = models.Platform.objects.filter(id__in=result)
        return Response({
            'count': len(data),
            'platforms': serializers.PlatformSerializer(data, many=True, context=self.get_serializer_context()).data,
        })

    @method_decorator([headers({'X-Accel-Expires': 3600}), cache_page(3600)])
    @swagger_auto_schema(operation_summary='Get Years of Games.')
    @action(detail=False, url_path='filters/years')
    def filters_years(self, request):
        years = formats.years(models.Game.get_years())
        return Response({
            'count': len(years),
            'results': years,
        })

    @swagger_auto_schema(operation_summary='Get The Promo Featured Games list.', deprecated=True)
    @action(detail=False, url_path='lists/promo-featured')
    def list_games_promo_featured(self, request):
        # todo delete
        return Response({
            'count': 0,
            'results': [],
        })

    @swagger_auto_schema(operation_summary='Get The New And Noteworthy Games list.')
    @action(detail=False, url_path='lists/new-and-noteworthy')
    def list_games_new_and_noteworthy(self, request):
        qs = models.Game.objects.defer_all().order_by('-added').filter(
            released__range=[yesterday(days=cache.MIDDLE_ADDED_DAYS), tomorrow()],
            added__gt=cache.GameGetMiddleAdded().get(),
        )
        return self.get_paginated_detail_response(qs)

    @swagger_auto_schema(operation_summary='Get The Next Month Games list.')
    @action(detail=False, url_path='lists/next-month')
    def list_games_next_month(self, request):
        start = first_day_of_month() + relativedelta(months=1)
        end = start + relativedelta(months=1)
        qs = models.Game.objects.defer_all().filter(released__range=[start, end]).order_by('-added')
        response = self.get_paginated_detail_response(qs)
        response.data['month'] = start.month
        return response

    @swagger_auto_schema(operation_summary='Get The Popular In Wishlist Games list.')
    @action(detail=False, url_path='lists/popular-wishlist')
    def list_games_popular_in_wishlist(self, request):
        return self.get_paginated_detail_response(
            models.Game.objects.defer_all()
            .filter(
                id__in=cache.GameGetTopAddedWishlist().get(),
                added_by_status__toplay__gt=cache.GameGetMiddleAddedWishlist().get()
            )
            .order_by('-added_by_status__toplay'),
        )

    @swagger_auto_schema(operation_summary='Get The Because You Completed Games list.')
    @action(detail=False, url_path='lists/because-completed', permission_classes=[IsAuthenticated])
    def list_games_because_completed(self, request):
        game_id = find(request.user.settings, 'games_because_you_completed.game_id', None)
        ids = find(request.user.settings, 'games_because_you_completed.ids', [])
        if not game_id or not ids:
            return Response({
                'count': 0,
                'results': [],
                'game': None,
            })
        cases = [When(id=pk, then=i) for i, pk in enumerate(ids)]
        position = Case(*cases, default=len(ids), output_field=IntegerField())
        qs = models.Game.objects.defer_all().filter(id__in=ids).annotate(position=position).order_by('position')
        response = self.get_paginated_detail_response(qs)
        response.data['game'] = serializers.GameSerializer(
            models.Game.objects.get(id=game_id),
            context=self.get_serializer_context()
        ).data
        return response

    @swagger_auto_schema(operation_summary='Get The Main Games list.')
    @action(detail=False, url_path='lists/main')
    def list_games_main(self, request):
        disable_user_platforms = True
        kwargs = {}
        self.list_ordering(request, kwargs, ('relevance',))
        self.list_platforms(request, kwargs, disable_user_platforms)
        qs = models.Game.objects.none()

        if settings.GAMES_PROMO:
            kwargs['promo_ids'] = cache.GameGetListPromo().get(language=request.LANGUAGE_CODE_ISO3)
            serializer = serializers.ListGamesMainQueryParamsSerializer(data=request.query_params)
            if serializer.is_valid(raise_exception=True):
                kwargs['promo_filters'] = {
                    key: value for key, value in serializer.validated_data.items() if value is not None
                }

        if request.user.is_authenticated:
            qs = UserRecommendation.objects.visible().filter(
                user=request.user,
                sources__overlap=[UserRecommendation.SOURCES_COLLABORATIVE, UserRecommendation.SOURCES_TRENDING]
            )
        if not request.user.is_authenticated or not qs.exists():
            qs = models.Game.objects.recent_games_main(**kwargs)
        else:
            kwargs['games_ids'] = list(qs.values_list('game_id', flat=True))
            qs = models.Game.objects.recent_games_main(**kwargs)
            page = int_or_none(request.GET.get('page'))
            if not page or page == 1:
                add_recommendations_visit.delay(request.user.id)

        response = self.list_platforms_response(request, self.get_paginated_detail_response(qs), disable_user_platforms)
        response.data['games_count'] = 0
        response.data['reviews_count'] = 0
        response.data['recommendations_count'] = 0
        if request.user.is_authenticated:
            response.data['games_count'] = request.user.games_count
            response.data['reviews_count'] = request.user.reviews_count
            response.data['recommendations_count'] = find(
                request.user.settings, 'recommendations_users_collaborative_count', 0
            )
        return response

    @swagger_auto_schema(operation_summary='Get platforms of The Main Games list.')
    @action(detail=False, url_path='lists/main/platforms/parents')
    def list_games_main_platforms_parents(self, request):
        if not request.user.is_authenticated:
            platforms = PlatformListMain().get(language=request.LANGUAGE_CODE)
        else:
            platforms_all = PlatformList().get()
            platforms = []
            for platform_id in find(request.user.settings, 'recommendations_users_platforms', []):
                try:
                    platforms.append({
                        'platform': platforms_all[platform_id].id,
                        'name': platforms_all[platform_id].name,
                        'slug': platforms_all[platform_id].slug,
                    })
                except KeyError:
                    continue

        parents_all = PlatformParentListByPlatform().get()
        parents = set()
        parents_children = {}
        for platform in platforms:
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

    @swagger_auto_schema(operation_summary='Get The Recent Games list.')
    @action(detail=False, url_path='lists/recent-games')
    def list_games_recent_games(self, request):
        kwargs = {}
        self.list_ordering(request, kwargs)
        self.list_platforms(request, kwargs)
        return self.list_platforms_response(
            request,
            self.get_paginated_detail_response(models.Game.objects.recent_games(**kwargs))
        )

    @swagger_auto_schema(operation_summary='Get The Past Recent Games list.')
    @action(detail=False, url_path='lists/recent-games-past')
    def list_games_recent_games_past(self, request):
        kwargs = {}
        self.list_ordering(request, kwargs)
        self.list_platforms(request, kwargs)
        return self.list_platforms_response(
            request,
            self.get_paginated_detail_response(models.Game.objects.recent_games_past(**kwargs))
        )

    @swagger_auto_schema(operation_summary='Get The Future Recent Games list.')
    @action(detail=False, url_path='lists/recent-games-future')
    def list_games_recent_games_future(self, request):
        kwargs = {}
        self.list_ordering(request, kwargs)
        self.list_platforms(request, kwargs)
        return self.list_platforms_response(
            request,
            self.get_paginated_detail_response(models.Game.objects.recent_games_future(**kwargs))
        )

    def list_games_recent(self, data):
        data = self.get_serializer(data, many=True, context=self.get_serializer_context()).data
        [item.pop('charts') for item in data]
        return Response({'count': len(data), 'results': data})

    @swagger_auto_schema(operation_summary='Get The Greatest Games list.')
    @action(detail=False, url_path='lists/greatest')
    def list_games_greatest(self, request):
        disable_user_platforms = True
        current_year = 'year'
        is_paging = true(request.GET.get('page_size'))
        limit = 250 if is_paging else 10
        year = self.request.GET.get('year') or now().year
        if is_paging:
            kwargs = {
                'year': year,
                'limit': limit,
            }
            if year == now().year:
                kwargs['added_gte'] = 10
            kwargs['dates'] = split_dates(request.GET.get('dates'))
            self.list_ordering(request, kwargs)
            self.list_platforms(request, kwargs, disable_user_platforms)
            return self.list_platforms_response(
                request,
                self.get_paginated_detail_response(models.Game.objects.greatest(**kwargs)),
                disable_user_platforms
            )
        else:
            if now() < pytz.utc.localize(datetime(year=now().year, month=2, day=1)):
                current_year = now().year - 1
            year, data = cache.GameGetListGreatest().get(current_year, limit, language=request.LANGUAGE_CODE_ISO3)
            data = self.get_serializer(data, many=True, context=self.get_serializer_context()).data
            if current_year == 'year':
                self.list_chart(data, 'year')
            else:
                for item in data:
                    item['chart'] = 'equal'
            return Response({
                'count': len(data),
                'results': data,
                'year': year,
            })

    @swagger_auto_schema(operation_summary='Get The Popular Games list.')
    @action(detail=False, url_path='lists/popular')
    def list_games_popular(self, request):
        disable_user_platforms = True
        self.pagination_class = paginations.ListPagination
        kwargs = {
            'year': request.GET.get('year') or None,
            'limit': 250,
            'dates': split_dates(request.GET.get('dates', None)),
        }
        self.list_ordering(request, kwargs)
        self.list_platforms(request, kwargs, disable_user_platforms)
        data = self.get_paginated_detail_response(models.Game.objects.weighted_greatest(**kwargs)).data
        self.list_chart(data['results'], 'full')
        return self.list_platforms_response(
            request,
            Response(data),
            disable_user_platforms
        )

    @swagger_auto_schema(operation_summary='Get The Playable Games.')
    @action(detail=False, url_path='playable', filter_backends=(DjangoFilterBackend,))
    def playable(self, request):
        self.filterset_class = filters.PlayableGamesFilterSet
        return super().list(request)

    def list_ordering(self, request, kwargs, ordering_fields=()):
        ordering = request.GET.get('ordering') or ''
        ordering_field = ordering.lstrip('-')
        if ordering_field in filters.ORDERING_FIELDS + ordering_fields:
            kwargs['orderings'] = [ordering]
            if ordering_field in filters.NOT_UNIQUE_ORDERING_FIELDS:
                kwargs['orderings'].append('{}id'.format('' if ordering_field == ordering else '-'))

    def list_platforms_params(self, request: Request) -> Optional[List[int]]:
        return filter_int_or_none(request.GET.get('platforms'))

    def list_platforms_params_parent(self, request: Request):
        return filter_int_or_none(request.GET.get('parent_platforms'))

    def list_platforms_user_platforms(self, request: Request) -> Optional[List[int]]:
        is_platforms = bool(
            not true(request.GET.get('disable_user_platforms'))
            and not self.list_platforms_params(request)
            and not self.list_platforms_params_parent(request)
            and request.user.is_authenticated
            and (request.user.games_count or request.user.games_wishlist_count)
        )
        if is_platforms:
            return find(request.user.settings, 'users_platforms')

    def list_platforms(self, request: Request, kwargs: dict, disable_user_platforms: bool = False):
        platforms = (
            (not disable_user_platforms and self.list_platforms_user_platforms(request))
            or self.list_platforms_params(request)
        )
        if platforms:
            kwargs['platforms'] = platforms
        parent_platforms = self.list_platforms_params_parent(request)
        if parent_platforms:
            kwargs['parent_platforms'] = parent_platforms

    def list_platforms_response(self, request: Request, response: Response, disable_user_platforms: bool = False):
        if disable_user_platforms:
            return response
        response.data['user_platforms'] = bool(self.list_platforms_user_platforms(request))
        return response

    def list_chart(self, data, name):
        if self.request.API_CLIENT_IS_WEBSITE:
            for new_position, item in enumerate(data):
                charts = item.pop('raw_charts')
                old_position = charts.get(name, None) if charts else None
                if old_position is None:
                    item['chart'] = 'new'
                elif new_position < old_position:
                    item['chart'] = 'up'
                elif new_position == old_position:
                    item['chart'] = 'equal'
                elif new_position > old_position:
                    item['chart'] = 'down'

    @swagger_auto_schema(operation_summary='Get The Calendar Today Games list.')
    @action(detail=False, url_path='calendar', url_name='calendar')
    def calendar_today(self, request):
        today = now()
        return self.calendar(request, today.year, today.month, today.day)

    def calendar_day(self, kwargs, page_size):
        try:
            return list(
                models.Game.objects.defer_all().filter(**kwargs)
                .order_by('-released').values_list('released', flat=True)[0:page_size],
            ).pop().day
        except IndexError:
            return 1

    @swagger_auto_schema(operation_summary='Get The Calendar Games list.')
    @action(detail=False, url_path=r'calendar/(?P<year>\d+)/(?P<month>\d+)')
    def calendar(self, request, year, month, is_today=False):
        year = int(year)
        month = int(month)
        disable_user_platforms = True
        self.pagination_class = paginations.GameCalendarPagination
        platforms = {}
        self.list_platforms(request, platforms, disable_user_platforms)
        platforms = self.list_platforms_params(request)
        ordering = request.GET.get('ordering') or 'date'
        previous = request.GET.get('previous')
        popular = true(request.GET.get('popular'))
        is_today = is_today if ordering == 'date' else False
        is_first = is_today and is_today > 1 and not previous
        is_reverse = is_today and is_today > 1 and previous

        kwargs = {
            'released__year': year,
            'released__month': month,
            'tba': False,
        }
        if platforms:
            kwargs['platforms__in'] = platforms
        if is_reverse:
            kwargs['released__day__lt'] = is_today
        elif is_today:
            kwargs['released__day__gte'] = is_today
        if popular:
            kwargs['added__gt'] = 0

        base_qs = models.Game.objects.defer_all()
        data = base_qs.filter(**kwargs)

        # https://3.basecamp.com/3964781/buckets/7181645/todos/1115058277#__recording_1140710309
        count = data.count()
        page_size = self.paginator.get_page_size(request)
        if is_reverse:
            del kwargs['released__day__lt']
            kwargs['released__day__gte'] = is_today
            count = base_qs.filter(**kwargs).count()
            del kwargs['released__day__gte']
            if count and count < page_size:
                kwargs['released__day__lt'] = self.calendar_day(kwargs, page_size)
            else:
                kwargs['released__day__lt'] = is_today
            data = base_qs.filter(**kwargs)
        elif is_today and count < page_size:
            del kwargs['released__day__gte']
            kwargs['released__day__gte'] = self.calendar_day(kwargs, page_size)
            data = base_qs.filter(**kwargs)

        if ordering in ('-added', '-rating', 'name'):
            data = data.order_by(ordering)
        else:
            data = data.order_by('{}released'.format('-' if is_reverse else ''))

        response = self.get_paginated_detail_response(data)
        months = cache.GameCalendarMonth().get(year, language=request.LANGUAGE_CODE_ISO3)
        response.data['months'] = [
            {'year': year, 'month': mo, 'current': mo == month} for mo, count in months if count
        ]
        absolute_url = request.build_absolute_uri(reverse('api:games-calendar'))
        if is_first:
            response.data['previous'] = '{}?page=1&previous=true'.format(absolute_url)
        if is_reverse:
            response.data['results'] = response.data['results'][::-1]
            response.data['next'], response.data['previous'] = response.data['previous'], response.data['next']
            if int_or_none(request.GET.get('page', 1)) == 1:
                response.data['next'] = '{}?page=1'.format(absolute_url)
        return self.list_platforms_response(request, response, disable_user_platforms)

    @swagger_auto_schema(operation_summary='Get Platforms for The Calendar Games list.')
    @method_decorator(cache_page(3600))
    @action(detail=False, url_path='calendar/platforms')
    def calendar_platforms(self, request):
        ids = models.GamePlatform.objects \
            .filter(game__released__year=now().year) \
            .values('platform_id') \
            .annotate(count=Count('id')) \
            .values_list('platform_id', flat=True)
        data = models.Platform.objects.filter(id__in=ids)
        return Response({
            'count': len(data),
            'results': serializers.PlatformSerializer(data, many=True, context=self.get_serializer_context()).data,
        })

    @swagger_auto_schema(operation_summary='Get The Sitemap Games list.')
    @action(detail=False)
    def sitemap(self, request):
        self.pagination_class = paginations.SitemapPagination
        fields = ('id', 'name', 'slug')
        char = request.GET.get('letter')
        if not char:
            raise Http404
        if not char.isalpha() and not char.isdigit():
            data = self.get_queryset().only(*fields).filter(name__iregex=r'^[^a-zA-Z]').order_by('name')
        else:
            data = self.get_queryset().only(*fields).filter(name__istartswith=char).order_by('name')
        page = self.paginator.paginate_queryset(data, self.request, view=self)
        serializer = serializers.SitemapGameSerializer(page, many=True)
        response = self.get_paginated_response(serializer.data)
        return response

    @staticmethod
    def filter_open_endpoints(endpoint):
        disabled = ['/lists/', '/sitemap/', '/calendar', '/filters']
        for part in disabled:
            if part in endpoint:
                return False
        end = endpoint.split('/').pop()
        disabled = [
            'owned', 'cheats', 'demos', 'editorial-review', 'patches', 'collections', 'discussions',
            'imgur', 'reviews', 'sitemap',
        ]
        if end in disabled:
            return False
        return True


@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get a Screenshot.',
))
class GameScreenshotViewSet(
    DisableEditingMixin, GameRelatedMixin, DisablePutMixin, mixins.RetrieveModelMixin, mixins.ListModelMixin,
    mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet,
    PaginateDetailRouteMixin
):
    queryset = models.ScreenShot.objects.all()
    serializer_class = serializers.ScreenShotSerializer
    pagination_class = paginations.ExternalPagination

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action in ('retrieve', 'list'):
            qs = qs.defer('game_id', 'order', 'image_alternate', 'is_external', 'is_small', 'created')
        else:
            qs = qs.select_for_update()
        return qs

    def get_object(self):
        qs = self.get_queryset()

        field = 'id' if 'id' in self.game_kwargs else 'slug'
        obj = get_object_or_404(
            qs.annotate(check_game=F(f'game__{field}'), game_name=F(f'game__name')),
            id=self.kwargs['pk']
        )

        if str(obj.check_game) != self.game_kwargs[field]:
            raise Http404
        if self.action == 'retrieve' and obj.hidden:
            raise Http404
        self.check_object_permissions(self.request, obj)

        return obj

    @swagger_auto_schema(operation_summary='Create a Screenshot.')
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(
        operation_summary='Update a Screenshot.',
        operation_description='To restore a hidden Screenshot please specify `{"hidden": false}`.',
    )
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        return super().partial_update(request, *args, **kwargs)

    @swagger_auto_schema(operation_summary='Hide a Screenshot from public view.')
    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not instance or instance.hidden:
            return Response(status=status.HTTP_404_NOT_FOUND)
        instance.hidden = True
        instance.save(update_fields=['hidden'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(operation_summary='Get screenshots for the game.')
    def list(self, request, *args, **kwargs):
        field = 'id' if 'id' in self.game_kwargs else 'slug'
        filter_kwargs = {f'game__{field}': self.game_kwargs[field]}

        queryset = (
            self.get_queryset()
            .filter(**filter_kwargs)
        )
        count = None
        if not true(request.GET.get('with_deleted')):
            queryset = queryset.filter(hidden=False)
            game_filter_kwargs = {field: self.game_kwargs[field]}
            try:
                count = models.Game.objects.values_list('screenshots_count', flat=True).get(**game_filter_kwargs)
            except models.Game.DoesNotExist:
                raise Http404

        if not request.API_CLIENT_IS_WEBSITE and request.API_GROUP == settings.API_GROUP_FREE:
            count = min(settings.OPEN_API['MAX_SCREENS'], count or settings.OPEN_API['MAX_SCREENS'])

        return self.get_paginated_detail_response(queryset, count_queryset=count)

    @staticmethod
    def filter_open_endpoints(endpoint):
        end = endpoint.split('/').pop()
        disabled = ['{id}']
        if end in disabled:
            return False
        return True


@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete a Game Store entry.',
))
class GameStoreViewSet(
    RestrictDeletingMixin, DisableEditingMixin, GameRelatedMixin, DisablePutMixin, mixins.ListModelMixin,
    mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.GameStore.objects.all()
    serializer_class = serializers.GameStoreCreateSerializer
    pagination_class = paginations.ExternalPagination

    def get_object(self):
        obj = get_object_or_404(
            self.get_queryset().select_for_update(), game_id=self.game_id, id=self.kwargs['pk'],
        )
        self.check_object_permissions(self.request, obj)
        return obj

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        if self.action == 'list':
            serializer_class = serializers.GameStoreFullSerializer
        if self.action == 'partial_update':
            serializer_class = serializers.GameStoreEditSerializer
        kwargs['context'] = self.get_serializer_context()
        return serializer_class(*args, **kwargs)

    def get_store(self, request):
        instance = get_object_or_404(
            models.Store.objects.all(),
            id=request.data.get('store'),
        )
        return instance

    def check_store_domain(self, store, url):
        domain = urlparse(url).netloc.lower()
        if domain != store.domain.lower():
            sub_end = f'.{store.domain}'
            allow_sub = r'^[a-z0-9-_]+$'
            sub = domain[0:-len(sub_end)]
            return domain.endswith(sub_end) and re.match(allow_sub, sub)
        return True

    @swagger_auto_schema(operation_summary='Get links to the stores that sell the game.')
    def list(self, request, *args, **kwargs):
        self.queryset = self.queryset.filter(game_id=self.game_id)
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(operation_summary='Create a Game Store entry.')
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if 'store' not in request.data.keys():
            return Response({'store': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
        self.url = request.data.get('url', None)
        if not self.url:
            return Response({'url': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
        self.store = self.get_store(request)
        if not self.check_store_domain(self.store, self.url):
            return Response(
                {
                    'url': [f'Invalid URL for {self.store}. Please provide URL like {self.store.domain}'],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().create(request, *args, **kwargs)

    @swagger_auto_schema(operation_summary='Update a Game Store entry.')
    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        if 'store' not in request.data.keys():
            return Response({'store': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
        self.url = request.data.get('url', None)
        if not self.url:
            return Response({'url': ['This field is required']}, status=status.HTTP_400_BAD_REQUEST)
        self.store = self.get_store(request)
        if not self.check_store_domain(self.store, self.url):
            return Response(
                {
                    'url': ['Invalid URL for {}. Please provide URL like {}'.format(
                        self.store.name, self.store.domain,
                    )],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)


@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Create a Game Person entry.',
))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Update a Game Person entry.',
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete a Game Person instance.',
))
class GamePersonViewSet(
    RestrictDeletingMixin, DisableEditingMixin, GameRelatedMixin, DisablePutMixin, mixins.DestroyModelMixin,
    mixins.ListModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet,
    PaginateDetailRouteMixin
):
    serializer_class = GamePersonListSerializer
    pagination_class = paginations.ExternalPagination
    queryset = GamePerson.objects.visible().prefetch_related(
        Prefetch('game', queryset=models.Game.objects.defer_all()),
        'position',
        Prefetch('person', queryset=Person.objects.defer_all()),
    )

    def get_object(self):
        try:
            obj = get_object_or_404(self.get_queryset(), game_id=self.game_id, person_id=self.kwargs['pk'])
        except GamePerson.MultipleObjectsReturned:
            obj = self.get_queryset().filter(game_id=self.game_id, person_id=self.kwargs['pk']).first()
        self.check_object_permissions(self.request, obj)
        return obj

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list' and is_request:
            screens = (
                models.ScreenShot.objects.filter(game_id=self.game_id)
                .order_by('is_small', 'is_external', '-id')[0:len(args[0])]
            )
            screens = serializers.ScreenShotSerializer(screens, many=True, context=self.get_serializer_context()).data
            exclude = None
            if self.request.GET.get('exclude_current'):
                exclude = self.game_id
            kwargs['context'].update(Person.get_many_context(
                args[0], self.request, True, self.positions,
                screens, exclude,
            ))
        elif self.action == 'create':
            serializer_class = GamePersonCreateSerializer
        elif self.action == 'partial_update':
            serializer_class = GamePersonUpdateSerializer
        return serializer_class(*args, **kwargs)

    @swagger_auto_schema(operation_summary='Get a list of individual creators that were part of the development team.')
    def list(self, request, *args, **kwargs):
        persons = set()
        positions = {}
        persons_qs = (
            self.get_queryset().filter(game_id=self.game_id)
            .only('person_id', 'position_id').values('person_id', 'position_id')
        )
        for game_person in persons_qs:
            persons.add(game_person['person_id'])
            positions.setdefault(game_person['person_id'], set()).add(game_person['position_id'])
        self.positions = positions
        return self.get_paginated_detail_response(
            Person.objects.defer_all().filter(hidden=False, id__in=persons).order_by('-games_count')
        )

    def perform_destroy(self, instance):
        self.get_queryset().filter(game_id=instance.game_id, person_id=instance.person_id).delete()


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary="Get a list of DLC's for the game, GOTY and other editions, companion apps, etc.",
))
@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Create an Addition.',
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete an Addition',
))
class AdditionViewSet(
    RestrictDeletingMixin, DisableEditingMixin, GameRelatedMixin, DisablePutMixin, mixins.ListModelMixin,
    mixins.CreateModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.Addition.objects.all()
    serializer_class = serializers.AdditionSerializer
    pagination_class = paginations.ListPagination
    game_related_fields = ('slug', 'additions_count')
    filter_backends = []

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            serializer_class = serializers.GameSerializer
            kwargs['context'].update(models.Game.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action == 'list':
            ids = self.queryset.filter(parent_game_id=self.game_id).values_list('game_id', flat=True)
            return models.Game.objects.defer_all().filter(id__in=ids).order_by('-released', '-id')
        return super().get_queryset()

    def paginate_queryset(self, queryset):
        return self.paginator.paginate_count_queryset(queryset, self.game.additions_count, self.request, view=self)

    def get_object(self):
        obj = get_object_or_404(
            self.get_queryset(), parent_game_id=self.game_id, game_id=self.kwargs['pk']
        )
        self.check_object_permissions(self.request, obj)
        return obj


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary="Get a list of parent games for DLC's and editions.",
))
class ParentGameViewSet(GameRelatedMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.Game.objects.defer_all()
    serializer_class = serializers.GameSerializer
    pagination_class = paginations.ListPagination
    game_related_fields = ('slug', 'parents_count')
    filter_backends = []

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list':
            kwargs['context'].update(models.Game.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action == 'list':
            ids = models.Addition.objects.filter(game_id=self.game_id).values_list('parent_game_id', flat=True)
            return self.queryset.filter(id__in=ids).order_by('-released', '-id')
        return super().get_queryset()

    def paginate_queryset(self, queryset):
        return self.paginator.paginate_count_queryset(queryset, self.game.parents_count, self.request, view=self)


@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Add a Game to the same Game Series.',
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete a Game from the same Game Series.',
))
class GameSeriesViewSet(
    DisableEditingMixin, RestrictDeletingMixin, GameRelatedMixin,
    mixins.DestroyModelMixin, mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Game.objects.all()
    serializer_class = serializers.GameSeriesSiblingSerializer
    pagination_class = paginations.ListPagination
    game_related_fields = ('slug', 'game_series_count')
    filter_backends = []

    def get_serializer_class(self):
        if self.action == 'list':
            return serializers.GameSerializer
        return super().get_serializer_class()

    def get_object(self):
        obj = get_object_or_404(models.Game.objects.only('id'), id=self.game_id)
        self.check_object_permissions(self.request, obj)
        return obj

    @swagger_auto_schema(operation_summary='Get a list of games that are part of the same series.')
    def list(self, request, *args, **kwargs):
        pagination = paginations.ListPagination()
        game_series = self.game.game_series.values_list('id', flat=True)
        qs = models.Game.objects.defer_all().filter(id__in=game_series).exclude(id=self.game_id).order_by('-released')
        data = pagination.paginate_count_queryset_page(qs, self.game.game_series_count, request).object_list
        return DetailPaginated(
            self, pagination, self.get_serializer_class(),
            {'context': models.Game.get_many_context(data, self.request)}
        ).response(data)

    def perform_destroy(self, instance):
        self.game.game_series.remove(self.kwargs['pk'])
        models.Game.objects.get(id=self.kwargs['pk']).game_series.clear()
        for game in self.game.game_series.only('id'):
            game.game_series.remove(self.kwargs['pk'])


class CollectionGameViewSet(
    CollectionRelatedMixin, DisablePutMixin, mixins.ListModelMixin, mixins.CreateModelMixin,
    mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.Game.objects.defer_all()
    serializer_class = serializers.CollectionGameSerializer
    pagination_class = paginations.GamePagination
    permission_classes = (permissions.IsCollectionGame,)
    ordering_fields = filters.ORDERING_FIELDS

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), collection=self.collection, game_id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        if self.action == 'list':
            if not self.collection:
                return super().get_queryset()

            qs = super().get_queryset()

            kwargs = {'collectiongame__collection_id': self.collection.pk}
            dates = split_dates(self.request.GET.get('dates'))
            if dates:
                kwargs['released__range'] = dates
            platforms = filter_int_or_none(self.request.GET.get('platforms'))
            if platforms:
                kwargs['platforms__in'] = platforms
            parent_platforms = filter_int_or_none(self.request.GET.get('parent_platforms'))
            if parent_platforms:
                kwargs['platforms__parent__in'] = parent_platforms
            qs = qs.filter(**kwargs)

            orderings = ['-collectiongame__added', 'name']
            ordering = self.request.GET.get('ordering') or ''
            ordering_field = ordering.lstrip('-')
            if ordering_field in filters.ORDERING_FIELDS:
                orderings = [ordering]
                if ordering_field in filters.NOT_UNIQUE_ORDERING_FIELDS:
                    orderings.append('{}id'.format('' if ordering_field == ordering else '-'))
            qs = qs.order_by(*orderings)

            return qs.distinct()
        return models.CollectionGame.objects.all()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            serializer_class = serializers.GameSerializer
            kwargs['context'].update(models.Game.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    @swagger_auto_schema(
        operation_id='collections_games_partial_update_bulk',
        operation_summary='Bulk updating of collection games.',
    )
    @transaction.atomic
    def patch(self, request, collection_pk, *args, **kwargs):
        self.action = 'bulk_patch'
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.bulk_patch())

    @swagger_auto_schema(
        operation_id='collections_games_delete_bulk',
        operation_summary='Bulk deleting of collection games.',
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
    )
    @transaction.atomic
    def delete(self, request, collection_pk, *args, **kwargs):
        self.action = 'bulk_delete'
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.bulk_destroy()
        return Response(status=status.HTTP_204_NO_CONTENT)


class CollectionFeedViewSet(CollectionRelatedMixin, viewsets.ModelViewSet):
    queryset = models.CollectionFeed.objects.prefetch_related('content_type')
    serializer_class = serializers.CollectionFeedSerializer
    pagination_class = paginations.CollectionPagination
    ordering_fields = filters.ORDERING_FIELDS

    def get_queryset(self):
        if self.action == 'list':
            queryset = super().get_queryset().filter(collection_id=self.collection.pk)
            join(queryset, models.CollectionFeed, models.CollectionGame, 'object_id', 'id')
            join(queryset, models.CollectionGame, models.Game, 'game_id', 'id')
            where = []
            params = []
            dates = split_dates(self.request.GET.get('dates'))
            if dates:
                where.append(f'"{models.Game._meta.db_table}"."released" BETWEEN %s AND %s')
                params += dates
            platforms = filter_int_or_none(self.request.GET.get('platforms'))
            if platforms:
                join(queryset, models.Game, models.Game.platforms.through, 'id', 'game_id')
                where.append(
                    f'"{models.Game.platforms.through._meta.db_table}"."platform_id" '
                    f'IN ({", ".join("%s" for _ in platforms)})'
                )
                params += platforms
            parent_platforms = filter_int_or_none(self.request.GET.get('parent_platforms'))
            if parent_platforms:
                join(queryset, models.Game, models.Game.platforms.through, 'id', 'game_id')
                join(queryset, models.Game.platforms.through, models.Platform, 'platform_id', 'id')
                where.append(
                    f'"{models.Platform._meta.db_table}"."parent_id" IN ({", ".join("%s" for _ in parent_platforms)})'
                )
                params += parent_platforms
            if where:
                queryset = queryset.extra(where=where, params=params)
            return queryset
        return super().get_queryset()

    def filter_queryset(self, queryset):
        for backend in list(self.filter_backends):
            if backend is OrderingFilter:
                ordering = backend().get_ordering(self.request, queryset, self)
                if ordering:
                    ordering = ordering[0]
                    if ordering not in ('created', '-created'):
                        direction = ''
                        if ordering[0] == '-':
                            direction = '-'
                            ordering = ordering[1:]
                        order_by = [f'{direction}"{models.Game._meta.db_table}".{ordering}']
                        if ordering in filters.NOT_UNIQUE_ORDERING_FIELDS:
                            order_by.append(f'{direction}"{models.Game._meta.db_table}"."id"')
                        queryset = queryset.extra(order_by=order_by)
                    else:
                        queryset = queryset.order_by(ordering)
            else:
                queryset = backend().filter_queryset(self.request, queryset, self)
        return queryset

    def get_serializer_class(self):
        if self.action in ('create', 'partial_update'):
            return serializers.CollectionFeedEditSerializer
        return super().get_serializer_class()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            kwargs['context'].update(
                models.CollectionFeed.get_many_context(args[0], self.request, collection=self.collection)
            )
        return serializer_class(*args, **kwargs)

    @action(detail=True)
    def page(self, request, collection_pk, pk):
        feed = self.get_object()
        data = list(self.queryset.filter(collection_id=self.collection.id).values_list('id', flat=True))
        page = math.ceil((data.index(feed.id) + 1) / self.pagination_class.page_size)
        return Response({
            'id': feed.id,
            'page': page,
        })

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)


class CollectionFeedCommentViewSet(CollectionRelatedMixin, BaseCommentViewSet):
    queryset = CommentCollectionFeed.objects.all()
    serializer_class = serializers.CollectionFeedCommentSerializer

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if self.action in ('children', 'page'):
            del self.kwargs['collection_pk']


class CollectionFeedCommentLikeViewSet(BaseLikeViewSet):
    queryset = LikeCollectionFeed.objects.all()
    serializer_class = serializers.CollectionFeedCommentLikeSerializer


class CollectionOfferViewSet(CollectionGameViewSet):
    serializer_class = serializers.CollectionOfferSerializer
    permission_classes = (permissions.IsCollectionOffer,)
    ordering_fields = filters.ORDERING_FIELDS

    def get_queryset(self):
        if self.action == 'list':
            if not self.collection:
                return super().get_queryset()
            return models.Game.objects.defer_all() \
                .filter(collectionoffer__collection_id=self.collection.pk, collectionoffer__hidden=False) \
                .order_by('-collectionoffer__added', 'name').distinct()
        else:
            return models.CollectionOffer.objects.all()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if kwargs.get('many'):
            serializer_class = serializers.GameSerializer
            kwargs['context'].update(models.Game.get_many_context(args[0], self.request, self.collection.pk))
        return serializer_class(*args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.destroy(self.get_object())
        return Response(status=status.HTTP_204_NO_CONTENT)

    @swagger_auto_schema(
        operation_id='collections_offers_delete_bulk',
        operation_summary='Bulk deleting of collection offers.',
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
    )
    @transaction.atomic
    def delete(self, request, collection_pk, *args, **kwargs):
        return super().delete(request, collection_pk, *args, **kwargs)

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)


class CollectionViewSet(
    SearchPaginateMixin, GetObjectMixin, SlugLookupMixin, viewsets.ModelViewSet, PaginateDetailRouteMixin
):
    queryset = models.Collection.objects.prefetch_related(
        Prefetch('creator', queryset=get_user_model().objects.defer_all())
    )
    serializer_class = serializers.CollectionSerializer
    pagination_class = PageNumberCountPagination
    permission_classes = (permissions.IsCollection,)
    filter_backends = (filters.CollectionSearchBackend,)

    def get_queryset(self):
        if self.action in ('platforms', 'genres', 'years', 'followers'):
            return models.Collection.objects.only('id', 'followers_count')
        if self.action == 'list':
            self.pagination_class = paginations.ListPagination
            qs = self.queryset.filter(is_private=False)
            if self.request.user.is_authenticated:
                qs = qs.annotate(lang=get_languages_condition(self.request)).order_by(
                    'lang', F('updated').desc(nulls_last=True), 'id'
                )
            else:
                qs = qs.filter(language=self.request.LANGUAGE_CODE_ISO3).order_by(
                    F('updated').desc(nulls_last=True), 'id'
                )
            return qs
        return super().get_queryset()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        kwargs['context']['following_collections'] = False
        if self.action in ('list', 'related', 'main', 'popular'):
            request = self.request
            if getattr(self, 'is_search', None):
                serializer_class = serializers.CollectionSearchSerializer
                request = None
            kwargs['context'].update(models.Collection.get_many_context(args[0], False, request))
        elif self.action == 'retrieve' and is_request:
            kwargs['context'].update(self.get_object().get_context(self.request))
        return serializer_class(*args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        obj = self.get_object()
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.collection(obj, request))
        return response

    @action(detail=True)
    def platforms(self, request, pk):
        platforms = formats.percents(
            self.get_object().games.only('id').prefetch_related('platforms'), 'platforms', 'platform',
            fields=['id', 'name', 'slug'],
        )
        return Response({
            'count': len(platforms),
            'results': platforms,
        })

    @action(detail=True)
    def genres(self, request, pk):
        genres = formats.percents(
            self.get_object().games.only('id').prefetch_related('genres'), 'genres', 'genre',
            filter_hidden=True, fields=['id', 'name', 'slug'],
        )
        return Response({
            'count': len(genres),
            'results': genres,
        })

    @action(detail=True)
    def ratings(self, request, pk):
        ratings = formats.ratings()
        return Response({
            'count': len(ratings),
            'results': ratings,
        })

    @action(detail=True)
    def years(self, request, pk):
        years = formats.years(self.get_object().get_years())
        return Response({
            'count': len(years),
            'results': years,
        })

    @action(detail=True)
    def followers(self, request, pk):
        queryset = UserFollowElement.objects.filter(
            object_id=self.get_object().id,
            content_type=CommonContentType().get(models.Collection)
        ).prefetch_related(
            Prefetch('user', queryset=get_user_model().objects.defer_all())
        )
        count_queryset = self.get_object().followers_count
        page = self.paginator.paginate_count_queryset(queryset, count_queryset, self.request, view=self)
        serializer = self.get_paginated_detail_serializer([el.user for el in page], UserSerializer)
        return self.get_paginated_response(serializer.data)

    @action(detail=False, methods=['post', 'delete'])
    def collections_games(self, request):
        collections = models.Collection.objects.filter(
            id__in=request.data.get('collections') or [],
            creator=request.user,
        )
        games = models.Game.objects.filter(id__in=request.data.get('games') or [])
        result = {
            'collections': set(),
            'games': set(),
        }
        with transaction.atomic():
            if request.method == 'POST':
                for collection in collections:
                    result['collections'].add(collection.id)
                    for game in games:
                        models.CollectionGame.objects.get_or_create(collection=collection, game=game)
                        result['games'].add(game.id)
            elif request.method == 'DELETE':
                for collection in collections:
                    result['collections'].add(collection.id)
                    for game in games:
                        models.CollectionGame.objects.filter(collection=collection, game=game).delete()
                        result['games'].add(game.id)
        return Response(result)

    @action(detail=False, url_path='lists/main')
    def main(self, request):
        # todo replace by popular
        return self.popular(request)

    @action(detail=False, url_path='lists/popular')
    def popular(self, request):
        self.pagination_class = paginations.ListPagination
        return self.get_paginated_detail_response(
            models.Collection.objects.popular(request),
            count_queryset=models.Collection.objects.popular_count(request),
        )


class CollectionLikeViewSet(
    CollectionRelatedMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet
):
    queryset = models.CollectionLike.objects.all()
    serializer_class = serializers.CollectionLikeSerializer
    permission_classes = (IsUserOwner,)

    def get_object(self):
        obj = get_object_or_404(
            self.get_queryset(), collection_id=self.collection.pk,
            user_id=self.kwargs['pk'],
        )
        self.check_object_permissions(self.request, obj)
        return obj


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of video game platforms.',
))
class PlatformViewSet(
    CacheListAnonMixin, GameItemBaseMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Platform.objects.exclude(parent=None)
    serializer_class = serializers.PlatformSerializer
    retrieve_serializer_class = serializers.PlatformSingleSerializer
    pagination_class = paginations.PlatformPagination
    model = models.Platform

    @swagger_auto_schema(operation_summary='Get details of the platform.')
    def retrieve(self, request, *args, **kwargs):
        if kwargs.get('pk') == 'parents':
            return PlatformParentViewSet.as_view({'get': 'list'})(request._request, *args, **kwargs)
        return super().retrieve(request, *args, **kwargs)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of parent platforms.',
    operation_description='For instance, for PS2 and PS4 the “parent platform” is PlayStation.'
))
class PlatformParentViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.PlatformParent.objects.prefetch_related('platform_set')
    serializer_class = serializers.PlatformParentSingleSerializer
    pagination_class = paginations.PlatformPagination


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of video game storefronts.',
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get details of the store.',
))
class StoreViewSet(
    CacheListAnonMixin, GameItemBaseMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Store.objects.all()
    serializer_class = serializers.StoreSerializer
    retrieve_serializer_class = serializers.StoreSingleSerializer
    pagination_class = paginations.StorePagination
    model = models.Store


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of video game genres.',
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get details of the genre.',
))
class GenreViewSet(
    CacheListAnonMixin, GameItemBaseMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Genre.objects.visible().order_by('-games_added')
    serializer_class = serializers.GenreSerializer
    retrieve_serializer_class = serializers.GenreSingleSerializer
    pagination_class = paginations.GenrePagination
    model = models.Genre

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        return models.Genre.objects.visible().order_by('-games_added')


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of tags.',
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get details of the tag.',
))
class TagViewSet(
    GameItemBaseMixin, SearchSerializerMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Tag.objects.visible().order_by('-games_added')
    serializer_class = serializers.TagSerializer
    retrieve_serializer_class = serializers.TagSingleSerializer
    filter_backends = (filters.TagSearchBackend,)
    search_serializer_class = serializers.TagSearchSerializer
    model = models.Tag

    def get_queryset(self):
        qs = super().get_queryset()
        if true(self.request.GET.get('white')):
            qs = qs.filter(white=True)
        elif self.request.GET.get('white'):
            qs = qs.filter(white=False)
        if self.action == 'list':
            if self.request.user.is_authenticated:
                qs = qs.annotate(lang=get_languages_condition(self.request)).order_by('lang', '-games_added')
            else:
                qs = qs.filter(language=self.request.LANGUAGE_CODE_ISO3)
            qs = qs.filter(games_count__gt=5)
        return qs


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of video game publishers.',
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get details of the publisher.',
))
class PublisherViewSet(
    GameItemBaseMixin, SearchSerializerMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Publisher.objects.visible().order_by('-games_added')
    serializer_class = serializers.PublisherSerializer
    retrieve_serializer_class = serializers.PublisherSingleSerializer
    filter_backends = (filters.PublisherSearchBackend,)
    search_serializer_class = serializers.PublisherSearchSerializer
    model = models.Publisher


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of game developers.',
))
@method_decorator(name='retrieve', decorator=swagger_auto_schema(
    operation_summary='Get details of the developer.',
))
class DeveloperViewSet(
    GameItemBaseMixin, SearchSerializerMixin, SlugLookupMixin,
    mixins.RetrieveModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet
):
    queryset = models.Developer.objects.visible().order_by('-games_added')
    serializer_class = serializers.DeveloperSerializer
    retrieve_serializer_class = serializers.DeveloperSingleSerializer
    filter_backends = (filters.DeveloperSearchBackend,)
    search_serializer_class = serializers.DeveloperSearchSerializer
    model = models.Developer


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='List ESRB ratings.',
))
class ESRBRatingViewSet(CacheListMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.ESRBRating.objects.visible()
    serializer_class = serializers.ESRBRatingSerializer
    pagination_class = paginations.ListPagination

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        return models.ESRBRating.objects.visible()


class PlayerGameDataView(APIView):
    permission_classes = (IsAuthenticated, permissions.IsValidAuthKey)
    parser_classes = (BinaryParser,)
    parent_model = models.PlayerGameSession

    def get(self, request, game_sid, *args, **kwargs):
        game_session = self.get_object(request, game_sid)
        try:
            game_session_data = game_session.data
        except models.PlayerGameSessionData.DoesNotExist:
            raise Http404
        response = Response(status=status.HTTP_200_OK)
        response['X-Accel-Redirect'] = os.path.join(settings.XSENDFILE_NGINX_PREFIX, game_session_data.data.name)
        return response

    def put(self, request, game_sid, *args, **kwargs):
        session_instance = self.get_object(request, game_sid)
        file = SimpleUploadedFile(
            f'{session_instance.game_sid}.bin', request.data, content_type='application/octet-stream'
        )
        serializer = serializers.PlayerGameSessionSerializer(data={'data': file})
        serializer.is_valid(raise_exception=True)
        _, created = models.PlayerGameSessionData.objects.update_or_create(
            session_id=session_instance.game_sid, defaults={'data': file}
        )
        return Response(status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def get_object(self, request, session_id) -> models.PlayerGameSession:
        serializer = serializers.ParamsCheckSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        queryset = models.PlayerGameSession.objects.filter(game__can_play=True, game_id=serializer.validated_data['app_id'])\
            .select_related('game', 'player', 'data')\
            .only('game_sid', 'created', 'game__secret_key', 'data__data', 'player__player_id')
        session_instance = get_object_or_404(queryset, game_sid=session_id)

        player = AuthenticatedPlayer(session_instance.player)
        common_session = CommonPlayerGameSessionData(
            game=session_instance.game,
            player=player,
            game_sid=session_instance.game_sid,
            created=session_instance.created
        )
        self.check_object_permissions(request, common_session)
        return session_instance


class FeaturedList(ListAPIView):
    queryset = models.Featured.objects.annotate(
        name=F('game__name'), slug=F('game__slug'), play_on_desktop=F('game__play_on_desktop'),
        play_on_mobile=F('game__play_on_mobile')
    )
    serializer_class = serializers.FeaturedSerializer
    pagination_class = None
    filter_backends = (DjangoFilterBackend,)
    filterset_class = filters.FeaturedListFilterSet


class RecommendedList(ListAPIView):
    queryset = models.Game.objects.filter(recommended__isnull=False) \
        .only('name', 'image', 'slug', 'play_on_desktop', 'play_on_mobile')
    serializer_class = serializers.SimpleGameSerializer
    pagination_class = None
    filter_backends = (DjangoFilterBackend,)
    filterset_class = filters.RecommendedListFilterSet


class LastPlayed(ListAPIView):
    serializer_class = serializers.SimpleGameSerializer
    pagination_class = None

    def get_queryset(self):
        played_pks = PlayHistory().list(PlayerBase.from_request(self.request).id)
        whens = [When(id=pk, then=score) for score, pk in enumerate(played_pks)]
        return models.Game.objects.filter(id__in=played_pks) \
            .annotate(score=Case(*whens, output_field=IntegerField())) \
            .only('image', 'name', 'slug') \
            .order_by('score')


class GamePlays(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, game_id):
        increment_plays.delay(game_id)
        return Response()


class MadWorldNewsView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = serializers.MadWorldNewsSerializer
    authentication_classes = (CsrfExemptSessionAuthentication,)

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(models.MadWorldNews.objects.last_active_news(), many=True)
        return Response(serializer.data)
