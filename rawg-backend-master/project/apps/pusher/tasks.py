from datetime import timedelta

from django.utils.timezone import now

from apps.celery import app as celery
from apps.pusher import models


@celery.task(time_limit=10, ignore_result=True)
def clear():
    models.Notification.objects.filter(confirmed=True, confirmation_date__lt=(now() - timedelta(days=10))).delete()
