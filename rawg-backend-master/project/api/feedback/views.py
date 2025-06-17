from django.conf import settings
from rest_framework import mixins, status, viewsets
from rest_framework.response import Response

from api.feedback import serializers
from apps.feedback import models


class FeedbackViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = models.Feedback.objects.all()
    permission_classes = ()

    def get_serializer(self, *args, **kwargs):
        self.serializer_class = serializers.FeedbackSerializer
        if self.request.user.is_authenticated:
            self.serializer_class = serializers.FeedbackAuthSerializer
        return super().get_serializer(*args, **kwargs)
