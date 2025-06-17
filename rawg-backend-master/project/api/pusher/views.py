from django.utils.datastructures import MultiValueDictKeyError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_403_FORBIDDEN
from rest_framework.views import APIView

from apps.pusher.client import get_client
from apps.pusher.models import Notification
from apps.utils.api import get_object_or_none


class AuthView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        try:
            if request.user.username != request.POST['channel_name'].replace('private-', ''):
                return Response(status=HTTP_403_FORBIDDEN)
            return Response(get_client().authenticate(
                channel=request.POST['channel_name'],
                socket_id=request.POST['socket_id']
            ))
        except (ValueError, MultiValueDictKeyError):
            return Response(status=HTTP_400_BAD_REQUEST)


class WebHookView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request, *args, **kwargs):
        body = request.body.decode('utf-8')
        events = get_client().validate_webhook(
            key=request.META.get('HTTP_X_PUSHER_KEY'),
            signature=request.META.get('HTTP_X_PUSHER_SIGNATURE'),
            body=body,
        )['events']
        for event in events:
            if event['name'] != 'client_event' or event['channel'][0:8] != 'private-':
                continue
            username = event['channel'][8:]
            if event['event'] == 'client-connected':
                notifications = Notification.objects.prefetch_related('user') \
                    .filter(user__username=username, confirmed=False)
                for notification in notifications:
                    notification.send()
            if event['event'] == 'client-received':
                notification = get_object_or_none(Notification.objects.all(), id=event['data']['id'])
                if notification and notification.user.username == username:
                    notification.confirmed = True
                    notification.save()
        return Response()
