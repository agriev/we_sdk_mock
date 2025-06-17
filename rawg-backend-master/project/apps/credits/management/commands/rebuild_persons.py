from celery.exceptions import Retry
from django.core.management.base import BaseCommand

from apps.charts.models import GameCreditPerson
from apps.credits import tasks
from apps.credits.models import Person


class Command(BaseCommand):
    help = 'Rebuild Persons'

    def handle(self, *args, **options):
        for pk in Person.objects.order_by('-games_added').values_list('id', flat=True):
            GameCreditPerson.rebuild(person_id=pk)
            try:
                tasks.update_person(pk)
            except Retry:
                continue
        self.stdout.write(self.style.SUCCESS('OK'))
