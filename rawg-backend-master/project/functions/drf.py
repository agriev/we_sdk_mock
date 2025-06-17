from typing import Iterable, Type

from attr import attrib, attrs
from django.core.paginator import Page, Paginator
from django.db.models import QuerySet
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response
from rest_framework.serializers import Serializer

from api.paginations import PageNumberCountPagination
from apps.utils.dicts import merge


@attrs
class DetailPaginated:
    view: GenericAPIView = attrib()
    pagination: PageNumberCountPagination = attrib()
    serializer_class: Type[Serializer] = attrib()
    serializer_kwargs: dict = attrib(default=None)

    def get_serializer(self, queryset):
        kwargs = {'many': True, 'context': self.view.get_serializer_context()}
        if self.serializer_kwargs:
            kwargs = merge(kwargs, self.serializer_kwargs)  # merge all context variables, don't update
        return self.serializer_class(queryset, **kwargs)

    def response(self, queryset):
        page_number = getattr(self.pagination, 'page_number', 1)
        paginator = getattr(self.pagination, 'paginator', Paginator([], 1))
        self.pagination.page = Page(queryset, page_number, paginator)
        self.view._paginator = self.pagination  # for the browsable API
        return self.pagination.get_paginated_response(self.get_serializer(queryset).data)


@attrs
class Retrieve:
    view: GenericAPIView = attrib()
    serializer_class: Type[Serializer] = attrib()
    serializer_kwargs: dict = attrib(default=None)

    def get_serializer(self, obj):
        kwargs = {'context': self.view.get_serializer_context()}
        if self.serializer_kwargs:
            kwargs = merge(kwargs, self.serializer_kwargs)  # merge all context variables, don't update
        return self.serializer_class(obj, **kwargs)

    def response(self, obj):
        return Response(self.get_serializer(obj).data)


@attrs
class DetailQuerySet:
    view: GenericAPIView = attrib()
    only: Iterable = attrib(default=None)
    queryset: QuerySet = attrib(default=None)

    def __enter__(self):
        self.old_queryset = self.view.queryset
        if self.only:
            self.view.queryset = self.old_queryset.only(*self.only)
        else:
            self.view.queryset = self.queryset
        return self

    def __exit__(self, *args, **kwargs):
        self.view.queryset = self.old_queryset


class GetObject(DetailQuerySet):
    def aggregate(self, mapper):
        with DetailQuerySet(self.view, self.only, self.queryset):
            return mapper.reader_plain(self.view.get_object())
