from django_filters.rest_framework import FilterSet, filters

from apps.payments.models import Payment
from apps.payments.utils import Constants


class PaymentFilterSet(FilterSet):
    state = filters.ChoiceFilter(choices=Constants.STATES_CHOICES, field_name='current_state')
    game_sid = filters.CharFilter(field_name='game_session')
    player_id = filters.UUIDFilter()
    app_id = filters.NumberFilter(required=True, field_name='game_id')
    transaction_id = filters.NumberFilter(field_name='id')

    class Meta:
        model = Payment
        fields = ['state', 'game_sid', 'player_id', 'app_id', 'transaction_id']
