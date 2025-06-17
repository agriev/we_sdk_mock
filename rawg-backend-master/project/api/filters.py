from django.db.models import Q
from django_filters import Filter
from django_filters.filters import BaseRangeFilter, DateFilter, NumberFilter, QuerySetRequestMixin
from django_filters.rest_framework import DjangoFilterBackend, FilterSet as DefaultFilterSet


class FilterBackend(DjangoFilterBackend):
    def filter_queryset(self, request, queryset, view):
        filter_class = self.get_filter_class(view, queryset)
        if filter_class:
            return filter_class(request.query_params, queryset=queryset, request=request, view=view).qs
        return queryset


class FilterSet(DefaultFilterSet):
    view = None

    def __init__(self, data=None, queryset=None, prefix=None, strict=None, request=None, view=None):
        self.view = view
        super().__init__(data, queryset, prefix, strict, request)


class BaseFilter(Filter, QuerySetRequestMixin):
    def get_view(self):
        try:
            return self.parent.view
        except AttributeError:
            return None


class ListFilter(BaseFilter):
    def filter(self, qs, value):
        if not value:
            return qs
        self.lookup_expr = 'in'
        values = value.split(',')
        try:
            return super().filter(qs, values)
        except ValueError:
            return qs


class DateRangeFilter(BaseRangeFilter, DateFilter, BaseFilter):
    pass


class DateRangeMultipleFilter(BaseFilter):
    def filter(self, qs, value):
        if not value:
            return qs
        if self.distinct:
            qs = qs.distinct()
        args = None
        for val in value.split('.'):
            el = Q(**{'{}__range'.format(self.field_name): val.split(',')})
            if not args:
                args = el
                continue
            args |= el
        return self.get_method(qs)(args)


class NumberRangeFilter(BaseRangeFilter, NumberFilter, BaseFilter):
    pass


class EmptyFilter(BaseFilter):
    def filter(self, qs, value):
        return qs
