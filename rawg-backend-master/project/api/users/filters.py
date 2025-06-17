from django.contrib.auth import get_user_model
from django_filters.rest_framework import FilterSet, filters
from rest_framework.filters import SearchFilter

from api.users.serializers import UserSearchSerializer
from apps.users.models import Subscription, SubscriptionProgram
from apps.utils.elastic import prepare_search
from apps.utils.haystack import SearchBackend


class UserSearchFilter(SearchFilter):
    def filter_queryset(self, request, queryset, view):
        if view.action == 'list':
            return queryset
        return super().filter_queryset(request, queryset, view)


class UserSearchBackend(SearchBackend):
    serializer_class = UserSearchSerializer
    model = get_user_model()

    @staticmethod
    def process_search(result, active, request):
        search = prepare_search(request.query_params.get('search') or '', True)
        if search:
            active = 'search'
            result['must'].append({
                'multi_match': {
                    'query': search,
                    'fields': ['username', 'search_name', 'full_name', 'search_full_name'],
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
                    'exact_full_name': [search],
                    'boost': 30.0,
                },
            })
        return active


class SubscriptionFilterSet(FilterSet):
    game_id = filters.NumberFilter(min_value=1, field_name='program__game_id')
    status = filters.ChoiceFilter(choices=SubscriptionProgram.STATUSES, field_name='program__status')

    class Meta:
        model = Subscription
        fields = ('game_id', 'status')
