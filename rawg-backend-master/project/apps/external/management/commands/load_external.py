import multiprocessing

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **options):
        params = ['reddit', 'twitch', 'youtube', 'imgur', 'metacritic']
        if settings.ENVIRONMENT == 'TESTS':
            for param in params:
                call_command(param)
        else:
            pool = multiprocessing.Pool(len(params))
            pool.map(call_command, params)
            pool.close()
        self.stdout.write(self.style.SUCCESS('OK'))
