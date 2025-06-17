from bulk_update.helper import bulk_update
from django.core.management.base import BaseCommand

from api.games import serializers
from api.stories.serializers import ClipShortSerializer
from apps.games.models import Game
from apps.games.seo import get_seo_fields
from apps.stories.models import Clip


class Command(BaseCommand):
    help = 'Rebuild the games json fields'

    def add_arguments(self, parser):
        parser.add_argument('-g', '--game_id', action='store', dest='game_id', default=0, type=int)

    def handle(self, *args, **options):
        json_fields = [
            'platforms_json', 'parent_platforms_json', 'stores_json', 'developers_json',
            'genres_json', 'tags_json', 'publishers_json', 'screenshots_json',
            'esrb_rating_json', 'clip_json', 'game_seo_fields_json',
        ]
        games_qs = Game.objects.only(
            'id', 'slug', 'name', 'promo', 'released', 'tba', 'metacritic',
            'image', 'image_background', 'rating_top', 'ratings', 'added', 'esrb_rating'
        )
        if options['game_id']:
            games_qs = games_qs.filter(id=options['game_id'])
        total = games_qs.count()
        self.stdout.write(self.style.SUCCESS('Populating games data'))
        counter = 0
        games_to_update = []
        for counter, game in enumerate(games_qs.iterator()):
            game.platforms_json = serializers.GamePlatformSerializer(game.gameplatform_set, many=True).data
            platform_parents = {p.parent_id: p.parent for p in game.platforms.all() if p.parent}
            game.parent_platforms_json = serializers.PlatformParentSerializer(
                sorted(list(platform_parents.values()), key=lambda x: x.order), many=True
            ).data
            game.stores_json = serializers.GameStoreSerializer(game.gamestore_set, many=True).data
            game.developers_json = serializers.DeveloperSerializer(game.developers.visible(), many=True).data
            game.genres_json = serializers.GenreAllLanguagesSerializer(game.genres.visible(), many=True).data
            game.tags_json = serializers.TagSerializer(game.tags.visible(), many=True).data
            game.publishers_json = serializers.PublisherSerializer(game.publishers.visible(), many=True).data

            game_screenshots_list = serializers.ScreenShotShortSerializer(
                game.screenshots.visible()[0:6], many=True
            ).data
            if game.background_image:
                game_background_image = serializers.GameShortSerializer(game).data.get('background_image')
                game_screenshots_list.insert(
                    0,
                    {'id': -1, 'image': game_background_image}
                )
                for screenshot in game_screenshots_list:
                    if screenshot['image'] == game_background_image:
                        del screenshot
            game.screenshots_json = game_screenshots_list

            game.esrb_rating_json = None
            if game.esrb_rating:
                game.esrb_rating_json = serializers.ESRBRatingAllLanguagesSerializer(game.esrb_rating).data

            game.clip_json = None
            clip = Clip.objects.filter(game_id=game.id).order_by('-id').first()
            if clip:
                game.clip_json = ClipShortSerializer(clip).data

            game.game_seo_fields_json = get_seo_fields(game)

            games_to_update.append(game)
            if counter and counter % 2000 == 0:
                bulk_update(games_to_update, update_fields=json_fields)
                self.stdout.write(self.style.SUCCESS(f'Populated {counter} of {total}'))
                games_to_update = []
        if games_to_update:
            bulk_update(games_to_update, update_fields=json_fields)
        self.stdout.write(self.style.SUCCESS(f'Populated {counter} of {total}'))
        self.stdout.write(self.style.SUCCESS('OK'))
