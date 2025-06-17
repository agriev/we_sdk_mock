from django.test import TransactionTestCase

from apps.games.models import Game
from apps.reviews.models import Review


class ReviewTestCase(TransactionTestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self):
        super().setUp()

    def test_empty_user_review(self):
        game = Game.objects.first()
        Review.objects.create(
            text='Good!',
            game=game,
            rating=5,
        )
        self.assertTrue(Review.objects.filter(user=None))
