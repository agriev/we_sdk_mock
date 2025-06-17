import json

from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.test import Client, TestCase, TransactionTestCase
from rest_framework.authtoken.models import Token

from apps.feed.models import Feed
from apps.games.models import Collection, Game
from apps.games.signals import collection_post_save
from apps.users.models import UserGame


class FeedBaseTestCase(object):
    fixtures = ['reviews_reactions', 'feed_reactions']

    # noinspection PyPep8Naming
    def setUp(self):
        self.user = get_user_model().objects.get_or_create(username='curt', email='curt@test.io')[0]
        self.user_1 = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')[0]
        self.user_2 = get_user_model().objects.get_or_create(username='warren', email='warren@test.io')[0]
        self.user_3 = get_user_model().objects.get_or_create(username='kailey', email='kailey@test.io')[0]
        self.user_4 = get_user_model().objects.get_or_create(username='joseph', email='joseph@test.io')[0]

        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        self.token_2 = Token.objects.get_or_create(user=self.user_2)[0].key
        self.token_3 = Token.objects.get_or_create(user=self.user_3)[0].key
        self.token_4 = Token.objects.get_or_create(user=self.user_4)[0].key

        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_2)
        self.client_auth_2 = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_3)
        self.client_auth_3 = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_4)
        self.client_auth_4 = Client(**kwargs)

        self.game = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        self.game_1 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0]
        self.game_2 = Game.objects.get_or_create(name='Grand Theft Auto IV')[0]
        self.game_3 = Game.objects.get_or_create(name='Grand Theft Auto V')[0]

        post_save.disconnect(collection_post_save, Collection)
        self.collection = Collection.objects.get_or_create(name='My first collection', creator=self.user_3)[0]
        self.collection_1 = Collection.objects.get_or_create(name='My second collection', creator=self.user_2)[0]
        self.collection_2 = Collection.objects.get_or_create(name='My third collection', creator=self.user_1)[0]
        self.collection_3 = Collection.objects.get_or_create(name='My fourth collection', creator=self.user)[0]
        self.collection_4 = Collection.objects.get_or_create(name='My fifth collection', creator=self.user)[0]
        post_save.connect(collection_post_save, Collection)

        self.explore = '/api/feed/explore'
        self.explore_args = self.explore, {'ordering': '-created'}
        self.notifications = '/api/feed/notifications'
        self.counters = '/api/feed/counters'


class FeedTestCase(FeedBaseTestCase, TestCase):
    def test_feed_counters(self):
        self.assertEqual(self.client_auth.get(self.counters).status_code, 200)
        self.assertEqual(self.client.get(self.counters).status_code, 401)

    def test_feed_notifications(self):
        self.assertEqual(self.client_auth.get(self.notifications).status_code, 200)
        self.assertEqual(self.client.get(self.notifications).status_code, 401)

    def test_feed_explore(self):
        self.assertEqual(self.client_auth.get(*self.explore_args).status_code, 200)
        self.assertEqual(self.client.get(*self.explore_args).status_code, 401)

    def test_feed_feed(self):
        self.assertEqual(self.client_auth.get('/api/feed/1').status_code, 404)
        self.assertEqual(self.client.get('/api/feed/1').status_code, 401)

    def test_feed_reactions(self):
        response = self.client_auth.get('/api/feed/reactions')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 20)


