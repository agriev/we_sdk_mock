from datetime import timedelta

import dateutil
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils.timezone import now
from rest_framework.authentication import TokenAuthentication as OriginalTokenAuthentication

from apps.utils.dicts import find


class TokenAuthentication(OriginalTokenAuthentication):
    is_current = False
    method = 'GET'

    def authenticate(self, request):
        self.method = request.method
        self.url_name = request.resolver_match.url_name
        self.is_current = self.url_name == 'user-detail' and request.resolver_match.kwargs.get('pk') == 'current'
        self.is_feed_counter = self.url_name == 'feed-counters'
        default_token = b''
        if settings.ENVIRONMENT != 'PRODUCTION' and request.GET.get('token'):
            default_token = 'Token {}'.format(request.GET.get('token'))
        request.META['HTTP_AUTHORIZATION'] = request.META.get('HTTP_TOKEN', default_token)
        return super().authenticate(request)

    def authenticate_credentials(self, key):
        from apps.users.tasks import update_last_entered, update_user_statistics
        from apps.recommendations.tasks import update_user_recommendations

        model = self.get_model()
        try:
            token = model.objects.only('user_id').get(key=key)
            qs = get_user_model().objects
            if self.method not in ('POST', 'PUT', 'PATCH') and not self.is_current:
                qs = qs.defer_all('is_staff', 'is_superuser', 'settings')
            if self.is_feed_counter:
                user = get_user_model()
                user.id = token.user_id
                return user, token
            user = qs.get(id=token.user_id)
            if self.is_current:
                if not user.last_entered or now() - user.last_entered > timedelta(minutes=5):
                    update_last_entered.delay(user.id)
                    update_user_statistics.delay(user.id, None)
                recommendations_date = find(user.settings, 'recommendations_users_date', None)
                if (
                    recommendations_date
                    and now() - dateutil.parser.parse(recommendations_date) > timedelta(minutes=60 * 5)
                ):
                    update_user_recommendations.delay(user.id)
                # if not user.feedback_propose:
                #     user.feedback_propose = True
                #     user.save()
                #     feedback_propose.delay(user.id)
        except model.DoesNotExist:
            return AnonymousUser(), ''
        if not user.is_active:
            return AnonymousUser(), ''
        return user, token
