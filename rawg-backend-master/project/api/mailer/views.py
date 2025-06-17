from hashlib import sha1

from django.conf import settings
from django.db import transaction
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from api.mailer.serializers import UnsubscribeSerializer
from api.users.views import GetUserFromRequestMixin
from api.views_mixins import SlugLookupMixin
from apps.users.models import User
from apps.utils.exceptions import capture_exception


class UnsubscribeViewSet(SlugLookupMixin, GetUserFromRequestMixin, mixins.RetrieveModelMixin,
                         mixins.UpdateModelMixin, viewsets.GenericViewSet):
    queryset = User.objects.all()
    serializer_class = UnsubscribeSerializer
    permission_classes = (AllowAny,)

    def retrieve(self, request, *args, **kwargs):
        email = request.GET.get('email')
        requested_hash = request.GET.get('hash')
        security_hash = sha1('{}.{}'.format(email, settings.SECRET_KEY).encode('utf-8')).hexdigest()
        if not requested_hash == security_hash:
            raise NotAuthenticated

        self.queryset = self.get_queryset().filter(id=self.get_object().id)
        return super().retrieve(request, *args, **kwargs)

    def patch(self, request, pk, requested_hash, *args, **kwargs):
        return self.patch_settings(request, pk, requested_hash, *args, **kwargs)

    @action(detail=True, methods=['PATCH'], url_path=r'(?P<requested_hash>\w+)')
    def patch_settings(self, request, pk, requested_hash, *args, **kwargs):
        user = self.get_object()
        security_hash = sha1('{}.{}'.format(user.email, settings.SECRET_KEY).encode('utf-8')).hexdigest()
        if not requested_hash == security_hash:
            raise NotAuthenticated

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            try:
                User.objects.filter(id=user.id).update(
                    **serializer.data
                )
            except Exception as e:
                capture_exception(e)
                return Response({}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.data, status=status.HTTP_200_OK)
