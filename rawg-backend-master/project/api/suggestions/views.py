from django.http import HttpRequest
from rest_framework import mixins, viewsets
from rest_framework.decorators import action

from api.games.filters import GameSearchBackend
from api.games.paginations import CollectionPagination, GamePagination
from api.games.serializers import GameSearchSerializer, GameSerializer
from api.suggestions import serializers
from api.views_mixins import GetObjectMixin, PaginateDetailRouteMixin, SlugLookupMixin
from apps.games.models import Game
from apps.suggestions import models
from apps.utils.elastic import ConfigurableSearchQuerySet
from apps.utils.haystack import clear_id
from apps.utils.list import chunky


class SuggestionsViewSet(
    GetObjectMixin, SlugLookupMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
    viewsets.GenericViewSet, PaginateDetailRouteMixin
):
    queryset = models.Suggestion.objects.all()
    serializer_class = serializers.SuggestionsSerializer
    pagination_class = CollectionPagination

    def get_serializer_class(self):
        if self.action == 'games' and getattr(self, 'is_search', None):
            return GameSearchSerializer
        if self.action == 'games':
            return GameSerializer
        if self.action == 'list':
            return serializers.SuggestionsShortSerializer
        return super().get_serializer_class()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'list' and kwargs.get('many'):
            kwargs['context'].update(models.Suggestion.get_many_context(args[0], self.request))
            kwargs['context'].update(Game.get_many_context(
                [item for sub in kwargs['context']['suggested_games'].values() for item in sub], self.request
            ))
        elif self.action == 'games':
            kwargs['context'].update(Game.get_many_context(args[0], self.request))
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action == 'games':
            return models.Suggestion.objects.prefetch_related('suggestionfilters_set')
        return super().get_queryset()

    @action(detail=True)
    def games(self, request, pk):
        self.pagination_class = GamePagination
        obj = self.get_object()

        ordering = ['-added', '-id']
        filter_ordering = obj.get_ordering()
        if filter_ordering:
            ordering.insert(0, filter_ordering)

        queryset = Game.objects.defer_all() \
            .filter(**obj.get_filters()) \
            .order_by(*ordering)

        search = self.request.GET.get('search')
        if search:
            ids_to_search = queryset.values_list('id', flat=True)
            search_chunks = chunky(ids_to_search, 1000)
            search_results = []
            for chunk in search_chunks:
                fake_request = HttpRequest()
                fake_request.query_params = {'ids': ','.join(map(str, chunk)), 'search': search}
                custom_query, _ = GameSearchBackend().build_custom_query(fake_request)
                qs = ConfigurableSearchQuerySet().custom_query(custom_query).values_list('id', flat=True)
                search_results.extend([clear_id(row) for row in qs])
            queryset = queryset.filter(id__in=search_results)

        if obj.limit:
            queryset = queryset[0:obj.limit]

        if request.user.is_authenticated:
            self.user_games = request.user.get_user_games(
                queryset.only('id').values_list('id', flat=True),
                from_queryset=False
            )
        else:
            self.user_games = {}

        return self.get_paginated_detail_response(queryset, self.get_serializer)
