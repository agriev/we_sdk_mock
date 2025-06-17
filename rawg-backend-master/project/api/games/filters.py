import operator
from copy import deepcopy

from django_filters.rest_framework import FilterSet, filters
from drf_haystack.filters import HaystackFilter
from drf_haystack.generics import HaystackGenericAPIView

from api.games.serializers import (
    CollectionSearchSerializer, DeveloperSearchSerializer, GameSearchSerializer, PublisherSearchSerializer,
    TagSearchSerializer,
)
from apps.games import cache, models
from apps.utils.api import int_or_none, true
from apps.utils.elastic import ConfigurableSearchQuerySet, prepare_search
from apps.utils.haystack import SearchBackend

ORDERING_FIELDS = ('name', 'released', 'added', 'rating', 'created', 'updated', 'metacritic')
NOT_UNIQUE_ORDERING_FIELDS = ('released', 'added', 'rating', 'metacritic')


class GameSearchBackend(HaystackFilter):
    default_operator = operator.or_

    def filter_queryset(self, request, queryset, view):
        if view and view.action != 'list':
            return queryset
        search_view = HaystackGenericAPIView()
        search_view.index_models = [models.Game]
        search_view.serializer_class = GameSearchSerializer
        search_view.request = request
        search_view.object_class = ConfigurableSearchQuerySet
        search_queryset = search_view.get_queryset()

        one_game = int_or_none(request.query_params.get('id'))
        if one_game:
            return queryset.filter(id=one_game)

        self.is_dates_filter = None
        custom_query, active = self.build_custom_query(request, view)
        if not custom_query:
            return queryset

        ordering = []
        if active == 'filter':
            ordering = ['-added']
        order_value = request.GET.get('ordering')
        if order_value:
            direction = '-' if order_value.startswith('-') else ''
            clear_ordering = order_value[1:] if direction == '-' else order_value
            if clear_ordering in ORDERING_FIELDS:
                ordering = ['{}{}'.format(
                    direction, clear_ordering.replace('name', 'exact_name')
                )]

        facets_rows = {}
        if true(request.GET.get('filter')):
            facets = ['parent_platforms', 'platforms', 'stores', 'genres_ids', 'released_year']
            for facet in facets:
                facets_rows[facet] = {'size': 100}

        start_offset = 0
        end_offset = view.paginator.get_page_size(request)
        page = int_or_none(request.query_params.get('page'))
        if page:
            start_offset = (page - 1) * end_offset
            end_offset = start_offset + end_offset

        search_queryset = search_queryset.custom_query(
            custom_query, ordering, facets_rows if not self.is_dates_filter else None, start_offset, end_offset
        )
        search_queryset.query.run()
        view.is_search = True
        view.facets = (search_queryset.facet_counts() or {}).get('fields') or {}
        view.search_count = search_queryset.count()

        # https://3.basecamp.com/3964781/buckets/11829505/todos/1799018118
        if self.is_dates_filter:
            without_dates_query = deepcopy(custom_query)
            without_dates_query['bool']['filter'] = [
                row for i, row in enumerate(without_dates_query['bool']['filter']) if i + 1 != self.is_dates_filter
            ]
            without_dates_queryset = search_queryset.custom_query(without_dates_query, ordering, facets_rows, 0, 1)
            without_dates_queryset.query.run()
            view.facets = (without_dates_queryset.facet_counts() or {}).get('fields') or {}

        return search_queryset.query._results

    def build_custom_query(self, request, view=None):
        active = False
        result = {
            'filter': [
                {
                    'terms': {
                        'django_ct': ['games.game']
                    }
                }
            ],
            'must': [],
            'should': [],
            'must_not': [],
        }
        active = self.process_dates_filters(result, active, request, 'dates', 'released')
        active = self.process_dates_filters(result, active, request, 'updated', 'updated')
        active = self.process_related_filters(result, active, request, view)
        active = self.process_ids(result, active, request)
        active = self.process_exclude_ids(result, active, request)
        active = self.process_promo(result, active, request)
        active = self.process_exclude_stores(result, active, request)
        active = self.process_exclude_collection(result, active, request)
        active = self.process_exclude_linked(result, active, request)
        active = self.process_search(result, active, request)
        active = self.process_platforms_count(result, active, request)
        active = self.process_metacritic(result, active, request)
        return ({'bool': result}, active) if active else (None, False)

    def process_dates_filters(self, result, active, request, filter_field, model_field):
        dates = request.query_params.get(filter_field)
        if dates:
            args = []
            for pair in dates.split('.'):
                try:
                    from_date, to_date = pair.split(',')
                    args.append({
                        'gte': f'{from_date}||/d',
                        'lte': f'{to_date}||/d',
                    })
                except ValueError:
                    continue
            if args:
                active = 'filter'
                should = []
                for row in args:
                    should.append({'range': {model_field: row}})
                result['filter'].append({'bool': {'should': should}})
                self.is_dates_filter = len(result['filter'])
        return active

    def process_related_filters(self, result, active, request, view=None):
        related_params = ('parent_platforms', 'platforms', 'stores')
        m2m_params = ('developers', 'publishers', 'genres', 'tags', 'creators')
        related_params_args = []
        for param, value in request.query_params.items():
            value = value.split(',')
            if not value:
                continue
            if param in m2m_params:
                is_digit = value[0].isdigit()
                if is_digit:
                    value = [int(e) for e in value if int_or_none(e)]
                sq_param = f'{param}_slugs'
                if is_digit:
                    sq_param = f'{param}_ids'
            elif param in related_params:
                sq_param = f'{param}'
                value = [int(e) for e in value if int_or_none(e)]
            else:
                continue
            related_params_args.append({sq_param: value})
        related_params_keys = [name for row in related_params_args for name in row.keys()]
        if 'genres_ids' in related_params_keys or 'tags_ids' in related_params_keys:
            platforms = view and view.list_platforms_user_platforms(request)
            if platforms:
                related_params_args.append({'platforms': platforms})
        if related_params_args:
            active = 'filter'
            must = []
            for row in related_params_args:
                must.append({'terms': row})
            result['filter'].append({'bool': {'must': must}})
        return active

    def process_ids(self, result, active, request):
        ids = request.query_params.get('ids')
        if ids:
            active = 'filter'
            ids = [int(pk) for pk in ids.split(',') if int_or_none(pk)]
            result['filter'].append({
                'terms': {
                    'id': ids
                }
            })
        return active

    def process_promo(self, result, active, request):
        promo = request.query_params.get('promo')
        if promo:
            active = 'filter'
            result['filter'].append({
                'term': {
                    'promo': promo
                }
            })
        return active

    def process_exclude_ids(self, result, active, request):
        ids = [el for el in (request.query_params.get('exclude') or '').split(',') if el]
        if ids:
            active = 'filter'
            if int_or_none(ids[0]):
                ids = [int(pk) for pk in ids if int_or_none(pk)]
                result['must_not'].append({
                    'terms': {
                        'id': ids
                    }
                })
            else:
                result['must_not'].append({
                    'terms': {
                        'slug': ids
                    }
                })
        return active

    def process_exclude_collection(self, result, active, request):
        exclude_collection = int_or_none(request.query_params.get('exclude_collection'))
        if exclude_collection:
            active = 'filter'
            ids = models.CollectionGame.objects.filter(collection_id=exclude_collection) \
                .values_list('game_id', flat=True)
            result['must_not'].append({
                'terms': {
                    'id': list(ids)
                }
            })
        return active

    def process_exclude_stores(self, result, active, request):
        exclude_stores = request.query_params.get('exclude_stores')
        if exclude_stores:
            values = [int(e) for e in exclude_stores.split(',') if int_or_none(e)]
            if values:
                active = 'filter'
                result['must_not'].append({'terms': {'stores': values}})
        return active

    def process_exclude_linked(self, result, active, request):
        data = {'additions': 'parents', 'parents': 'additions', 'game_series': 'game_series'}
        for field in data.keys():
            if true(request.query_params.get(f'exclude_{field}')):
                active = 'filter'
                result['must'].append({
                    'term': {
                        f'{data[field]}_count': 0
                    }
                })
        return active

    def process_search(self, result, active, request):
        query = request.query_params.get('search') or ''
        is_precise = true(request.query_params.get('search_precise'))
        is_exact = true(request.query_params.get('search_exact'))
        search = prepare_search(query, True)
        search_simple = prepare_search(query, True, False)
        if search:
            active = 'search'
            if is_exact:
                result['must'].append({
                    'match_phrase': {
                        'name': search,
                    },
                })
                return active
            multi_match = {
                'query': search,
                'fields': ['name', 'search_name', 'search_names'],
                'type': 'most_fields',
            }
            if not is_precise:
                multi_match['fuzziness'] = 'AUTO:4,6'
            result['must'].append({
                'multi_match': multi_match
            })
            result['should'].append({
                'terms': {
                    'exact_name': [search],
                    'boost': 30.0,
                },
            })
            result['should'].append({
                'terms': {
                    'exact_names': [search],
                    'boost': 30.0,
                },
            })
            result['should'].append({
                'prefix': {
                    'exact_name': {
                        'value': search_simple,
                        'boost': 10.0,
                    },
                },
            })
            result['should'].append({
                'range': {
                    'added': {
                        'lt': 50,
                        'boost': -15.0,
                    }
                },
            })
        return active

    def process_platforms_count(self, result, active, request):
        platforms_count = int_or_none(request.query_params.get('platforms_count'))
        if platforms_count:
            active = 'filter'
            result['filter'].append({
                'term': {
                    'platforms_count': platforms_count
                }
            })
        return active

    def process_metacritic(self, result, active, request):
        value = request.query_params.get('metacritic')
        if value and ',' in value:
            from_value, to_value = value.split(',')
            from_value = int_or_none(from_value)
            to_value = int_or_none(to_value)
            if from_value and to_value:
                active = 'filter'
                result['filter'].append({
                    'range': {
                        'metacritic': {
                            'gte': from_value,
                            'lte': to_value,
                        }
                    }
                })
        return active


