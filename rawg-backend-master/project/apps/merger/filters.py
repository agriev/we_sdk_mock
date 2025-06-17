from django.contrib.admin import SimpleListFilter

from apps.games import models


class SimilarGameFilter(SimpleListFilter):
    title = 'Similar Game'
    parameter_name = 'similar'

    def lookups(self, request, model_admin):
        return (
            (None, 'Active'),
            ('ignored', 'Ignored'),
            ('merged', 'Will be merged'),
            ('all', 'All'),
        )

    def choices(self, cl):
        for lookup, title in self.lookup_choices:
            yield {
                'selected': self.value() == lookup,
                'query_string': cl.get_query_string({self.parameter_name: lookup}, []),
                'display': title,
            }

    def queryset(self, request, queryset):
        if request.GET.get('q'):
            queryset = queryset.order_by('-first_game__added', '-second_game__added')
        if self.value() == 'ignored':
            return queryset.filter(is_ignored=True)
        elif self.value() == 'merged':
            return queryset.filter(selected_game__isnull=False)
        elif self.value() is None:
            return queryset.filter(is_ignored=False, selected_game__isnull=True)
        return queryset


class GameContentTypeFilter(SimpleListFilter):
    """Filter for checking merged Game app objects"""
    title = 'Game App Content Type'
    parameter_name = 'game app content type'
    lookup_models = (
        models.Game,
        models.Developer,
        models.Platform,
        models.Genre,
        models.Publisher,
    )

    def lookups(self, request, model_admin):
        lookups = [
            (model._meta.verbose_name.lower(), model._meta.verbose_name) for model in self.lookup_models
        ]
        return lookups

    def queryset(self, request, queryset):
        query_params = [model._meta.verbose_name.lower() for model in self.lookup_models]
        if self.value() in query_params:
            return queryset.filter(content_type__model=self.value())
        return queryset
