from apps.recommendations.management.commands.similar_neighbors import Command as BaseCommand
from apps.utils.daemon import DaemonMixin


class Command(DaemonMixin, BaseCommand):
    pass
