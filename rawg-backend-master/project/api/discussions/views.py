from django.db import transaction
from django.db.models import Prefetch
from rest_framework import mixins, viewsets

from api.comments.views import BaseCommentViewSet, BaseLikeViewSet
from api.discussions import paginations, serializers
from api.functions import is_docs
from api.users.permissions import IsUserOwnerOrAdmin
from api.views_mixins import GetObjectMixin
from apps.comments.models import CommentDiscussion, LikeDiscussion
from apps.discussions import models, seo
from apps.games.models import Game


class DiscussionViewSet(GetObjectMixin, mixins.CreateModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin,
                        mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = models.Discussion.objects.visible()
    permission_classes = (IsUserOwnerOrAdmin,)
    serializer_class = serializers.DiscussionSerializer
    pagination_class = paginations.DiscussionPagination

    def get_queryset(self):
        if self.action == 'retrieve':
            return self.queryset.prefetch_related(Prefetch('game', queryset=Game.objects.defer_all()))
        return super().get_queryset()

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'retrieve' and is_request:
            kwargs['context'].update(self.get_object().get_context(self.request))
        return serializer_class(*args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        response.data.update(seo.discussion(self.get_object(), request))
        return response

    @transaction.atomic
    def perform_create(self, serializer):
        super().perform_create(serializer)

    @transaction.atomic
    def perform_update(self, serializer):
        super().perform_update(serializer)

    @transaction.atomic
    def perform_destroy(self, instance):
        instance.hidden = True
        instance.save()


class CommentViewSet(BaseCommentViewSet):
    queryset = CommentDiscussion.objects.all()
    serializer_class = serializers.CommentSerializer


class CommentLikeViewSet(BaseLikeViewSet):
    queryset = LikeDiscussion.objects.all()
    serializer_class = serializers.CommentLikeSerializer
