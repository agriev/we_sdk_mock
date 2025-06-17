from django.conf import settings
from django.test import TransactionTestCase

from apps.games.models import Game, GameStore, Store
from apps.stories.models import Clip, Video
from apps.tests.api.games import GamesBaseTestCase


class GamesOpenAPITransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.free_api_key = '123abc'
        self.business_api_key = '789xyz'
        self.user.api_key = self.free_api_key
        self.user.save(update_fields=['api_key'])
        self.user_1.api_key = self.business_api_key
        self.user_1.api_group = settings.API_GROUP_BUSINESS
        self.user_1.save(update_fields=['api_key', 'api_group'])

    def test_field_store_url(self):
        game = Game.objects.get(slug='grand-theft-auto-vice-city')
        store = Store.objects.create(name='Steam')
        game_store = GameStore.objects.create(store=store, game=game)
        game_store.url = 'https://ag.ru/'
        game_store.save(update_fields=['url', 'url_en'])

        response_data = self.client.get('/api/games', {'key': self.user.api_key, 'ids': game.id}).json()
        self.assertNotIn('url', response_data['results'][0]['stores'][0])

        response_data = self.client.get(
            '/api/games/{}'.format(game.slug),
            {'key': self.free_api_key, 'ids': game.id}
        ).json()
        self.assertEqual(response_data['stores'][0]['url'], '')

        response_data = self.client.get(
            '/api/games/{}'.format(game.slug),
            {'key': self.business_api_key, 'ids': game.id}
        ).json()
        self.assertEqual(response_data['stores'][0]['url'], game_store.url)

    def test_field_clip(self):
        game = Game.objects.get(slug='grand-theft-auto-vice-city')
        Clip.objects.create(
            game=game,
            video=Video.objects.create(youtube_id='123', game=game)
        )

        response_data = self.client.get(
            '/api/games',
            {'key': self.free_api_key, 'ids': game.id}
        ).json()
        self.assertIsNone(response_data['results'][0]['clip'])

        response_data = self.client.get(
            '/api/games',
            {'key': self.business_api_key, 'ids': game.id}
        ).json()
        self.assertIsNotNone(response_data['results'][0]['clip'])

        response_data = self.client.get(
            '/api/games/{}'.format(game.slug),
            {'key': self.free_api_key, 'ids': game.id}
        ).json()
        self.assertIsNone(response_data['clip'])

        response_data = self.client.get(
            '/api/games/{}'.format(game.slug),
            {'key': self.business_api_key, 'ids': game.id}
        ).json()
        self.assertIsNotNone(response_data['clip'])

    def test_game_lists(self):
        game = Game.objects.get(slug='grand-theft-auto-vice-city')

        self.assertEqual(self.client.get(
            '/api/games/{}/twitch'.format(game.slug), {'key': self.free_api_key}
        ).status_code, 401)
        self.assertEqual(self.client.get(
            '/api/games/{}/youtube'.format(game.slug), {'key': self.free_api_key}
        ).status_code, 401)
        self.assertEqual(self.client.get(
            '/api/games/{}/suggested'.format(game.slug), {'key': self.free_api_key}
        ).status_code, 401)

        self.assertEqual(self.client.get(
            '/api/games/{}/twitch'.format(game.slug), {'key': self.business_api_key}
        ).status_code, 200)
        self.assertEqual(self.client.get(
            '/api/games/{}/youtube'.format(game.slug), {'key': self.business_api_key}
        ).status_code, 200)
        self.assertEqual(self.client.get(
            '/api/games/{}/suggested'.format(game.slug), {'key': self.business_api_key}
        ).status_code, 200)
