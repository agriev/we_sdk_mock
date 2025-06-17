from typing import Union

from django.core.paginator import InvalidPage, Page, Paginator as DjangoPaginator
from django.db.models import QuerySet
from django.utils.functional import cached_property
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination as DefaultPageNumberPagination
from rest_framework.request import Request
from rest_framework.views import APIView


class CountPaginator(DjangoPaginator):
    count_queryset = None
    disable_slice = False

    @cached_property
    def count(self):
        return self.count_queryset

    def page(self, number):
        if self.disable_slice:
            number = self.validate_number(number)
            return self._get_page(self.object_list, number, self)
        return super().page(number)


class PageNumberPagination(DefaultPageNumberPagination):
    page_size_query_param = 'page_size'
    max_page_size = 40

    def init_params(self, queryset: QuerySet, request: Request):
        if getattr(self, 'request', None):
            return
        page_size = self.get_page_size(request)
        self.paginator = self.get_paginator(queryset, page_size)
        page_number = request.query_params.get(self.page_query_param, 1)
        if page_number in self.last_page_strings:
            page_number = self.paginator.num_pages
        try:
            self.page_number = self.paginator.validate_number(page_number)
        except InvalidPage as exc:
            raise NotFound(self.invalid_page_message.format(page_number=page_number, message=str(exc)))
        self.page_size = page_size
        self.request = request

    def paginate_queryset_page(self, queryset: QuerySet, request: Request, view: APIView = None) -> Page:
        """
        Return Page, not list.
        """
        self.init_params(queryset, request)
        self.page = self.paginator.page(self.page_number)
        return self.page

    def get_paginator(self, queryset: QuerySet, page_size: int) -> DjangoPaginator:
        paginator = self.django_paginator_class(queryset, page_size)
        # The browsable API should display pagination controls.
        if paginator.num_pages > 1 and self.template is not None:
            self.display_page_controls = True
        return paginator


class PageNumberCountPagination(PageNumberPagination):
    count_queryset = None
    disable_slice = False

    @property
    def django_paginator_class(self):
        if self.count_queryset is None:
            return DjangoPaginator
        return type(
            'CustomCountPaginator', (CountPaginator,),
            {'count_queryset': self.count_queryset, 'disable_slice': self.disable_slice}
        )

    def paginate_count_queryset(
        self, queryset: QuerySet, count_queryset: Union[QuerySet, int], request: Request,
        view: APIView = None, disable_slice: bool = False
    ):
        # todo migrate to `paginate_count_queryset_page`
        self.count_queryset = count_queryset
        self.disable_slice = disable_slice
        return self.paginate_queryset(queryset, request, view)

    def paginate_count_queryset_page(
        self, queryset: QuerySet, count_queryset: Union[QuerySet, int], request: Request,
        view: APIView = None, disable_slice: bool = False
    ):
        self.count_queryset = count_queryset
        self.disable_slice = disable_slice
        return self.paginate_queryset_page(queryset, request, view)
