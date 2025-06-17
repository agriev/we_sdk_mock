from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils.timezone import now

from apps.celery import app as celery


@celery.task(time_limit=300, ignore_result=True)
def check_payments():
    for user in get_user_model().objects.filter(api_group=settings.API_GROUP_BUSINESS):
        if not user.payments.exists():
            continue
        if not user.payments.filter(until_date__gt=now()).exists():
            user.api_group = settings.API_GROUP_FREE
            user.save()
