from bulk_update.helper import bulk_update
from django.core.management.base import BaseCommand

from apps.games.models import Game
from apps.reviews.models import Review


class Command(BaseCommand):
    help = 'Rebuild weighted rating'

    def handle(self, *args, **options):
        # https://3.basecamp.com/3964781/buckets/10001785/todos/1449493820
        # (v / (v+m) * R) + (m / (v+m) * С)
        # v = game.ratings_count
        # m = threshold (=5)
        # R - game.rating
        # C = avg(game.rating) where game.rating > 0 and game.rating < 5.00
        # Transform [5,4,3,1] ratings to [4,3,2,1]

        rating_map = {1: 1, 3: 2, 4: 3, 5: 4}

        all_reviews = Review.objects.visible()

        avg_set = all_reviews.values_list('rating', flat=True)
        avg = sum([rating_map[i] for i in avg_set]) / len(avg_set)

        games = []
        for i, game in enumerate(
            Game.objects.only('id').iterator()
        ):
            game_reviews = all_reviews.filter(game_id=game.id).values_list('rating', flat=True)
            game_ratings_count = len(game_reviews)
            if game_ratings_count == 0 or game_ratings_count < Game.RATING_TRESHOLD:
                continue
            game_rating = sum([rating_map[i] for i in game_reviews]) / len(game_reviews)

            game.weighted_rating = (
                (float(game_ratings_count / (game_ratings_count + Game.RATING_TRESHOLD)) * float(game_rating))
                + (float(Game.RATING_TRESHOLD / (game_ratings_count + Game.RATING_TRESHOLD)) * float(avg))
            )
            games.append(game)
            if i and i % 2000 == 0:
                bulk_update(games, update_fields=['weighted_rating'])
                games = []
        if games:
            bulk_update(games, update_fields=['weighted_rating'])

        self.stdout.write(self.style.SUCCESS('OK'))
