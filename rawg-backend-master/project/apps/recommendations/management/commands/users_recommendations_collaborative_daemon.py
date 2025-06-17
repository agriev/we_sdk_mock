from django.conf import settings

from apps.recommendations.management.commands.users_recommendations_collaborative import Command as BaseCommand
from apps.utils.daemon import DaemonMixin


class Command(DaemonMixin, BaseCommand):
    pause = 3 if settings.DEBUG else 10

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.disable_tqdm = True
        options['queue'] = True
        options['prefetch_top'] = True
        super().handle(*args, **options)
