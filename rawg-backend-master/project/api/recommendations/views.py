from django.utils.decorators import method_decorator
from drf_yasg.utils import swagger_auto_schema
from rest_framework import mixins, viewsets
from rest_framework.permissions import IsAuthenticated

from api.recommendations import serializers
from apps.recommendations import models


@method_decorator(name='create', decorator=swagger_auto_schema(
    operation_summary='Dislike a User Recommendation.',
))
class UserRecommendationDislikeViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = models.UserRecommendationDislike.objects.all()
    serializer_class = serializers.UserRecommendationDislikeSerializer
    permission_classes = (IsAuthenticated,)
    filter_backends = []
