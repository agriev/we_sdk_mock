from drf_haystack.filters import HaystackFilter
from haystack.utils import get_model_ct

from apps.utils.api import int_or_none
from apps.utils.elastic import prepare_search


class SearchBackend(HaystackFilter):
    def filter_queryset(self, request, queryset, view):
        search_queryset = view.get_queryset()

        custom_query = self.build_custom_query(search_queryset, request, view)
        if not custom_query:
            return []

        start_offset = 0
        end_offset = view.paginator.get_page_size(request)
        page = int_or_none(request.query_params.get('page'))
        if page:
            start_offset = (page - 1) * end_offset
            end_offset = start_offset + end_offset

        search_queryset = search_queryset.custom_query(custom_query, [], {}, start_offset, end_offset)
        search_queryset.query.run()
        view.search_count = search_queryset.count()
        return search_queryset.query._results

    @classmethod
    def build_custom_query(cls, search_queryset, request, view):
        active = False
        result = {
            'filter': [
                {
                    'terms': {
                        'django_ct': [get_model_ct(model) for model in view.index_models]
                    }
                }
            ],
            'must': [],
            'should': [],
            'must_not': [],
        }
        active = cls.process_search(result, active, request, view)
        return {'bool': result} if active else None

    @staticmethod
    def process_search(result, active, request, view):
        query = request.query_params.get('search') or ''
        search = prepare_search(query, True)
        search_simple = prepare_search(query, True, False)
        if search:
            active = 'search'
            result['must'].append({
                'multi_match': {
                    'query': search,
                    'fields': ['name', 'search_name', 'search_names'],
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
            # https://3.basecamp.com/3964781/buckets/11596969/todos/1801989416
            result['should'].append({
                'terms': {
                    'django_ct': [get_model_ct(model) for model in view.important_models[:-1]],
                    'boost': 50.0,
                },
            })
            result['should'].append({
                'terms': {
                    'django_ct': [get_model_ct(view.important_models[-1])],
                    'boost': 40.0,
                },
            })
        return active
