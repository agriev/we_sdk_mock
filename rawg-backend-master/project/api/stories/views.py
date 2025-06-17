from django.conf import settings
from django.db import transaction
from django.db.models import Case, IntegerField, Prefetch, When
from django.utils.functional import cached_property
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from api.functions import is_docs
from api.stories import serializers
from api.stories.paginations import StoryPagination, StoryShortPagination
from api.views_mixins import GetObjectMixin, SlugLookupMixin
from apps.games.models import Game
from apps.stories.models import Clip, GameStory, Story, UserGameStory, UserStory, Video
from apps.utils.api import true


class StoriesViewSet(SlugLookupMixin, GetObjectMixin, viewsets.ReadOnlyModelViewSet):
    queryset = Story.objects.visible()
    serializer_class = serializers.StorySerializer
    pagination_class = StoryPagination
    filter_backends = ()

    def not_is_short(self):
        return not true(self.request.GET.get('short'))

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if is_request:
            games = None
            if self.action == 'list':
                kwargs['context'].update(Story.get_many_context(args[0], self.request, self.not_is_short()))
                if self.not_is_short():
                    games = [game_story.game for story in args[0] for game_story in story.game_stories.all()]
            if self.action == 'retrieve':
                kwargs['context'].update(self.get_object().get_context(self.request))
                games = [game_story.game for game_story in args[0].game_stories.all()]
            if games:
                kwargs['context'].update(Game.get_many_context(games, self.request))
        return serializer_class(*args, **kwargs)

    def get_serializer_class(self):
        if self.action == 'viewed':
            return serializers.UserStorySerializer
        if true(self.request.GET.get('short')):
            return serializers.StoryShortSerializer
        return super().get_serializer_class()

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        queryset = Story.objects.visible()
        if self.action == 'retrieve':
            queryset = Story.objects.all()
        elif self.request.user.is_authenticated:
            if true(self.request.GET.get('only_new')):
                queryset = queryset.exclude(id__in=self.viewed_ids)
            elif self.viewed_ids:
                position = Case(When(id__in=self.viewed_ids, then=1), default=0, output_field=IntegerField())
                queryset = queryset.annotate(position=position).order_by('position', 'order')
            if true(self.request.GET.get('random_partners')):
                queryset = queryset.filter(use_for_partners=True).order_by('?')
        if self.not_is_short():
            queryset = queryset.prefetch_related(
                Prefetch('game_stories', queryset=GameStory.objects.visible().exclude(clip=None)),
                Prefetch('game_stories__clip', queryset=Clip.objects.only('clip', 'second', 'video_id', 'preview')),
                Prefetch('game_stories__clip__video', queryset=Video.objects.only('youtube_id')),
                Prefetch('game_stories__game', queryset=Game.objects.defer_all()),
            )
        return queryset

    @swagger_auto_schema(
        operation_summary='List Stories.',
        manual_parameters=[
            openapi.Parameter(
                'only_new', openapi.IN_QUERY, description='List only new Stories.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'short', openapi.IN_QUERY, description='List without Clips.',
                type=openapi.TYPE_BOOLEAN,
            ),
            openapi.Parameter(
                'random_partners', openapi.IN_QUERY, description='List random Stories for partners sites.',
                type=openapi.TYPE_BOOLEAN,
            ),
        ],
    )
    def list(self, request, *args, **kwargs):
        response = self.list_data(request, *args, **kwargs)
        api_group = request.API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            return Response(status=401)
        if not request.user.is_authenticated:
            response['X-Accel-Expires'] = 600
        return response

    def list_data(self, request, *args, **kwargs):
        self.pagination_class = StoryPagination
        if not self.not_is_short():
            self.pagination_class = StoryShortPagination
        response = super().list(request, *args, **kwargs)
        results = response.data.get('results')
        if results and results[0]['slug'] == 'welcome' and len(results) > 1:
            results[0], results[1] = results[1], results[0]
        return response

    @swagger_auto_schema(
        operation_summary='Retrieve a Story.',
        manual_parameters=[
            openapi.Parameter(
                'id', openapi.IN_PATH, description='An ID or a slug identifying this Story.',
                type=openapi.TYPE_STRING, required=True,
            ),
        ],
    )
    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        api_group = request.API_GROUP
        if api_group and api_group == settings.API_GROUP_FREE:
            return Response(status=401)
        if not request.user.is_authenticated:
            response['X-Accel-Expires'] = 600
        return response

    @cached_property
    def viewed_ids(self):
        return list(UserStory.objects.filter(user=self.request.user).values_list('story_id', flat=True))

    @swagger_auto_schema(
        operation_summary='View a Story.',
        operation_description='Use for marking that a Story was viewed by a User.',
    )
    @action(detail=False, methods=['patch'], permission_classes=[IsAuthenticated])
    def viewed(self, request, *args, **kwargs):
        if not request.data.get('story'):
            request.data['story'] = request.data.get('story_id')
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            UserStory.objects.get_or_create(user_id=request.user.id, story_id=serializer.data.get('story'))
            for pk in GameStory.objects.filter(story_id=serializer.data.get('story')).values_list('id', flat=True):
                UserGameStory.objects.get_or_create(user_id=request.user.id, game_story_id=pk)
        return Response(serializer.data, status=status.HTTP_200_OK)
