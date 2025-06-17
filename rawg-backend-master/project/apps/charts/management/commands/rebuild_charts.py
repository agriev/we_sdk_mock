from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils.timezone import now

from apps.charts import models
from apps.users.models import UserGame
from apps.utils.dates import monday


class Command(BaseCommand):
    help = 'Rebuild the charts'
    types = {
        'full': {'model': models.GameFull, 'prev': False},
        'year': {'model': models.GameYear, 'prev': False},
        'toplay': {'model': models.GameToPlay, 'prev': False},
        'upcoming': {'model': models.GameUpcoming, 'prev': False},
        'genre': {'model': models.GameGenre, 'prev': True},
        'released': {'model': models.GameReleased, 'prev': True},
        'person': {'model': models.GameCreditPerson, 'prev': True},
    }

    def add_arguments(self, parser):
        parser.add_argument(
            '-c', '--chart', action='store', dest='chart', default='all', type=str,
            choices=['all'] + list(self.types.keys())
        )

    def handle(self, *args, **options):
        chart = options['chart']
        for key, value in self.types.items():
            if chart in ('all', key):
                value['model'].objects.all().delete()
        last = False
        delta = timedelta(days=7)
        try:
            start = monday(UserGame.objects.values_list('created', flat=True).earliest('created'))
        except UserGame.DoesNotExist:
            return
        while start <= now():
            last = start + delta > now()
            prev_last = start + delta + delta > now()
            for key, value in self.types.items():
                if chart in ('all', key):
                    records = value['model'].calculate_and_write(
                        start, True, last or prev_last if value['prev'] else last
                    )
                    self.stdout.write(self.style.SUCCESS('{}: {} records'.format(key, records)))
            self.stdout.write(self.style.SUCCESS('{}'.format(start)))
            start += delta
        self.stdout.write(self.style.SUCCESS('OK'))
