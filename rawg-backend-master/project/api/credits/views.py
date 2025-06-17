from django.contrib.contenttypes.models import ContentType
from django.db.models import BooleanField, Case, Value, When
from django.utils.decorators import method_decorator
from django.views.decorators.vary import vary_on_headers
from django_cache_dependencies.decorators import cache_page
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, viewsets

from api.credits import filters, serializers
from api.functions import is_docs
from api.paginations import PageNumberCountPagination, PageNumberPagination
from api.views_mixins import (
    DisableEditingMixin, DisablePutMixin, GetObjectMixin, RestrictDeletingMixin, SearchPaginateMixin, SlugLookupMixin,
)
from apps.common import seo
from apps.credits import models
from apps.users.models import UserFollowElement
from apps.utils.api import true
from apps.utils.decorators import headers
from apps.utils.haystack import clear_id

person_manual_parameters = [
    openapi.Parameter(
        'id', openapi.IN_PATH, type=openapi.TYPE_STRING,
    ),
]


@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Create a creator.',
    manual_parameters=person_manual_parameters,
))
@method_decorator(name='partial_update', decorator=swagger_auto_schema(
    operation_summary='Update a creator.',
    manual_parameters=person_manual_parameters,
))
@method_decorator(name='destroy', decorator=swagger_auto_schema(
    operation_summary='Delete a creator.',
    manual_parameters=person_manual_parameters,
))
class PersonViewSet(
    RestrictDeletingMixin, DisableEditingMixin, SearchPaginateMixin, GetObjectMixin, SlugLookupMixin, DisablePutMixin,
    viewsets.ModelViewSet
):
    model = models.Person
    queryset = models.Person.objects.visible()
    serializer_class = serializers.PersonSingleSerializer
    pagination_class = PageNumberCountPagination
    filter_backends = (filters.PersonSearchBackend,)

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'retrieve' and is_request:
            kwargs['context'].update(self.get_object().get_context(self.request))
        if self.action == 'list':
            serializer_class = serializers.PersonSerializer
            games = True
            data = args[0]
            if getattr(self, 'is_search', None):
                serializer_class = serializers.PersonSearchSerializer
                games = False
                for row in data:
                    row.id = clear_id(row.id)
            kwargs['context'].update(models.Person.get_many_context(
                data,
                self.request,
                games=games,
                games_count=3 if self.request.GET.get('on_main') else 6,
                for_view=True
            ))
        return serializer_class(*args, **kwargs)

    def get_queryset(self):
        if self.action == 'list':
            qs = self.queryset.only(
                'id', 'name', 'display_name', 'slug', 'image', 'image_background', 'games_count', 'positions',
                'top_games', 'image_wiki'
            )
            if self.request.user.is_authenticated:
                user_id = self.request.user.id
                content_type_id = ContentType.objects.get_for_model(self.model)
                followed_objects_ids = list(
                    UserFollowElement.objects
                    .filter(user_id=user_id, content_type_id=content_type_id)
                    .values_list('object_id', flat=True)
                )

                qs = qs.annotate(
                    following=Case(
                        When(id__in=followed_objects_ids, then=Value(True)),
                        default=Value(False),
                        output_field=BooleanField()
                    )
                )
            if true(self.request.GET.get('on_main')):
                qs = qs.filter(on_main=True).order_by('-on_main_added')
            return qs
        return self.queryset

    @method_decorator([
        vary_on_headers('X-Api-Language', 'Host', 'Origin'),
        headers({'X-Accel-Expires': 3600}),
        cache_page(3600, tags=lambda _: ('credits.persons.main',)),
    ])
    def cache_list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)

    @swagger_auto_schema(operation_summary='Get a list of game creators.')
    def list(self, request, *args, **kwargs):
        if true(self.request.GET.get('on_main')):
            return self.cache_list(request, *args, **kwargs)
        response = super().list(request, *args, **kwargs)
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.lists(models.Person, request))
        return response

    @swagger_auto_schema(
        operation_summary='Get details of the creator.',
        manual_parameters=person_manual_parameters,
    )
    def retrieve(self, request, *args, **kwargs):
        return self.retrieve_with_merged(models.Person, request, *args, **kwargs)


@method_decorator(name='list', decorator=swagger_auto_schema(
    operation_summary='Get a list of creator positions (jobs).',
))
class PositionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    queryset = models.Position.objects.all()
    serializer_class = serializers.PositionSerializer
    pagination_class = PageNumberPagination
    filter_backends = ()

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        return models.Position.objects.all()
