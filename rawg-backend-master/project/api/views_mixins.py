import reversion
from django.conf import settings
from django.http import Http404
from django.utils import translation
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from rest_framework import status
from rest_framework.request import clone_request
from rest_framework.response import Response

from apps.common.cache import CommonContentType
from apps.merger.models import MergedSlug
from apps.utils.api import int_or_number
from apps.utils.decorators import headers
from apps.utils.dicts import merge


class FakePaginateMixin:
    def fake_count_queryset(self, count):
        meta = type('FakeList', (type,), {'__len__': lambda cls: count, '__getitem__': lambda x, y: []})
        return meta('FakeList', (object,), {})

    def raw_paginate(self, request, count, args):
        self.paginator.paginate_queryset(self.fake_count_queryset(count), self.request, view=self)
        page_size = self.paginator.get_page_size(request)
        args.append(page_size)
        offset = int_or_number(request.GET.get('offset'))
        args.append((self.paginator.page.number - 1) * page_size + offset)
        return args


class SearchPaginateMixin:
    def paginate_queryset(self, queryset):
        if getattr(self, 'is_search', None):
            return self.paginator.paginate_count_queryset(queryset, self.search_count, self.request, self, True)
        return super().paginate_queryset(queryset)


class PaginateDetailRouteMixin:
    # todo migrate to functions.drf.PaginatedDetailResponse
    def get_paginated_detail_serializer(self, queryset, serializer_class=None, serializer_kwargs=None):
        if not serializer_kwargs:
            serializer_kwargs = {}
        kwargs = {'many': True, 'context': self.get_serializer_context()}
        kwargs = merge(kwargs, serializer_kwargs)
        if serializer_class:
            serializer = serializer_class(queryset, **kwargs)
        else:
            serializer = self.get_serializer(queryset, **kwargs)
        return serializer

    def get_paginated_detail_response(self, queryset, serializer_class=None, serializer_kwargs=None,
                                      count_queryset=None):
        if count_queryset is not None:
            page = self.paginator.paginate_count_queryset(queryset, count_queryset, self.request, view=self)
        else:
            page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_paginated_detail_serializer(page, serializer_class, serializer_kwargs)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_paginated_detail_serializer(queryset, serializer_class, serializer_kwargs)
        return Response(serializer.data)


class SlugLookupMixin:
    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        if not self.kwargs[lookup_url_kwarg].isdigit():
            self.lookup_field = getattr(self, 'lookup_field_slug', 'slug')
            self.lookup_url_kwarg = lookup_url_kwarg
        return super().get_object()

    def try_get_merged_slugs(self, model, request, *args, **kwargs):
        try:
            merged_slugs = MergedSlug.objects.get(
                old_slug=kwargs['pk'],
                content_type=CommonContentType().get(model)
            )
            return merged_slugs
        except MergedSlug.DoesNotExist:
            return super().retrieve(request, *args, **kwargs)

    def retrieve_with_merged(self, model, request, *args, **kwargs):
        try:
            instance = self.get_object()
            return super().retrieve(request, instance, *args, **kwargs)
        except Http404:
            merged_slug = self.try_get_merged_slugs(model, request, *args, **kwargs)
            data = {'redirect': True, 'slug': merged_slug.new_slug}
            return Response(data)


class GetObjectMixin:
    object = None

    def _object(self):
        return super().get_object()

    def get_object(self):
        if not self.object:
            self.object = self._object()
        return self.object


class CacheListMixin:
    @method_decorator([
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        headers({'X-Accel-Expires': 3600}),
        cache_page(3600),
    ])
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class CacheListAnonMixin:
    @method_decorator([
        headers({'Cache-Control': 'no-cache'}),
        cache_page(3600),
    ])
    def cache_list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    def list(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super().list(request, *args, **kwargs)
        return self.cache_list(request, *args, **kwargs)


class DisablePutMixin:
    http_method_names = [name for name in View.http_method_names if name != 'put']


class DisableEditingMixin:
    def dispatch(self, request, *args, **kwargs):
        if (
            request.method.lower() in ['post', 'put', 'patch', 'delete']
            and request.LANGUAGE_CODE == settings.LANGUAGE_RU
        ):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return super().dispatch(request, *args, **kwargs)


class RestrictDeletingMixin:
    def destroy(self, request, *args, **kwargs):
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)
        with reversion.create_revision(), translation.override(settings.MODELTRANSLATION_DEFAULT_LANGUAGE):
            reversion.set_comment(f'Deleted by {request.user.email} (id: {request.user.id}).')
            reversion.set_user(request.user)
            return super().destroy(request, *args, **kwargs)


class AllowPUTAsCreateMixin:
    """
    The following mixin class may be used in order to support PUT-as-create
    behavior for incoming requests.
    https://www.django-rest-framewoxrk.org/api-guide/generic-views/#put-as-create
    """

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object_or_none()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        if instance is None:
            lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
            lookup_value = self.kwargs[lookup_url_kwarg]
            extra_kwargs = {self.lookup_field: lookup_value}
            serializer.save(**extra_kwargs)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        serializer.save()
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def get_object_or_none(self):
        try:
            return self.get_object()
        except Http404:
            if self.request.method == 'PUT':
                self.check_permissions(clone_request(self.request, 'POST'))
            else:
                raise
