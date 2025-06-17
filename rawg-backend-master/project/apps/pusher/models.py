from django.conf import settings
from django.contrib.postgres.fields import JSONField
from django.db import models
from django.utils.timezone import now

from apps.pusher.client import get_client


class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, models.CASCADE)
    action = models.CharField(max_length=100)
    data = JSONField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    confirmed = models.BooleanField(default=False, db_index=True)
    confirmation_date = models.DateTimeField(auto_now=True)

    @property
    def channel(self):
        return 'private-{}'.format(self.user.username)

    def send(self):
        self.data['id'] = self.id
        if settings.ENVIRONMENT == 'TESTS':
            return
        get_client().trigger(self.channel, self.action, self.data)

    @classmethod
    def get_or_create(cls, user, action, data, today=False):
        kwargs = {
            'user': user,
            'action': action,
            'defaults': {
                'data': data,
            },
        }
        if today:
            kwargs['created__date'] = now().date()
        cls.objects.get_or_create(**kwargs)

    def __str__(self):
        return str(self.id)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