class CollectionSearchBackend(SearchBackend):
    serializer_class = CollectionSearchSerializer
    model = models.Collection


class TagSearchBackend(SearchBackend):
    serializer_class = TagSearchSerializer
    model = models.Tag


class DeveloperSearchBackend(SearchBackend):
    serializer_class = DeveloperSearchSerializer
    model = models.Developer


class PublisherSearchBackend(SearchBackend):
    serializer_class = PublisherSearchSerializer
    model = models.Publisher


class RecommendedListFilterSet(FilterSet):
    play_on_desktop = filters.BooleanFilter()
    play_on_mobile = filters.BooleanFilter()

    class Meta:
        model = models.Game
        fields = ['play_on_desktop', 'play_on_mobile']


class FeaturedListFilterSet(FilterSet):
    play_on_desktop = filters.BooleanFilter()
    play_on_mobile = filters.BooleanFilter()

    class Meta:
        models = models.Featured
        fields = ['play_on_desktop', 'play_on_mobile']


class PlayableGamesFilterSet(FilterSet):
    play_on_desktop = filters.BooleanFilter()
    play_on_mobile = filters.BooleanFilter()
    promo = filters.BooleanFilter(method='filter_promo')

    class Meta:
        model = models.Game
        fields = ['play_on_desktop', 'play_on_mobile', 'promo']

    def filter_promo(self, queryset, name, value):
        promo_ids = cache.GameGetListPromo().get()
        if value:
            return queryset.filter(id__in=promo_ids)
        return queryset.exclude(id__in=promo_ids)
