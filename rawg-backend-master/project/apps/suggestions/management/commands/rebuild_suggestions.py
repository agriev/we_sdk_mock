from django.core.management.base import BaseCommand

from apps.suggestions.models import Suggestion


class Command(BaseCommand):
    help = 'Rebuild suggestions'

    def handle(self, *args, **options):
        for suggestion in Suggestion.objects.all():
            suggestion.set_statistics()

        self.stdout.write(self.style.SUCCESS('OK'))
