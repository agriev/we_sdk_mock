from django.core.management.base import BaseCommand

from apps.utils.cache import warm_cache


class Command(BaseCommand):
    help = 'Warm cache'

    def handle(self, *args, **options):
        warm_cache()
