from django.core.management.base import BaseCommand

from apps.games.models import Developer, Genre, Platform, Publisher, Store, Tag
from apps.games.tasks import update_game_item


class Command(BaseCommand):
    help = 'Rebuild the games items'

    def handle(self, *args, **options):
        for model in (Genre, Tag, Developer, Publisher, Store, Platform):
            update_game_item(model._meta.app_label, model._meta.model_name, all_ids=True)
            self.stdout.write(self.style.SUCCESS(f'OK - {model}'))
        self.stdout.write(self.style.SUCCESS('OK'))
