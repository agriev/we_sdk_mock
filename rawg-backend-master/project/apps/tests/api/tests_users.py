import abc
import json
import os
import uuid
from unittest.mock import patch
from rest_framework import status
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.middleware import SessionMiddleware
from django.test import Client, RequestFactory, TestCase, TransactionTestCase
from django.test.client import BOUNDARY, MULTIPART_CONTENT, encode_multipart
from django.contrib.auth.models import AnonymousUser
from django.urls import reverse
from django.utils.timezone import now
from math import ceil
from redis import Redis
from rest_framework.authtoken.models import Token

from apps.credits.models import GamePerson, Person, Position
from apps.games.models import (
    Collection, CollectionGame, Developer, Game, GamePlatform, GameStore, Genre, Platform, Publisher, Store, Tag,
)
from apps.merger.models import Import, ImportLog, Network
from apps.merger.profiles.steam import VISIBLE_STATE_PUBLIC
from apps.merger.tasks import STORES
from apps.reviews.models import Review
from apps.stat.models import APIUserCounter
from apps.users.models import UserGame, PlayerBase, AuthenticatedPlayer, AnonymousPlayer
from apps.utils.tests import APITestCase, APITransactionTestCase


class UsersBaseTestCase(metaclass=abc.ABCMeta):
    def setUp(self):
        super().setUp()
        self.user = get_user_model().objects.create_user(username='curt', email='curt@test.io', password='test_pass_1')
        self.user_1 = get_user_model().objects.create_user(username='nick', email='nick@test.io')
        self.user_2 = get_user_model().objects.create_user(username='warren', email='warren@test.io')
        self.user_3 = get_user_model().objects.create_user(username='kailey', email='kailey@test.io')
        self.user_num = get_user_model().objects.create_user(username='123', email='123@test.io')
        self.collection_1, _ = Collection.objects.get_or_create(name='Lovely Creatures', creator=self.user)
        self.collection_2, _ = Collection.objects.get_or_create(name='B-Sides & Rarities')
        for i in range(0, 10):
            game, _ = Game.objects.get_or_create(name='Game {}'.format(i))
            CollectionGame.objects.get_or_create(game=game, collection=self.collection_1)
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        self.token_2 = Token.objects.get_or_create(user=self.user_2)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest', 'HTTP_X_API_CLIENT': 'website'}
        self.client = self.client_class(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = self.client_class(**kwargs)
        print('Authenticated: ', self.client_auth.login(self.user.username, 'test_pass_1'))
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = self.client_class(**kwargs)
        self.client_auth_1.login(self.user.username, 'test_pass_1')
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_2)
        self.client_auth_2 = self.client_class(**kwargs)
        self.client_auth_2.login(self.user.username, 'test_pass_1')
        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')


    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        super().tearDown()


