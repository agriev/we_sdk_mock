import csv
import logging
from argparse import FileType
from typing import Dict, TextIO

from django.core.management.base import BaseCommand
from django.db.models import Case, When, fields

from apps.games.models import Game

logger = logging.getLogger('commands')


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('--file', required=True, type=FileType('r'))

    def handle(self, *args, **options):
        try:
            ids_plays_map = self.get_ids_plays_map(options['file'])
        except (ValueError, IndexError) as err:
            logger.error(f'Wrong csv format (error: {err})')
            raise err

        whens = [When(id=game_id, then=plays) for game_id, plays in ids_plays_map.items()]
        Game.objects.filter(id__in=ids_plays_map.keys()).update(plays=Case(*whens, output_field=fields.IntegerField()))

    def get_ids_plays_map(self, file: TextIO) -> Dict[int, int]:
        reader = csv.reader(file, delimiter=',')
        return dict(
            map(
                lambda x: map(int, x),
                reader
            )
        )
