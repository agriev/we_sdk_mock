from django.core.management.base import BaseCommand

from apps.external.metacritic import MetacriticParser
from apps.games.models import Game, GamePlatformMetacritic, Platform
from apps.utils.exceptions import capture_exception


class MetacriticException(Exception):
    def __init__(self, message):
        self.message = message


class Command(BaseCommand):
    help = 'Metacritic metascores update'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)

    def handle(self, *args, **options):
        try:
            self.run(options)
        except Exception as e:
            capture_exception(e)
            self.stdout.write(self.style.ERROR('Metacritic: {}'.format(e)))
        self.stdout.write(self.style.SUCCESS('Metacritic: OK'))

    def run(self, options):
        qs = Game.objects.exclude(metacritic_url='').only('id', 'metacritic_url')
        game_id = options.get('game_id')
        if game_id:
            qs = qs.filter(id=game_id)
        total = qs.count()
        for i, game in enumerate(qs):
            try:
                self.update_game_metascore(game)
                self.stdout.write(self.style.SUCCESS('Metacritic: {} of {}'.format(i, total)))
            except MetacriticException as e:
                self.stdout.write(self.style.WARNING('Metacritic: {}'.format(e.message)))
                capture_exception(e)

    def update_game_metascore(self, game):
        """Update game metascore value and metacritic platforms"""
        parser = MetacriticParser()
        content_soup = parser.get(game.metacritic_url)
        if not content_soup:
            return None
        average_metascore = 0
        items = {}
        for platform_name, metascore, url in parser.get_metascore(content_soup, game.metacritic_url):
            if not metascore:
                continue
            try:
                platform = Platform.objects.get(name=platform_name)
                metacritic_game_platform, _ = GamePlatformMetacritic.objects.get_or_create(
                    game=game,
                    platform=platform,
                )
                metacritic_game_platform.metascore = metascore
                metacritic_game_platform.url = url
                metacritic_game_platform.save(update_fields=['metascore', 'url'])
                items[metacritic_game_platform.platform_id] = metascore
            except Platform.DoesNotExist:
                raise MetacriticException('Platform with title {} doesn\'t exist'.format(platform_name))
        if items:
            average_metascore = round(sum(items.values()) / len(items))
        GamePlatformMetacritic.objects.filter(game=game).exclude(platform_id__in=items.keys()).delete()
        Game.objects.filter(id=game.id).update(metacritic=average_metascore)
