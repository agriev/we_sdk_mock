from django.contrib.auth import get_user_model
from django.test import Client, TransactionTestCase
from rest_framework.authtoken.models import Token

from apps.games.models import Game
from apps.recommendations.models import UserRecommendation


class ViewsTransactionTestCase(TransactionTestCase):
    def setUp(self):
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.user = get_user_model().objects.get_or_create(username='black', email='lips@test.io')[0]
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.client = Client(kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_recommendations_games_dislike(self):
        game = Game.objects.create(name="Satan's Graffiti or God's Art?")
        UserRecommendation.objects.create(
            user=self.user, game=game, sources=[UserRecommendation.SOURCES_COLLABORATIVE], position=1
        )

        # not auth user
        response = self.client.post('/api/recommendations/games/dislike', {'game': game.id})
        self.assertEquals(response.status_code, 401)
        self.assertTrue(UserRecommendation.objects.visible().count())

        # success
        response = self.client_auth.post('/api/recommendations/games/dislike', {'game': game.id})
        self.assertEquals(response.status_code, 201)
        self.assertFalse(UserRecommendation.objects.visible().count())

        # the game is already disliked
        response = self.client_auth.post('/api/recommendations/games/dislike', {'game': game.id})
        self.assertEquals(response.status_code, 400)
        self.assertFalse(UserRecommendation.objects.visible().count())
