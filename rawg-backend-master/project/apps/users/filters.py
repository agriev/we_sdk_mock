from django.contrib.admin import SimpleListFilter
from django.db.models import Q


class GameAccountFilter(SimpleListFilter):
    title = 'Game accounts'
    parameter_name = 'account'
    params = {
        'steam_id': 'Steam',
        'gamer_tag': 'Xbox',
        'psn_online_id': 'Playstation',
        'gog': 'GOG',
    }

    def lookups(self, request, model_admin):
        data = [('any', 'Any')]
        for key, value in self.params.items():
            data.append((key, value))
        return data

    def queryset(self, request, queryset):
        if self.value() == 'any':
            values = None
            for key, value in self.params.items():
                row = Q(**{key: ''})
                if not values:
                    values = row
                    continue
                values &= row
            return queryset.exclude(values)
        elif self.value() in self.params.keys():
            return queryset.exclude(**{self.value(): ''})
        return queryset


class GameSuccessAccountFilter(GameAccountFilter):
    title = 'Game success accounts'
    parameter_name = 'success_account'

    def queryset(self, request, queryset):
        statuses = ('error', 'private-user', 'private-games')
        if self.value() == 'any':
            values = None
            for key, value in self.params.items():
                row = (Q(**{key: ''}) | Q(**{'{}_status__in'.format(key): statuses}))
                if not values:
                    values = row
                    continue
                values &= row
            return queryset.exclude(values)
        elif self.value() in self.params.keys():
            return queryset.exclude(Q(**{self.value(): ''}) | Q(**{'{}_status__in'.format(self.value()): statuses}))
        return queryset


class IsApiKeyFilter(SimpleListFilter):
    title = 'Is API key'
    parameter_name = 'is_api_key'

    def lookups(self, request, model_admin):
        return [
            ('yes', 'Yes'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.exclude(api_email='')
        return queryset
