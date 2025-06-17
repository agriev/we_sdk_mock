import math

from django.contrib.auth import get_user_model
from django.db.models import Prefetch
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST

from api.comments import paginations
from api.functions import is_docs
from api.users.permissions import IsUserOwner, IsUserOwnerOrAdmin
from api.views_mixins import GetObjectMixin, PaginateDetailRouteMixin


class BaseCommentViewSet(GetObjectMixin, viewsets.ModelViewSet, PaginateDetailRouteMixin):
    queryset = None
    serializer_class = None
    permission_classes = (IsUserOwnerOrAdmin,)
    pagination_class = paginations.CommentPagination

    def get_queryset(self):
        object_id = self.kwargs.get('object_pk')
        if self.action == 'list' and object_id:
            qs = self.queryset.filter(object_id=object_id, parent_id__isnull=True).prefetch_related(
                Prefetch('user', queryset=get_user_model().objects.defer_all())
            )
            if not self.request.user.is_authenticated:
                qs = qs.filter(language=self.request.LANGUAGE_CODE_ISO3)
            return qs
        return self.queryset

    def get_serializer(self, *args, **kwargs):
        serializer_class = self.get_serializer_class()
        is_request = not is_docs(kwargs)
        kwargs['context'] = self.get_serializer_context()
        if self.action == 'retrieve' and is_request:
            kwargs['context'].update(self.get_object().get_context(self.request))
        if self.action in ('list', 'children'):
            kwargs['context'].update(
                kwargs['context']['view'].serializer_class.Meta.model.get_many_context(args[0], self.request)
            )
        return serializer_class(*args, **kwargs)

    def list(self, request, *args, **kwargs):
        return self.reverse(super().list(request, *args, **kwargs))

    @action(detail=True)
    def children(self, request, object_pk, pk):
        return self.reverse(self.get_paginated_detail_response(self.get_object().children.all()))

    @action(detail=True)
    def page(self, request, object_pk, pk):
        comment = self.get_object()
        children_id = None
        children_page = None
        if comment.parent_id:
            data = list(self.queryset.filter(object_id=object_pk, parent=comment.parent).values_list('id', flat=True))
            children_id = comment.id
            children_page = math.ceil((data.index(comment.id) + 1) / self.pagination_class.page_size)
            comment = comment.parent
        data = list(self.queryset.filter(object_id=object_pk, parent_id__isnull=True).values_list('id', flat=True))
        try:
            page = math.ceil((data.index(comment.id) + 1) / self.pagination_class.page_size)
        except ValueError:
            return Response({'error': 'The comment is not found'}, status=HTTP_400_BAD_REQUEST)
        return Response({
            'id': comment.id,
            'page': page,
            'children_id': children_id,
            'children_page': children_page,
        })

    def reverse(self, response):
        response.data['results'] = response.data['results'][::-1]
        return response


class BaseLikeViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = None
    serializer_class = None
    permission_classes = (IsUserOwner,)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), comment_id=self.kwargs['comment_pk'], user_id=self.kwargs['pk'])
        self.check_object_permissions(self.request, obj)
        return obj
