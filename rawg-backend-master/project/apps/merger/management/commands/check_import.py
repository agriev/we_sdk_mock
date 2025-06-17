from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand
from django.db.models import Q
from django.utils.timezone import now

from apps.merger import tasks
from apps.merger.tasks import sync_user


class Command(BaseCommand):
    def handle(self, *args, **options):
        for param in tasks.STORES:
            field = '{}__lt'.format(param.field_date)
            kwargs1 = {param.field_status: 'unavailable', field: now() - timedelta(hours=1)}
            kwargs2 = {param.field_status: 'process', field: now() - timedelta(hours=3)}
            for user in get_user_model().objects.filter(Q(**kwargs1) | Q(**kwargs2)):
                sync_user(user.id, is_sync=False)
        self.stdout.write(self.style.SUCCESS('Checking of import is finished!'))
