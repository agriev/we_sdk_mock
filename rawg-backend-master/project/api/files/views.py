from django.db.models import Prefetch
from django.http import Http404
from rest_framework import viewsets
from stories.exceptions import FailureError

from api.files import serializers
from api.paginations import PageNumberCountPagination
from api.views_mixins import GetObjectMixin
from apps.common import seo
from apps.files import models
from apps.games.models import Game
from apps.utils.api import int_or_none
from functions.drf import DetailPaginated, Retrieve
from implemented.files import ShowCheatCode, ShowCheatCodes


class CheatCodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = models.CheatCode.objects.all()
    permission_classes = ()
    serializer_class = ShowCheatCodes.serializer()
    pagination_class = PageNumberCountPagination

    def retrieve(self, request, *args, **kwargs):
        try:
            obj = ShowCheatCode.service.retrieve(cheat_code_id=int_or_none(kwargs['pk']), request=request)
        except FailureError:
            raise Http404
        response = Retrieve(self, ShowCheatCode.serializer()).response(obj)
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.cheat(obj.game.name, obj.category['name'], obj.number, request))
        return response

    def list(self, request, *args, **kwargs):
        pagination = self.pagination_class()
        category = request.GET.get('category') or ''
        queryset = ShowCheatCodes.service.list(game=None, category=category, pagination=pagination, request=request)
        return DetailPaginated(self, pagination, self.serializer_class).response(queryset)


class DemoViewSet(GetObjectMixin, viewsets.ReadOnlyModelViewSet):
    queryset = models.File.objects.filter(category=models.File.CATEGORY_1)
    permission_classes = ()
    serializer_class = serializers.FileSerializer

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        qs = models.File.objects.filter(category=models.File.CATEGORY_1)
        if self.action == 'retrieve':
            return qs.prefetch_related(Prefetch('game', queryset=Game.objects.only('name')))
        return qs

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        obj = self.get_object()
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.demo(obj.game.name, obj.name, obj.description, request))
        return response


class PatchViewSet(GetObjectMixin, viewsets.ReadOnlyModelViewSet):
    queryset = models.File.objects.filter(category=models.File.CATEGORY_2)
    permission_classes = ()
    serializer_class = serializers.FileSerializer

    def get_queryset(self):
        # https://django-modeltranslation.readthedocs.io/en/latest/caveats.html
        # #using-in-combination-with-django-rest-framework
        qs = models.File.objects.filter(category=models.File.CATEGORY_2)
        if self.action == 'retrieve':
            return qs.prefetch_related(Prefetch('game', queryset=Game.objects.only('name')))
        return qs

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        obj = self.get_object()
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.patch(obj.game.name, obj.name, request))
        return response


class SoftwareViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = models.Software.objects.prefetch_related(
        Prefetch('categories', queryset=models.SoftwareCategory.objects.only('name'))
    )
    permission_classes = ()
    serializer_class = serializers.SoftwareSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        if request.API_CLIENT_IS_WEBSITE:
            response.data.update(seo.software(self.get_object().full_name, self.get_object().description, request))
        return response
