from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client, TestCase
from haystack import connections as haystack_connections
from rest_framework.authtoken.models import Token

from apps.common.cache import CommonContentType
from apps.games.models import Game, Genre
from apps.users.models import UserFollowElement, UserGame
from apps.utils.tests import cache_test_config, haystack_test_config


class ElasticSearchBaseTestCase(TestCase):
    fixtures = [
        'common_lists', 'games_platforms_parents', 'games_platforms',
        'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
        'games_esrbratings',
    ]

    def setUp(self):
        super().setUp()
        self.user, _ = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest', 'HTTP_X_API_CLIENT': 'website'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        self.game = Game.objects.get(slug='grand-theft-auto-v')
        self.game.promo = 'e3'
        self.game.save(update_fields=['promo'])
        self.temp_settings = self.settings(**haystack_test_config(self.id()))
        self.temp_settings.enable()
        haystack_connections.reload('default')
        call_command('update_index', 'games.game', remove=True, verbosity=0)

    def tearDown(self):
        self.temp_settings.disable()
        super().tearDown()


class ElasticSearchGamesTestCase(ElasticSearchBaseTestCase):
    def test_search_by_name(self):
        # This for game title
        response = self.client.get('/api/games', {'search': 'grand'})
        self.assertGreater(len(response.json()['results']), 0)

        response = self.client.get('/api/games', {'search': 'grand', 'ordering': '-released'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-the-trilogy',
        )

        # This for alternative names
        response = self.client.get('/api/games', {'search': 'my favourite game'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )

        response = self.client.get('/api/games', {'search': 'gta 5', 'ordering': 'name'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )

    def test_search_by_dates(self):
        response = self.client.get('/api/games', {'dates': '2013-01-01,2013-12-31'})
        self.assertGreater(len(response.json()['results']), 0)

    def test_search_by_promo(self):
        response = self.client.get('/api/games', {'promo': 'gamescom'})
        self.assertEqual(len(response.json()['results']), 0)

        response = self.client.get('/api/games', {'promo': 'e3'})
        self.assertEqual(len(response.json()['results']), 1)

    def test_search_user_games(self):
        for i, game in enumerate(Game.objects.all()):
            UserGame.objects.create(game=game, user=self.user)

        beaten = UserGame.objects.get(game__slug='grand-theft-auto-v')
        beaten.status = 'beaten'
        beaten.save()

        toplay = UserGame.objects.get(game__slug='grand-theft-auto-the-trilogy')
        toplay.status = 'toplay'
        toplay.save()

        response = self.client.get(f'/api/users/{self.user.slug}/games', {'statuses': 'beaten', 'search': 'gta 5'})
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )

        response = self.client.get('/api/users/{}/games'.format(self.user.slug), {'statuses': 'toplay'})
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-the-trilogy',
        )

    def test_search_combined(self):
        response = self.client.get('/api/games', {'search': 'gta 5 5/&?', 'genres': 4})
        self.assertGreater(len(response.json()['results']), 0)

        response = self.client.get('/api/games', {'search': 'gta 5 5', 'genres': 4, 'dates': '2013-01-01,2013-12-31'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )

        response = self.client.get('/api/games', {'search': 'my favourite game', 'genres': 12})
        self.assertEqual(len(response.json()['results']), 0)

    def test_search_ordering(self):
        response = self.client.get('/api/games', {'search': 'Grand', 'ordering': '-rating'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )
        response = self.client.get('/api/games', {'search': 'Grand', 'ordering': 'rating'})
        self.assertGreater(len(response.json()['results']), 0)
        self.assertNotEqual(
            response.json()['results'][0]['slug'],
            'grand-theft-auto-v',
        )

    def test_unsanitized_input(self):
        response = self.client.get('/api/games', {'search': '&& grand\\?'})
        self.assertGreater(len(response.json()['results']), 0)


class ElasticSearchAllTestCase(ElasticSearchBaseTestCase):
    def setUp(self):
        super().setUp()
        call_command('update_index', 'games.genre', remove=True, verbosity=0)

    def test_search_all(self):
        with self.assertNumQueries(0):
            response = self.client.get('/api/search', {'search': 'empty'})
            self.assertEqual(len(response.json()['results']), 0)

        with self.assertNumQueries(1), self.settings(**cache_test_config(self.id())):
            response = self.client.get('/api/search', {'search': 'grand theft auto'})
            results = response.json()['results']
            self.assertGreater(len(results), 0)
            self.assertEqual(results[0]['instance'], 'game')

        with self.assertNumQueries(0):
            response = self.client.get('/api/search', {'search': 'shooter'})
            results = response.json()['results']
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['instance'], 'genre')

        UserFollowElement.objects.create(
            user=self.user,
            object_id=Genre.objects.get(slug='shooter').id,
            content_type=CommonContentType().get(Genre),
        )
        with self.assertNumQueries(4):
            response = self.client_auth.get('/api/search', {'search': 'shooter'})
            results = response.json()['results']
            self.assertEqual(len(results), 1)
            self.assertEqual(results[0]['instance'], 'genre')
            self.assertTrue(results[0]['following'])
