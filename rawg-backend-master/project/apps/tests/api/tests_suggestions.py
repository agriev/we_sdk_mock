import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client, TestCase
from haystack import connections as haystack_connections
from rest_framework.authtoken.models import Token

from apps.games.models import Game, GamePlatform, Platform
from apps.suggestions.models import Suggestion, SuggestionFilters
from apps.utils.tests import haystack_test_config


class SuggestionsBaseTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores',
        'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self):
        self.user, _ = get_user_model().objects.get_or_create(
            username='curt', email='curt@test.io',
        )
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)

        self.game = Game.objects.get(name='Grand Theft Auto 2')

        platform = Platform.objects.get(pk=18)
        platform.image = os.path.join(
            settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg',
        )
        platform.save()

        GamePlatform.objects.create(
            game=self.game,
            platform=Platform.objects.get(slug='playstation4'),
        )

        self.suggestion = Suggestion.objects.create(
            name='games suggestions',
            description='suggestions description',
        )
        self.suggestion_filters = SuggestionFilters.objects.create(
            suggestion=self.suggestion,
            platform=Platform.objects.get(slug='playstation4')
        )

        self.suggestion.set_statistics()

        super().setUp()

    def test_suggestions_all(self):
        self.suggestion.set_statistics()
        url = '/api/suggestions'
        self.assertEqual(self.client.get(url).status_code, 200)

        with self.assertNumQueries(7):
            response = self.client_auth.get(url).json()['results'][0]

            self.assertIsNotNone(response['image'])
            self.assertGreater(response['games_count'], 0)
            self.assertGreater(len(response['games']), 0)

        with self.assertNumQueries(3):
            response = self.client.get(url).json()['results'][0]

            self.assertIsNotNone(response['image'])
            self.assertGreater(response['games_count'], 0)
            self.assertGreater(len(response['games']), 0)

    def test_suggestions_suggestion(self):
        url = f'/api/suggestions/{self.suggestion.slug}'
        self.assertEqual(
            self.client.get(url).status_code,
            200,
        )
        with self.assertNumQueries(4):
            response = self.client_auth.get(url).json()

            self.assertIsNotNone(response['image'])

        with self.assertNumQueries(2):
            response = self.client.get(url).json()

            self.assertIsNotNone(response['image'])

    def test_suggestions_games(self):
        url = f'/api/suggestions/{self.suggestion.slug}/games'
        self.assertEqual(
            self.client.get(url).status_code,
            200,
        )

        with self.assertNumQueries(10):
            response = self.client_auth.get(url).json()

            self.assertGreater(len(response['results']), 0)

        with self.assertNumQueries(5):
            response = self.client.get(url).json()

            self.assertGreater(len(response['results']), 0)

    def test_suggestions_games_search(self):
        with self.settings(**haystack_test_config(self.id())):
            haystack_connections.reload('default')
            call_command('update_index', 'games.game', remove=True, verbosity=0)

            url = f'/api/suggestions/{self.suggestion.slug}/games?search=Grand'
            self.assertEqual(
                self.client_auth.get(url).status_code,
                200,
            )

            with self.assertNumQueries(11):
                response = self.client_auth.get(url).json()
                self.assertGreater(len(response['results']), 0)

            with self.assertNumQueries(6):
                response = self.client.get(url).json()
                self.assertGreater(len(response['results']), 0)
