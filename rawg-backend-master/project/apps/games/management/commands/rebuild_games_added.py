from django.core.management.base import BaseCommand
from django.db.models import Count
from tqdm import tqdm

from apps.games.tasks import update_game
from apps.users.models import UserGame


class Command(BaseCommand):
    help = 'Rebuild the games fields'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)

    def handle(self, *args, **options):
        if options['game_id']:
            qs = [options['game_id']]
        else:
            qs = UserGame.objects.visible().values('game_id').annotate(c=Count('id')).values_list('game_id', flat=True)
        for game_id in tqdm(qs):
            update_game(game_id, True)
        self.stdout.write(self.style.SUCCESS('OK'))
