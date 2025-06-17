from django.core.management.base import BaseCommand
from django.utils.timezone import now

from apps.charts import models
from apps.utils.dates import monday


class Command(BaseCommand):
    help = 'Update the charts'

    def handle(self, *args, **options):
        week = monday(now())
        models.GameFull.calculate_and_write(week, save_game=True)
        models.GameYear.calculate_and_write(week, save_game=True)
        models.GameToPlay.calculate_and_write(week, save_game=True)
        models.GameUpcoming.calculate_and_write(week, save_game=True)
        models.GameGenre.calculate_and_write(week, save_game=True)
        models.GameReleased.calculate_and_write(week, save_game=True)
        models.GameCreditPerson.calculate_and_write(week, save_game=True)
        self.stdout.write(self.style.SUCCESS('OK'))