class UserFollowingUserTestCase(UsersBaseTestCase, APITestCase):
    def test_following_users(self):
        url = '/api/users/{}/following/users'
        url_current = '/api/users/current/following/users'

        create = self.client_auth.post(url_current, {'follow': self.user_1.id})
        self.assertEqual(create.status_code, 201)
        create = self.client_auth.post(url_current, {'follow': self.user_2.id})
        self.assertEqual(create.status_code, 201)
        create = self.client_auth.post(url_current, {'follow': self.user_3.id})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 3)

        followers = self.client_auth.get('/api/users/current/followers'.format(self.user.slug)).json()['results']
        for user in followers:
            self.assertNotEqual(user['username'], self.user.username)

        first_user = retrieve.json()['results'][0]
        self.assertTrue(first_user['following'])
        retrieve_user = self.client_auth.get('/api/users/{}'.format(first_user['username'])).json()
        self.assertTrue(retrieve_user['following'])
        retrieve_user = self.client.get('/api/users/{}'.format(first_user['username'])).json()
        self.assertFalse(retrieve_user['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        self.assertEqual(self.client.get(url.format(self.user.slug)).status_code, 200)

        self.assertEqual(self.client.get(url.format(self.user_3.slug)).json()['count'], 0)

        delete = self.client_auth.delete('{}/{}'.format(url_current, self.user_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_users_games(self):
        url_current = '/api/users/current/following/users'
        url_games = '/api/users/current/following/users/games'

        UserGame.objects.create(game=Game.objects.first(), user=self.user_1)

        create = self.client_auth.post(url_current, {'follow': self.user_1.id})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_games)
        self.assertEqual(retrieve.status_code, 200)
        self.assertGreater(len(retrieve.json()['results']), 0)

        retrieve = self.client_auth.get(url_games, {'dates': '1990-01-01,2000-12-31'})
        self.assertEqual(retrieve.status_code, 200)

        retrieve = self.client_auth.get(url_games, {'ordering': '-released'})
        self.assertEqual(retrieve.status_code, 200)

        retrieve = self.client_auth.get(url_games, {'platforms': 18})
        self.assertEqual(retrieve.status_code, 200)

        retrieve = self.client_auth.get(url_games, {'parent_platforms': 4})
        self.assertEqual(retrieve.status_code, 200)

        delete = self.client_auth.delete('{}/{}'.format(url_current, self.user_1.id))
        self.assertEqual(delete.status_code, 204)


class UserFollowingUserTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_following_users_counters(self):
        url_current = '/api/users/current/following/users'

        self.client_auth.post(url_current, {'follow': self.user_1.id})
        self.client_auth_2.post(url_current, {'follow': self.user_1.id})
        self.client_auth_1.post(url_current, {'follow': self.user.id})

        retrieve_user = self.client.get('/api/users/{}'.format(self.user.slug)).json()
        self.assertEqual(retrieve_user['followers_count'], 1)
        self.assertEqual(retrieve_user['following_count'], 1)
        retrieve_user_1 = self.client.get('/api/users/{}'.format(self.user_1.slug)).json()
        self.assertEqual(retrieve_user_1['followers_count'], 2)
        self.assertEqual(retrieve_user_1['following_count'], 1)
        retrieve_user_2 = self.client.get('/api/users/{}'.format(self.user_2.slug)).json()
        self.assertEqual(retrieve_user_2['followers_count'], 0)
        self.assertEqual(retrieve_user_2['following_count'], 1)


class UserFollowingCollectionTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_following_collections(self):
        url = '/api/users/{}/following/collections'
        url_current = '/api/users/current/following/collections'
        self.collection_3 = Collection.objects.create(name='Wind River', creator=self.user_3)

        create = self.client_auth.post(url_current, {'collection': self.collection_1.id})
        self.assertEqual(create.status_code, 400)
        create = self.client_auth.post(url_current, {'collection': self.collection_3.id})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        first_collection = retrieve.json()['results'][0]
        self.assertTrue(first_collection['following'])
        retrieve_collections = self.client_auth.get('/api/collections').json()['results']
        for collection in retrieve_collections:
            if collection['id'] == self.collection_1.id:
                self.assertFalse(collection['following'])
                self.assertEqual(collection['followers_count'], 0)
            if collection['id'] == self.collection_3.id:
                self.assertTrue(collection['following'])
                self.assertEqual(collection['followers_count'], 1)
        retrieve_collection = self.client_auth.get('/api/collections/{}'.format(first_collection['slug'])).json()
        self.assertTrue(retrieve_collection['following'])
        self.assertEqual(retrieve_collection['followers_count'], 1)
        retrieve_collection = self.client.get('/api/collections/{}'.format(first_collection['slug'])).json()
        self.assertFalse(retrieve_collection['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        self.assertEqual(self.client.get(url.format(self.user.slug)).status_code, 200)

        self.assertEqual(self.client.get(url.format(self.user_3.slug)).json()['count'], 0)

        delete = self.client_auth.delete('{}/{}'.format(url_current, self.collection_3.id))
        self.assertEqual(delete.status_code, 204)


class UserFollowingElementTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_following_collections(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')
        self.collection_3 = Collection.objects.create(name='Wind River', creator=self.user_3)

        game_1 = Game.objects.create(name='Wind River')
        CollectionGame.objects.create(collection=self.collection_3, game=game_1)

        create = self.client_auth.post(url_current, {'object_id': self.collection_1.id, 'instance': 'collection'})
        self.assertEqual(create.status_code, 400)
        create = self.client_auth.post(url_current, {'object_id': self.collection_3.id, 'instance': 'collection'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)
        self.assertEqual(retrieve.json()['results'][0]['id'], self.collection_3.id)

        retrieve_collections = self.client_auth.get('/api/collections').json()['results']
        for collection in retrieve_collections:
            if collection['id'] == self.collection_1.id:
                self.assertFalse(collection['following'])
                self.assertEqual(collection['followers_count'], 0)
            if collection['id'] == self.collection_3.id:
                self.assertTrue(collection['following'])
                self.assertEqual(collection['followers_count'], 1)

        retrieve_collection = self.client_auth.get('/api/collections/{}'.format(self.collection_3.slug)).json()
        self.assertTrue(retrieve_collection['following'])
        self.assertEqual(retrieve_collection['followers_count'], 1)

        retrieve_collection = self.client.get('/api/collections/{}'.format(self.collection_3.slug)).json()
        self.assertFalse(retrieve_collection['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)
        self.assertEqual(self.client.get(url.format(self.user.username)).status_code, 401)

        self.assertEqual(self.client_auth.get(url.format(self.user.slug)).status_code, 200)

        games = self.client_auth.get('{}/collection:{}/games'.format(url_current, self.collection_3.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/collection{}'.format(url_current, self.collection_3.id))
        self.assertEqual(delete.status_code, 404)

        delete = self.client_auth.delete('{}/collection:{}'.format(url_current, self.collection_3.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_users(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        create = self.client_auth.post(url_current, {'object_id': self.user_1.id, 'instance': 'user'})
        self.assertEqual(create.status_code, 201)
        create = self.client_auth.post(url_current, {'object_id': self.user_2.id, 'instance': 'user'})
        self.assertEqual(create.status_code, 201)
        create = self.client_auth.post(url_current, {'object_id': self.user_3.id, 'instance': 'user'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 0)

        followers = self.client_auth.get('/api/users/current/followers'.format(self.user.slug)).json()['results']
        for user in followers:
            self.assertNotEqual(user['username'], self.user.username)

        retrieve_user = self.client_auth.get('/api/users/{}'.format(self.user_3.username)).json()
        self.assertTrue(retrieve_user['following'])
        retrieve_user = self.client.get('/api/users/{}'.format(self.user_3.username)).json()
        self.assertFalse(retrieve_user['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)
        self.assertEqual(self.client.get(url.format(self.user.username)).status_code, 401)

        self.assertEqual(self.client_auth.get(url.format(self.user.slug)).status_code, 200)

        delete = self.client_auth.delete('{}/user:{}'.format(url_current, self.user_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_persons(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        person_1 = Person.objects.create(name='Nick Cave', wikibase_id='Q1')
        position_1 = Position.objects.create(name='Composer', wikibase_id='P1')
        GamePerson.objects.create(game=game_1, person=person_1, position=position_1)

        create = self.client_auth.post(url_current, {'object_id': person_1.id, 'instance': 'person'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        with self.assertNumQueries(7):
            retrieve_following = self.client_auth.get(f'/api/creators/{person_1.slug}')
            self.assertTrue(retrieve_following.json()['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/person:{}/games'.format(url_current, person_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/person:{}'.format(url_current, person_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_publishers(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        publisher_1 = Publisher.objects.create(name='Publisher Ltd')
        game_1.publishers.add(publisher_1)
        game_1.save()

        create = self.client_auth.post(url_current, {'object_id': publisher_1.id, 'instance': 'publisher'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        with self.assertNumQueries(5):
            retrieve_following = self.client_auth.get(f'/api/publishers/{publisher_1.slug}')
            self.assertTrue(retrieve_following.json()['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/publisher:{}/games'.format(url_current, publisher_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/publisher:{}'.format(url_current, publisher_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_developers(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        developer_1 = Developer.objects.create(name='Developer Inc')
        game_1.developers.add(developer_1)
        game_1.save()

        create = self.client_auth.post(url_current, {'object_id': developer_1.id, 'instance': 'developer'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        with self.assertNumQueries(5):
            retrieve_following = self.client_auth.get(f'/api/developers/{developer_1.slug}')
            self.assertTrue(retrieve_following.json()['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/developer:{}/games'.format(url_current, developer_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/developer:{}'.format(url_current, developer_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_stores(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        store_1 = Store.objects.create(name='Steam')
        GameStore.objects.create(game=game_1, store=store_1)

        create = self.client_auth.post(url_current, {'object_id': store_1.id, 'instance': 'store'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        with self.assertNumQueries(5):
            retrieve_following = self.client_auth.get(f'/api/stores/{store_1.slug}')
            self.assertTrue(retrieve_following.json()['following'])

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/store:{}/games'.format(url_current, store_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/store:{}'.format(url_current, store_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_tags(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        tag_1 = Tag.objects.create(name='action')
        game_1.tags.add(tag_1)
        game_1.save()

        create = self.client_auth.post(url_current, {'object_id': tag_1.id, 'instance': 'tag'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/tag:{}/games'.format(url_current, tag_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/tag:{}'.format(url_current, tag_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_platforms(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        platform_1 = Platform.objects.create(name='PC')
        GamePlatform.objects.create(game=game_1, platform=platform_1)

        create = self.client_auth.post(url_current, {'object_id': platform_1.id, 'instance': 'platform'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/platform:{}/games'.format(url_current, platform_1.id))
        self.assertGreater(games.json()['count'], 0)

        delete = self.client_auth.delete('{}/platform:{}'.format(url_current, platform_1.id))
        self.assertEqual(delete.status_code, 204)

    def test_following_genres(self):
        url = '/api/users/{}/following/instances'
        url_current = url.format('current')

        game_1 = Game.objects.create(name='Wind River')
        genre_1 = Genre.objects.create(name="Action")
        genre_2 = Genre.objects.create(name="Shooter", hidden=False)
        game_1.genres.add(genre_1)
        game_1.save()

        create = self.client_auth.post(url_current, {'object_id': genre_1.id, 'instance': 'genre'})
        self.assertEqual(create.status_code, 201)

        retrieve = self.client_auth.get(url_current)
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)

        self.assertEqual(self.client.get(url_current).status_code, 401)

        games = self.client_auth.get('{}/genre:{}/games'.format(url_current, genre_1.id))
        self.assertGreater(games.json()['count'], 0)

        self.client_auth.post(url_current, {'object_id': genre_2.id, 'instance': 'genre'})
        with self.assertNumQueries(4):
            retrieve_following = self.client_auth.get(f'/api/genres/{genre_2.id}')
            self.assertTrue(retrieve_following.json()['following'])

        delete = self.client_auth.delete('{}/genre:{}'.format(url_current, genre_1.id))
        self.assertEqual(delete.status_code, 204)


class UserGameTestCase(UsersBaseTestCase, APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def test_games(self):
        self.assertEqual(self.client_auth.get('/api/users/current/games').status_code, 200)
        self.assertEqual(self.client.get('/api/users/current/games').status_code, 401)
        self.assertEqual(self.client.get('/api/users/{}/games'.format(self.user.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/games'.format(self.user_num.slug)).status_code, 200)

    def test_games_filter(self):
        games = Game.objects.all()[0:10]
        genre = Genre.objects.first()
        store = Store.objects.first()
        for i, game in enumerate(games):
            UserGame.objects.create(game=game, user=self.user)
            if i < 3:
                GamePlatform.objects.get_or_create(game=game, platform_id=4)
                game.genres.add(genre)
                GameStore.objects.create(game=game, store=store)
                game.released = now().replace(year=2001)
                game.save(update_fields=['released'])
            if 4 <= i <= 5:
                game.released = now().replace(year=2018)
                game.save(update_fields=['released'])

        response = self.client.get('/api/users/{}/games?platforms=4'.format(self.user.slug))
        response_data_1 = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_data_1['count'], 3)

        response = self.client.get('/api/users/{}/games?parent_platforms=1'.format(self.user.slug))
        response_data_2 = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_data_2['count'], 3)

        response = self.client.get('/api/users/{}/games?genres={}'.format(self.user.slug, genre.id))
        response_data_3 = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_data_3['count'], 3)

        response = self.client.get('/api/users/{}/games?stores=1'.format(self.user.slug))
        response_data_4 = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_data_4['count'], 3)

        response = self.client.get(
            f'/api/users/{self.user.slug}/games',
            {'dates': '2001-01-01,2001-12-31.2018-01-01,2018-12-31'}
        )
        response_data_5 = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response_data_5['count'], 5)

    def test_games_empty_search(self):
        for game in Game.objects.all()[0:10]:
            UserGame.objects.create(game=game, user=self.user)
        response = self.client.get('/api/users/{}/games?search=thistitledoesntexist'.format(self.user.slug))
        self.assertEqual(response.status_code, 200)

    def test_games_post(self):
        game = Game.objects.first()
        platform1 = Platform.objects.get(name='PC')
        platform2 = Platform.objects.get(name='Xbox One')
        post = self.client_auth.post('/api/users/current/games', {'game': game.id, 'platforms': platform1.id})
        self.assertEqual(post.status_code, 201)

        self.client_auth.delete('/api/users/current/games/{}'.format(game.id))
        response = self.client_auth.post('/api/users/current/games', {'game': game.id, 'platforms': platform2.id})

        self.assertNotIn(platform1.id, response.json()['platforms'])
        self.assertIn(platform2.id, response.json()['platforms'])
        self.assertEqual(post.status_code, 201)

    def test_games_butch(self):
        game = Game.objects.first()
        platform1 = Platform.objects.get_or_create(name='PC', slug='pc')[0]
        platform2 = Platform.objects.get_or_create(name='Mac', slug='mac')[0]

        post = self.client_auth.post(
            '/api/users/current/games',
            json.dumps({'games': [game.id], 'batch_platforms': {game.id: [platform1.id]}}),
            content_type='application/json',
        )
        self.assertEqual(post.status_code, 201)

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['user_game']['platforms'][0]['id'], platform1.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_OWNED)

        response = self.client_auth.patch(
            '/api/users/current/games',
            json.dumps({
                'games': [game.id], 'platforms': [platform2.id],
                'status': UserGame.STATUS_PLAYING,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['user_game']['platforms'][0]['id'], platform2.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_PLAYING)

    def test_games_is_new(self):
        UserGame.objects.create(game_id=Game.objects.only('id').first().id, user_id=self.user.id, is_new=True)

        response_data = self.client.get('/api/users/{}/games'.format(self.user.slug)).json()
        self.assertFalse(response_data['results'][0]['is_new'])

        response_data = self.client_auth.get('/api/users/current/games').json()
        self.assertTrue(response_data['results'][0]['is_new'])

        response_data = self.client_auth.get('/api/users/current/games').json()
        self.assertFalse(response_data['results'][0]['is_new'])


class UserGameTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_games_delete(self):
        game = Game.objects.first()

        self.client_auth.post('/api/users/current/games', {'game': game.id})

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['id'], game.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_OWNED)

        self.client_auth.delete('/api/users/current/games/{}'.format(game.id))

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['count'], 0)

        self.client_auth.post('/api/users/current/games', {'game': game.id, 'status': UserGame.STATUS_PLAYING})

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['id'], game.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_PLAYING)

    def test_games_added(self):
        game = Game.objects.first()
        game_get = '/api/games/{}'.format(game.slug)
        self.client_auth.post(
            '/api/users/current/games', json.dumps({'games': [game.id]}),
            content_type='application/json',
        )
        self.assertEqual(self.client.get(game_get).json()['added'], 1)

        self.client_auth.delete('/api/users/current/games/{}'.format(game.id))
        self.assertEqual(self.client.get(game_get).json()['added'], 0)

        self.client_auth.post(
            '/api/users/current/games', json.dumps({'games': [game.id]}),
            content_type='application/json',
        )
        self.client_auth_1.post(
            '/api/users/current/games', json.dumps({'games': [game.id]}),
            content_type='application/json',
        )
        self.assertEqual(self.client.get(game_get).json()['added'], 2)

    def test_games_butch(self):
        game1 = Game.objects.first()
        game2 = Game.objects.last()
        platform1 = Platform.objects.get_or_create(name='PC', slug='pc')[0]
        platform2 = Platform.objects.get_or_create(name='Mac', slug='mac')[0]

        post = self.client_auth.post(
            '/api/users/current/games',
            json.dumps({
                'games': [game1.id, game2.id],
                'batch_platforms': {
                    game1.id: [platform1.id],
                    game2.id: [platform1.id],
                },
            }),
            content_type='application/json',
        )
        self.assertEqual(post.status_code, 201)

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['user_game']['platforms'][0]['id'], platform1.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_OWNED)

        response = self.client_auth.patch(
            '/api/users/current/games',
            json.dumps({
                'games': [game1.id, game2.id], 'platforms': [platform2.id],
                'status': UserGame.STATUS_PLAYING,
            }),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['results'][0]['user_game']['platforms'][0]['id'], platform2.id)
        self.assertEqual(get['results'][0]['user_game']['status'], UserGame.STATUS_PLAYING)

    def test_games_butch_delete(self):
        ids = [game.id for game in Game.objects.all()[0:3]]
        statuses = {pk: UserGame.STATUS_BEATEN for pk in ids}

        self.client_auth.post(
            '/api/users/current/games', json.dumps({'games': ids, 'batch_statuses': statuses}),
            content_type='application/json',
        )

        self.client_auth_1.post('/api/users/current/following/users', {'follow': self.user.id})

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['count'], 3)
        get_statistics = self.client_auth.get('/api/users/current/statistics/games').json()
        self.assertEqual(get_statistics['count'], 3)
        action = self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()['results'][1]
        self.assertEqual(action['games']['count'], 3)

        self.client_auth.delete(
            '/api/users/current/games', json.dumps({'games': ids[0:2]}),
            content_type='application/json',
        )

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['count'], 1)
        get_statistics = self.client_auth.get('/api/users/current/statistics/games').json()
        self.assertEqual(get_statistics['count'], 1)
        action = self.client_auth_1.get('/api/feed/explore', {'ordering': '-created'}).json()['results'][1]
        self.assertEqual(action['games']['count'], 1)

        self.client_auth.delete(
            '/api/users/current/games', json.dumps({'games': ids[2:3]}),
            content_type='application/json',
        )

        get = self.client_auth.get('/api/users/current/games').json()
        self.assertEqual(get['count'], 0)
        get_statistics = self.client_auth.get('/api/users/current/statistics/games').json()
        self.assertEqual(get_statistics['count'], 0)


class UserFavoriteGameTestCase(UsersBaseTestCase, APITestCase):
    def test_games(self):
        self.assertEqual(self.client_auth.get('/api/users/current/favorites').status_code, 200)
        self.assertEqual(self.client.get('/api/users/current/favorites').status_code, 401)
        self.assertEqual(self.client.get('/api/users/{}/favorites'.format(self.user.slug)).status_code, 200)

    def test_post(self):
        data = {
            'game': Game.objects.last().id,
            'position': 2,
        }
        self.assertEqual(UserGame.objects.filter(game_id=data['game'], user=self.user).count(), 0)
        self.assertEqual(self.client.post('/api/users/current/favorites', data).status_code, 401)
        self.assertEqual(self.client_auth.post('/api/users/current/favorites', data).status_code, 201)

        games = self.client_auth.get('/api/users/current/favorites').json()['results']
        self.assertIsNone(games[0])
        self.assertEqual(games[2]['id'], data['game'])
        self.assertEqual(UserGame.objects.filter(game_id=data['game'], user=self.user).count(), 1)

    def test_patch(self):
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.last().id,
                'position': 2,
            },
        )
        self.client_auth.patch(
            '/api/users/current/favorites/2', json.dumps({'game': Game.objects.first().id}),
            content_type='application/json',
        )
        games = self.client_auth.get('/api/users/current/favorites').json()['results']
        self.assertEqual(games[2]['id'], Game.objects.first().id)

    def test_delete(self):
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.last().id,
                'position': 2,
            },
        )
        self.client_auth.delete('/api/users/current/favorites/2')
        self.assertIsNone(self.client_auth.get('/api/users/current/favorites').json()['results'][2])


class UserFavoriteGameTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_post_double_position(self):
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.last().id,
                'position': 2,
            },
        )
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.first().id,
                'position': 2,
            },
        )
        games = self.client_auth.get('/api/users/current/favorites').json()['results']
        self.assertEqual(games[2]['id'], Game.objects.first().id)

    def test_post_double_game(self):
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.last().id,
                'position': 2,
            },
        )
        self.client_auth.post(
            '/api/users/current/favorites', {
                'game': Game.objects.last().id,
                'position': 5,
            },
        )
        games = self.client_auth.get('/api/users/current/favorites').json()['results']
        self.assertIsNone(games[2])
        self.assertEqual(games[5]['id'], Game.objects.last().id)


class UserTestCase(UsersBaseTestCase, APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games', 'reviews_reactions',
    ]

    def test_users_user(self):
        self.assertEqual(self.client_auth.get('/api/users/current').status_code, 200)
        self.assertEqual(self.client.get('/api/users/current').status_code, 401)
        self.assertEqual(self.client.get('/api/users/{}'.format(self.user.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}'.format(self.user_num.slug)).status_code, 200)

        response_data = self.client.get('/api/users/{}'.format(self.user.slug)).json()
        self.assertEqual(response_data['games_wishlist_count'], 0)

        UserGame.objects.create(user=self.user, game=Game.objects.first(), status=UserGame.STATUS_TOPLAY)

        response_data = self.client.get('/api/users/{}'.format(self.user.slug)).json()
        self.assertEqual(response_data['games_wishlist_count'], 1)

        response_data = self.client_auth_1.get('/api/users/current').json()
        self.assertIn('rated_games_percent', response_data.keys())

    def test_user_noindex(self):
        response_data = self.client.get('/api/users/{}'.format(self.user.slug)).json()
        self.assertIn('noindex', response_data.keys())

    def test_users_user_compatibility(self):
        games = Game.objects.all()[0:5]

        UserGame.objects.get_or_create(user=self.user, game=games[0])
        UserGame.objects.get_or_create(user=self.user, game=games[1])
        UserGame.objects.get_or_create(user=self.user, game=games[2])
        UserGame.objects.get_or_create(user=self.user, game=games[3])
        UserGame.objects.get_or_create(user=self.user_1, game=games[1])
        UserGame.objects.get_or_create(user=self.user_1, game=games[4])
        compatibility = self.client_auth_1.get('/api/users/{}'.format(self.user.slug)).json()['compatibility']
        self.assertEqual(compatibility['percent'], 25)
        self.assertEqual(compatibility['label'], 'low')
        compatibility = self.client_auth.get('/api/users/{}'.format(self.user_1.slug)).json()['compatibility']
        self.assertEqual(compatibility['percent'], 50)
        self.assertEqual(compatibility['label'], 'middle')

        UserGame.objects.all().delete()

        UserGame.objects.get_or_create(user=self.user_1, game=games[0])
        UserGame.objects.get_or_create(user=self.user_1, game=games[1])
        UserGame.objects.get_or_create(user=self.user_1, game=games[2])
        UserGame.objects.get_or_create(user=self.user_1, game=games[3])
        UserGame.objects.get_or_create(user=self.user, game=games[1])
        UserGame.objects.get_or_create(user=self.user, game=games[2])
        compatibility = self.client_auth_1.get('/api/users/{}'.format(self.user.slug)).json()['compatibility']
        self.assertEqual(compatibility['percent'], 100)
        self.assertEqual(compatibility['label'], 'high')
        compatibility = self.client_auth.get('/api/users/{}'.format(self.user_1.slug)).json()['compatibility']
        self.assertEqual(compatibility['percent'], 50)
        self.assertEqual(compatibility['label'], 'middle')

    def test_users_user_patch(self):
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'full_name': ' nick '}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['full_name'], 'nick')

        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'full_name': ' '}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['full_name'], '')

    def test_users_user_full_name_patch(self):
        new_full_name = 'a' * 38
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'full_name': new_full_name}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['full_name'], new_full_name)

        new_invalid_full_name = 'a' * 39
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'full_name': new_invalid_full_name}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 400)
        self.assertTrue(response.json()['full_name'][0])

    def test_users_user_patch_bio(self):
        text = 'hello!\nmy name is Nick!\nhttps://google.com/'
        text_html = 'hello!<br>my name is Nick!<br>' \
                    '<a href="https://google.com/" rel="nofollow">https://google.com/</a>'
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'bio': text}),
            content_type='application/json',
        )
        self.assertEqual(response.json()['bio'], text_html)
        self.assertEqual(response.json()['bio_raw'], text)

        text = 'hello?<i>hi</i>'
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'bio': text}),
            content_type='application/json',
        )
        self.assertEqual(response.json()['bio'], 'hello?&lt;i&gt;hi&lt;/i&gt;')
        self.assertEqual(response.json()['bio_raw'], text)

        text = '\n'
        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'bio': text}),
            content_type='application/json',
        )
        self.assertEqual(response.json()['bio'], '')
        self.assertEqual(response.json()['bio_raw'], '')

    def test_users_user_patch_avatar(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        with open(image, 'rb') as f:
            response = self.client_auth.patch(
                '/api/users/current', encode_multipart(BOUNDARY, {'avatar': f}),
                content_type=MULTIPART_CONTENT,
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn(response.json()['avatar'][0:7], ('http://', 'https:/'))

        response = self.client_auth.patch(
            '/api/users/current', json.dumps({'avatar': None}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['avatar'], None)

    def test_users_user_patch_api(self):
        self.assertIsNone(self.client_auth.get('/api/users/current').json()['api_key'])

        self.client_auth.patch(
            '/api/users/current',
            json.dumps({
                'api_email': '',
                'api_url': '',
                'api_description': ''
            }),
            content_type='application/json',
        )

        self.assertIsNone(self.client_auth.get('/api/users/current').json()['api_key'])

        response = self.client_auth.patch(
            '/api/users/current',
            json.dumps({
                'api_email': 'car@seat.headrest',
                'api_url': 'http://game.app',
                'api_description': 'game app'
            }),
            content_type='application/json',
        )
        old_api_key = response.json()['api_key']

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(old_api_key), 32)
        self.assertEqual(response.json()['api_email'], 'car@seat.headrest')
        self.assertEqual(response.json()['api_url'], 'http://game.app')
        self.assertEqual(response.json()['api_description'], 'game app')

        response = self.client_auth.patch(
            '/api/users/current',
            json.dumps({'api_key': ''}),
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertNotEqual(old_api_key, response.json()['api_key'])

    def test_users_user_put(self):
        response = self.client_auth.put(
            '/api/users/current', json.dumps({'full_name': 'nick', 'username': 'badseeds'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    def test_users_user_statistics(self):
        self.assertEqual(self.client.get('/api/users/{}/statistics'.format(self.user.id)).status_code, 200)
        self.assertEqual(
            self.client.get('/api/users/{}/statistics?get=games,reviews,comments'.format(self.user.id))
            .status_code, 200,
        )
        self.assertEqual(self.client.get('/api/users/{}/statistics/games'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/reviews'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/collections'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/platforms'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/timeline'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/years'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/developers'.format(self.user.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/statistics/genres'.format(self.user.id)).status_code, 200)

    def test_users_user_games_platforms(self):
        self.assertEqual(self.client.get('/api/users/{}/games/platforms'.format(self.user.id)).status_code, 200)

    def test_users_user_games_platforms_parents(self):
        for i, game in enumerate(Game.objects.all()[0:4]):
            if not i:
                user_game = UserGame.objects.create(game=game, user=self.user, hidden=True)
                user_game.platforms.add(8)
                continue
            user_game = UserGame.objects.create(game=game, user=self.user)
            user_game.platforms.add(4)
            GamePlatform.objects.create(game_id=user_game.game_id, platform_id=4)
        self.user.set_statistics()

        response = self.client.get('/api/users/{}/games/platforms/parents'.format(self.user.id))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)
        self.assertEqual(len(response_data['results'][0]['platforms']), 1)

    def test_users_user_games_genres(self):
        self.assertEqual(self.client.get('/api/users/{}/games/genres'.format(self.user.id)).status_code, 200)

    def test_users_user_games_years(self):
        self.assertEqual(self.client.get('/api/users/{}/games/years'.format(self.user.id)).status_code, 200)

    def test_users_user_followers(self):
        self.assertEqual(self.client_auth.get('/api/users/current/followers').status_code, 200)
        self.assertEqual(self.client.get('/api/users/current/followers').status_code, 401)

    def test_users_user_reviews(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        game1 = Game.objects.get_or_create(name='Grand Theft Auto: Vice City')[0]
        game2 = Game.objects.get_or_create(name='Grand Theft Auto: San Andreas')[0]
        game3 = Game.objects.get_or_create(name='Dragon Age: Origins')[0]
        review = Review.objects.get_or_create(user=self.user, rating=ratings[1]['id'], game=game1, text='cool')[0]
        review.reactions.add(reactions[0]['id'])
        review.reactions.add(reactions[3]['id'])
        review = Review.objects.get_or_create(user=self.user, rating=ratings[3]['id'], game=game2, text='bad')[0]
        review.reactions.add(reactions[1]['id'])
        review.reactions.add(reactions[2]['id'])
        review = Review.objects.get_or_create(user=self.user, rating=ratings[1]['id'], game=game3)[0]
        review.reactions.add(reactions[4]['id'])

        retrieve = self.client_auth.get('/api/users/current/reviews')
        data = retrieve.json()
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(data['count'], 3)
        self.assertEqual(len(data['results'][0]['reactions']), 1)
        self.assertEqual(len(data['results'][1]['reactions']), 2)
        self.assertEqual(len(data['results'][2]['reactions']), 2)
        self.assertEqual(data['ratings']['count'], 2)
        self.assertEqual(data['ratings']['results'][0]['count'], 2)
        self.assertEqual(data['ratings']['results'][1]['count'], 1)

        retrieve = self.client_auth.get('/api/users/current/reviews?rating={}'.format(ratings[1]['id']))
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(retrieve.json()['ratings']['total'], 3)

        retrieve = self.client_auth.get('/api/users/current/reviews?rating={}'.format(ratings[3]['id']))
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)
        self.assertEqual(retrieve.json()['ratings']['total'], 3)

        retrieve = self.client_auth.get('/api/users/current/reviews?rating={}'.format(ratings[0]['id']))
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 0)
        self.assertEqual(retrieve.json()['ratings']['total'], 3)

        retrieve = self.client_auth.get('/api/users/current/reviews?is_text=true')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)

        retrieve = self.client_auth.get('/api/users/current/reviews?rating=null')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 3)

        retrieve = self.client_auth.get('/api/users/current/reviews/top')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 0)

    def test_users_user_username(self):
        user = get_user_model().objects.get_or_create(username='Bu', email='Bu@test.io')[0]
        self.assertEqual(self.client.get('/api/users/{}'.format(user.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}'.format(user.slug.lower())).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}'.format(user.slug.upper())).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/games'.format(user.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/games'.format(user.slug.lower())).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/games'.format(user.slug.upper())).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/followers'.format(user.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/followers'.format(user.slug.lower())).status_code, 200)
        self.assertEqual(self.client.get('/api/users/{}/followers'.format(user.slug.upper())).status_code, 200)

    def test_users_user_import_waiting(self):
        user0 = get_user_model().objects.create(username='ken', email='ken@test.io')
        user1 = get_user_model().objects.create(username='peter', email='peter@test.io')
        user2 = get_user_model().objects.create(username='mike', email='mike@test.io')
        user3 = get_user_model().objects.create(username='jack', email='jack@test.io')
        user = get_user_model().objects.create(username='michel', email='michel@test.io')

        logs = {0: user0, 1: user1, 2: user2, 3: user3, 4: user}
        durations = {'steam': 22, 'playstation': 13, 'xbox': 23, 'gog': 0}  # 'raptr': 0,
        for i, store in enumerate(STORES):
            network = Network.objects.create(name=store.network_slug)
            ImportLog.objects.create(
                network=network, user=logs[i], is_sync=False, account=i, status='ready',
                duration=durations[store.network_slug],
            )
            setattr(user, store.field_status, 'process')
        user.save()

        Import.objects.create(is_sync=False, user_id=user0.id, date=now())
        Import.objects.create(is_sync=False, user_id=user1.id, date=now())
        Import.objects.create(is_sync=False, user_id=user2.id, date=now())
        Import.objects.create(is_sync=False, user_id=user3.id, date=now())
        Import.objects.create(is_sync=False, user_id=user.id, date=now())

        response = self.client.get('/api/users/{}/import-waiting'.format(user.slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn('position_in_queue', response_data.keys())
        self.assertIn('approximate_seconds', response_data.keys())
        self.assertEqual(len(settings.RUN_IMPORTS), 3)
        self.assertEqual(response_data['position_in_queue'], 2)
        self.assertEqual(response_data['approximate_seconds'], 46)

    def test_users_user_setting(self):
        action_url = '/api/users/current/setting'

        # empty

        response = self.client_auth.post(action_url)
        self.assertEqual(response.status_code, 400)

        # without value

        response = self.client_auth.post(action_url, {'key': 'banner_1'})
        self.assertEqual(response.status_code, 400)

        # set - bool

        response = self.client_auth.post(
            action_url, json.dumps({'key': 'banner_1', 'value': False}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['banner_1'], False)

        response_data = self.client_auth.get('/api/users/current').json()
        self.assertEqual(response_data['settings']['banner_1'], False)

        # change - string

        response = self.client_auth.post(action_url, {'key': 'banner_1', 'value': 'ololo'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['banner_1'], 'ololo')

        response_data = self.client_auth.get('/api/users/current').json()
        self.assertEqual(response_data['settings']['banner_1'], 'ololo')

        # change - int

        response = self.client_auth.post(
            action_url, json.dumps({'key': 'banner_1', 'value': 42}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['banner_1'], 42)

        response_data = self.client_auth.get('/api/users/current').json()
        self.assertEqual(response_data['settings']['banner_1'], 42)

        # delete

        response = self.client_auth.delete(
            action_url, json.dumps({'key': 'banner_1'}),
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)

    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.steam.get_profile')
    @patch('apps.merger.profiles.steam.get_games')
    def test_users_user_accounts_steam_private(self, steam_get_games_mock, steam_get_profile_mock, steam_get_id_mock):
        steam_get_id_mock.return_value = False
        steam_get_profile_mock.return_value = False
        steam_get_games_mock.return_value = False

        action_url = '/api/users/current'

        # error

        response = self.client_auth.patch(
            action_url, json.dumps({'steam_id': 'steam_id'}),
            content_type='application/json',
        )

        steam_get_id_mock.assert_called_once()
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['steam_id_status'], 'error')

        # error

        steam_get_id_mock.return_value = 123456

        response = self.client_auth.patch(
            action_url, json.dumps({'steam_id': 'steam_id'}),
            content_type='application/json',
        )

        self.assertEqual(steam_get_id_mock.call_count, 2)
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['steam_id_status'], 'error')

        # private user

        steam_get_profile_mock.return_value = {
            'profileurl': 'https://steamcommunity.com/profiles/76561198055555575/',
            'communityvisibilitystate': VISIBLE_STATE_PUBLIC - 1,
        }

        response = self.client_auth.patch(
            action_url, json.dumps({'steam_id': 'steam_id'}),
            content_type='application/json',
        )

        self.assertEqual(steam_get_id_mock.call_count, 3)
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['steam_id_status'], 'private-user')

        # private games

        steam_get_profile_mock.return_value = {
            'profileurl': 'https://steamcommunity.com/profiles/76561198055555575/',
            'communityvisibilitystate': VISIBLE_STATE_PUBLIC,
        }

        response = self.client_auth.patch(
            action_url, json.dumps({'steam_id': 'steam_id'}),
            content_type='application/json',
        )

        self.assertEqual(steam_get_id_mock.call_count, 4)
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['steam_id_status'], 'private-games')

    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.steam.get_profile')
    @patch('apps.merger.profiles.steam.check_link')
    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.xbox.get_profile')
    @patch('apps.merger.profiles.psn.get_profile')
    def test_users_user_confirm_accounts(
        self, psn_get_profile_mock, xbox_get_profile_mock, xbox_get_id_mock,
        steam_check_link_mock, steam_get_profile_mock, steam_get_id_mock,
    ):
        steam_get_id_mock.return_value = 123456
        steam_get_profile_mock.return_value = {'profileurl': 'https://steamcommunity.com/profiles/76561198055555575/'}
        steam_check_link_mock.return_value = None
        xbox_get_id_mock.return_value = 123456
        xbox_get_profile_mock.return_value = {'bio': 'https://ag.ru/@curt'}
        psn_get_profile_mock.return_value = {'profile': {'aboutMe': 'wow! https://ag.ru/@curt'}}

        action_url = '/api/users/current/confirm-accounts'

        response = self.client_auth.post(action_url)
        self.assertEqual(response.status_code, 200)

        self.user.steam_id = 'https://steamcommunity.com/profiles/76561198055555575/'
        self.user.gamer_tag = 'WarrantChip4642'
        self.user.psn_online_id = 'shurashov'
        self.user.save(update_fields=['steam_id', 'gamer_tag', 'psn_online_id'])

        response_data = self.client_auth.post(action_url).json()

        steam_check_link_mock.assert_called_once()
        steam_get_profile_mock.assert_called_once()
        steam_get_id_mock.assert_called_once()
        xbox_get_id_mock.assert_called_once()
        xbox_get_profile_mock.assert_called_once()
        psn_get_profile_mock.assert_called_once()

        self.assertTrue(response_data['steam_id']['confirmed'])
        self.assertTrue(response_data['gamer_tag']['confirmed'])
        self.assertTrue(response_data['psn_online_id']['confirmed'])

    def test_users_user_confirm_accounts_error(self):
        action_url = '/api/users/current/confirm-accounts'

        self.user.steam_id = 'https://steamcommunity.com/profiles/76561198055555575/'
        self.user.steam_id_uid = '123'
        self.user.steam_id_uid_first_confirm = '234'
        self.user.gamer_tag = 'WarrantChip4642'
        self.user.gamer_tag_uid = '123'
        self.user.gamer_tag_uid_first_confirm = '234'
        self.user.psn_online_id = 'shurashov'
        self.user.psn_online_id_first_confirm = 'urashov'
        self.user.save()

        response_data = self.client_auth.post(action_url).json()
        self.assertFalse(response_data['steam_id']['confirmed'])
        self.assertIn(self.user.steam_id_uid_first_confirm, response_data['steam_id']['error'])
        self.assertFalse(response_data['gamer_tag']['confirmed'])
        self.assertIn(self.user.gamer_tag_uid_first_confirm, response_data['gamer_tag']['error'])
        self.assertFalse(response_data['psn_online_id']['confirmed'])
        self.assertIn(self.user.psn_online_id_first_confirm, response_data['psn_online_id']['error'])

    def test_users_user_similar(self):
        response = self.client.get('/api/users/{}/similar'.format(self.user.slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 0)

        self.user.set_statistics(['recommended_users'], recommended_users=[
            {
                'percent': min(100, ceil(score * 20)), 'score': score,
                'user': user_id, 'games': self.user.get_similar_games(user_id)
            }
            for user_id, score in [(self.user_2.id, 2), (self.user_1.id, 1)]
        ])

        response = self.client.get('/api/users/{}/similar'.format(self.user.slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 2)
        self.assertEqual(response_data['results'][0]['id'], self.user_2.id)
        self.assertEqual(response_data['results'][1]['id'], self.user_1.id)

    def test_users_api_requests(self):
        action_url = '/api/users/current/api-requests'

        # empty

        response = self.client_auth.get(action_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], settings.API_LIMITS[settings.API_GROUP_FREE])

        # db counter

        APIUserCounter.objects.create(user_id=self.user.id, date=now(), count=123)
        response = self.client_auth.get(action_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], settings.API_LIMITS[settings.API_GROUP_FREE] - 123)

        # db counter + local counter

        from apps.utils.middlewares import _api_counter
        _api_counter[self.user.id] = 2
        response = self.client_auth.get(action_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], settings.API_LIMITS[settings.API_GROUP_FREE] - 123)
        self.assertEqual(response.json()['_memory'], 2)


class UserTransactionTestCase(UsersBaseTestCase, APITransactionTestCase):
    def test_users_user_collections(self):
        retrieve = self.client_auth.get('/api/users/current/collections')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 1)
        self.assertEqual(retrieve.json()['results'][0]['games_count'], 10)
        self.assertEqual(self.client.get('/api/users/current/collections').status_code, 401)

    def test_users_user_games_recently(self):
        game1 = Game.objects.first()
        game2 = Game.objects.last()

        self.client_auth.post('/api/users/current/games', {'game': game1.id})
        self.client_auth.post('/api/users/current/games', {'game': game2.id})

        self.assertEqual(self.client.get('/api/users/{}/games/recently'.format(self.user.id)).status_code, 200)

        get = self.client_auth.get('/api/users/current/games/recently').json()

        self.assertEqual(get['count'], 2)
        self.assertEqual(get['results'][0]['id'], game2.id)
        self.assertEqual(get['results'][1]['id'], game1.id)

        self.client_auth.delete('/api/users/current/games/{}'.format(game2.id))

        get = self.client_auth.get('/api/users/current/games/recently').json()
        self.assertEqual(get['count'], 1)
        self.assertEqual(get['results'][0]['id'], game1.id)

        self.client_auth.delete('/api/users/current/games/{}'.format(game1.id))
        get = self.client_auth.get('/api/users/current/games/recently').json()
        self.assertEqual(get['count'], 0)

    def test_users_user_persons(self):
        with self.assertNumQueries(3):
            retrieve = self.client_auth.get('/api/users/current/persons')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 0)

        game_1 = Game.objects.create(name='Wind River')
        game_2 = Game.objects.create(name='Bad Seeds')
        game_3 = Game.objects.create(name='Grinderman')
        person_1 = Person.objects.create(name='Nick Cave', wikibase_id='Q1')
        person_2 = Person.objects.create(name='Warren Ellis', wikibase_id='Q2')
        position_1 = Position.objects.create(name='Composer', wikibase_id='P1')
        position_2 = Position.objects.create(name='Director', wikibase_id='P2')
        GamePerson.objects.create(game=game_1, person=person_1, position=position_1)
        GamePerson.objects.create(game=game_1, person=person_2, position=position_1)
        GamePerson.objects.create(game=game_1, person=person_1, position=position_2)
        GamePerson.objects.create(game=game_2, person=person_1, position=position_2)
        GamePerson.objects.create(game=game_2, person=person_2, position=position_1)
        GamePerson.objects.create(game=game_3, person=person_1, position=position_2)

        self.client_auth.post('/api/users/current/games', {'game': game_1.id})
        self.client_auth.post('/api/users/current/games', {'game': game_2.id})
        self.client_auth.post('/api/users/current/games', {'game': game_3.id})

        with self.assertNumQueries(9):
            retrieve = self.client_auth.get('/api/users/current/persons')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(retrieve.json()['results'][0]['id'], person_1.id)


class PlayerTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    @classmethod
    def setUpTestData(cls):
        cls.url = reverse('api:players')
        cls.players = [
            AuthenticatedPlayer(get_user_model().objects.create(username=f'test_{i}', email=f'test_{i}@test.io'))
            for i in range(3)
        ]
        request = RequestFactory().get('some/path')
        for i in range(3):
            SessionMiddleware().process_request(request)
            request.session.save(must_create=True)
            request.user = AnonymousUser()
            cls.players.append(AnonymousPlayer.from_request(request))
        cls.players_map = {player.id.hex: player for player in cls.players}

    def test_get_all(self):
        response = self.client.get(self.url, data={'players_ids': ','.join(self.players_map.keys())})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 6)
        for player in response.data:
            self.assertIn('id', player)
            self.assertIn('username', player)
            self.assertIn('avatar', player)
            self.assertIn('full_name', player)
            self.assertIn(player['id'], self.players_map.keys())
            self.assertEqual(self.players_map[player['id']].id.hex, player['id'])
            self.assertEqual(self.players_map[player['id']].username, player['username'])
            self.assertEqual(self.players_map[player['id']].full_name, player['full_name'])
            self.assertEqual(self.players_map[player['id']].avatar, player['avatar'])

    def test_invalid_id(self):
        for invalid_id in ['qwe', '', 'null', 123, uuid.uuid4().hex[:-2], f'{uuid.uuid4()}, {uuid.uuid4()}']:
            response = self.client.get(self.url, data={'players_ids': invalid_id})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_wrong_uids(self):
        response = self.client.get(self.url, data={'players_ids': uuid.uuid4().hex})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

    @classmethod
    def tearDownClass(cls):
        pass
        Redis.from_url(settings.REDIS_LOCATION).flushdb(asynchronous=True)
