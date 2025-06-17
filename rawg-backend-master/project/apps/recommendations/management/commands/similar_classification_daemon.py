from apps.recommendations.management.commands.similar_classification import Command as BaseCommand
from apps.utils.daemon import DaemonMixin


class Command(DaemonMixin, BaseCommand):
    def handle(self, *args, **options):
        options['queue'] = True
        super().handle(*args, **options)