class FeedTransactionTestCase(FeedBaseTestCase, TransactionTestCase):
    def test_feed_counters_reset(self):
        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})
        self.client_auth_3.post('/api/users/current/following/users', {'follow': self.user.id})

        counters = self.client_auth.get(self.counters).json()
        self.assertEqual(counters['notifications'], 2)

        self.assertEqual(self.client_auth.get(self.notifications).json()['count'], 2)

        counters = self.client_auth.get(self.counters).json()
        self.assertEqual(counters['notifications'], 2)

        notifications = self.client_auth.post(self.counters, {'notifications': True}).json()['notifications']
        self.assertEqual(notifications, 0)

        counters = self.client_auth.get(self.counters).json()
        self.assertEqual(counters['notifications'], 0)

    def test_feed_counters_reset_json(self):
        self.client_auth.post('/api/users/current/following/users', {'follow': self.user_1.id})
        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})
        self.client_auth_2.post('/api/users/current/following/users', {'follow': self.user.id})

        counters = self.client_auth.get(self.counters).json()
        self.assertEqual(counters['notifications'], 2)

        reset = self.client_auth.post(
            self.counters, json.dumps({'notifications': True}),
            content_type='application/json',
        ).json()
        self.assertEqual(reset['notifications'], 0)
        self.assertEqual(reset['total'], 0)

    def test_feed_feed_games(self):
        games = [self.game.id, self.game_1.id, self.game_2.id, self.game_3.id]
        self.client_auth.post(
            '/api/users/current/games',
            json.dumps({'games': games, 'batch_statuses': {game_id: UserGame.STATUS_BEATEN for game_id in games}}),
            content_type='application/json',
        )

        action = self.client_auth.get(*self.explore_args).json()['results'][0]
        self.assertEqual(action['games']['count'], 4)
        self.assertEqual(len(action['games']['results']), Feed.LIMIT_ELEMENTS_LIST / 2)

        actions = self.client_auth.get('/api/feed/{}/games?page_size=2'.format(action['id'])).json()
        self.assertEqual(actions['count'], 4)
        self.assertIsNotNone(actions['next'])


class UserReactionTransactionTestCase(FeedBaseTestCase, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.client_auth.post('/api/users/current/following/users', {'follow': self.user_1.id})
        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user_2.id})
        self.feed_id = self.client_auth.get(*self.explore_args).json()['results'][0]['id']
        self.reactions = self.client_auth.get('/api/feed/reactions').json()['results']

    def test_post(self):
        action_url = '/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[0]['id'])
        self.assertEqual(self.client.post(action_url).status_code, 401)
        self.assertEqual(self.client_auth.post(action_url).status_code, 201)

        action_url = '/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id'])
        self.assertEqual(self.client_auth.post(action_url).status_code, 201)

        action_url = '/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id'])
        self.assertEqual(self.client_auth.post(action_url).status_code, 400)

    def test_delete(self):
        self.client_auth.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[0]['id']))

        action_url = '/api/feed/{}/reactions/{}/users/{}'.format(self.feed_id, self.reactions[0]['id'], self.user.id)
        self.assertEqual(self.client.delete(action_url).status_code, 401)
        self.assertEqual(self.client_auth_1.delete(action_url).status_code, 403)
        self.assertEqual(self.client_auth.delete(action_url).status_code, 204)
        self.assertEqual(self.client_auth.delete(action_url).status_code, 404)

        action_url = '/api/feed/{}/reactions/{}/users/{}'.format(self.feed_id, self.reactions[1]['id'], self.user.id)
        self.assertEqual(self.client_auth.delete(action_url).status_code, 404)

    def test_list(self):
        self.client_auth.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id']))
        self.client_auth_1.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id']))
        self.client_auth_2.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id']))

        action_url = '/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id'])
        self.assertEqual(self.client.get(action_url).status_code, 401)
        response = self.client_auth.get(action_url)
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 3)
        self.assertEqual(response_data['results'][0]['id'], self.user.id)

    def test_feed_field(self):
        self.client_auth.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[1]['id']))
        self.client_auth.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[2]['id']))
        self.client_auth_1.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[2]['id']))
        self.client_auth_2.post('/api/feed/{}/reactions/{}/users'.format(self.feed_id, self.reactions[3]['id']))

        feed = self.client_auth.get(*self.explore_args).json()['results'][0]
        self.assertEqual(len(feed['reactions']), 3)
        self.assertEqual(feed['reactions'][0]['id'], self.reactions[1]['id'])
        self.assertEqual(feed['reactions'][0]['count'], 1)
        self.assertTrue(feed['reactions'][0]['selected'])
        self.assertEqual(feed['reactions'][1]['id'], self.reactions[2]['id'])
        self.assertEqual(feed['reactions'][1]['count'], 2)
        self.assertTrue(feed['reactions'][1]['selected'])
        self.assertEqual(feed['reactions'][2]['id'], self.reactions[3]['id'])
        self.assertEqual(feed['reactions'][2]['count'], 1)
        self.assertFalse(feed['reactions'][2]['selected'])
