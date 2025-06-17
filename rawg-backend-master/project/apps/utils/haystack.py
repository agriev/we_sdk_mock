import operator

from celery_haystack.indexes import CelerySearchIndex as OldCelerySearchIndex
from celery_haystack.signals import CelerySignalProcessor
from drf_haystack.filters import HaystackFilter
from drf_haystack.generics import HaystackGenericAPIView
from haystack import connections, indexes
from haystack.backends.simple_backend import SimpleEngine, SimpleSearchBackend

from apps.utils.api import int_or_none
from apps.utils.elastic import ConfigurableSearchQuerySet, prepare_search


class CustomMixin(object):
    def __init__(self, **kwargs):
        if kwargs.get('analyzer'):
            self.analyzer = kwargs['analyzer']
            del kwargs['analyzer']
        if kwargs.get('search_analyzer'):
            self.search_analyzer = kwargs['search_analyzer']
            del kwargs['search_analyzer']
        if kwargs.get('index_analyzer'):
            self.index_analyzer = kwargs['index_analyzer']
            del kwargs['index_analyzer']
        if kwargs.get('index_options'):
            self.index_options = kwargs['index_options']
            del kwargs['index_options']
        # noinspection PyArgumentList
        super().__init__(**kwargs)


class CharCustom(CustomMixin, indexes.CharField):
    pass


class EdgeNgramCustom(CustomMixin, indexes.EdgeNgramField):
    pass


class MultiValueCustom(CustomMixin, indexes.MultiValueField):
    pass


class CelerySearchIndex(OldCelerySearchIndex):
    def update_object(self, instance, using=None, **kwargs):
        if not self.index_queryset(**kwargs).filter(id=instance.id).exists():
            self.remove_object(instance)
        else:
            super().update_object(instance, using, **kwargs)


class TestSearchBackend(SimpleSearchBackend):
    def update(self, indexer, iterable, commit=True):
        pass

    def remove(self, obj, commit=True):
        pass

    def clear(self, models=None, commit=True):
        pass


class TestEngine(SimpleEngine):
    backend = TestSearchBackend


class SearchBackend(HaystackFilter):
    default_operator = operator.or_
    model = None
    serializer_class = None

    def filter_queryset(self, request, queryset, view):
        if view.action != 'list':
            return queryset
        search_view = HaystackGenericAPIView()
        search_view.index_models = [self.model]
        search_view.serializer_class = self.serializer_class
        search_view.request = request
        search_view.object_class = ConfigurableSearchQuerySet
        search_queryset = search_view.get_queryset()

        custom_query, active = self.build_custom_query(search_queryset, request)
        if not custom_query:
            return queryset

        start_offset = 0
        end_offset = view.paginator.get_page_size(request)
        page = int_or_none(request.query_params.get('page'))
        if page:
            start_offset = (page - 1) * end_offset
            end_offset = start_offset + end_offset

        search_queryset = search_queryset.custom_query(custom_query, None, None, start_offset, end_offset)
        search_queryset.query.run()
        view.is_search = True
        view.search_count = search_queryset.count()
        return search_queryset.query._results

    @classmethod
    def build_custom_query(cls, search_queryset, request):
        active = False
        result = {
            'filter': [
                {
                    'terms': {
                        'django_ct': [f'{cls.model._meta.app_label}.{cls.model._meta.model_name}']
                    }
                }
            ],
            'must': [],
            'should': [],
            'must_not': [],
        }
        active = cls.process_search(result, active, request)
        return ({'bool': result}, active) if active else (None, False)

    @staticmethod
    def process_search(result, active, request):
        query = request.query_params.get('search') or ''
        search = prepare_search(query, True)
        search_simple = prepare_search(query, True, False)
        if search:
            active = 'search'
            result['must'].append({
                'multi_match': {
                    'query': search,
                    'fields': ['name', 'search_name'],
                    'type': 'most_fields',
                    'fuzziness': 'AUTO:4,6',
                }
            })
            result['should'].append({
                'terms': {
                    'exact_name': [search],
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
        return active


def clear_id(pk):
    if type(pk) is str:
        return int(pk.split('.').pop())
    return pk


def model_in_index(model):
    index_holder = connections['default'].get_unified_index()
    return model in index_holder.get_indexes()


class TestSignalProcessor(CelerySignalProcessor):
    def setup(self):
        pass

    def teardown(self):
        pass

    def enqueue_save(self, sender, instance, **kwargs):
        pass

    def enqueue_delete(self, sender, instance, **kwargs):
        pass

    def enqueue(self, action, instance, sender, **kwargs):
        pass
