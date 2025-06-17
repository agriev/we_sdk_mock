import os
from datetime import timedelta
from random import shuffle
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.contenttypes.models import ContentType
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.management import call_command
from django.test import Client, TestCase, TransactionTestCase
from django.test.client import encode_multipart
from django.utils.timezone import now
from haystack import connections as haystack_connections
from modeltranslation.utils import get_language
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.reverse import reverse
from rest_framework.test import APIRequestFactory

from api.games.views import GameViewSet
from apps.achievements.models import Achievement, ParentAchievement
from apps.common.models import CatalogFilter
from apps.credits.models import GamePerson, Person, Position
from apps.discussions.models import Discussion
from apps.games.models import (Addition, Collection, CollectionGame, Featured, Game, GamePlatform, GameStore, Genre,
                               Platform, Recommended, ScreenShot, ScreenShotCount, Store, Tag)
from apps.games.seo import games_auto_description
from apps.merger.merger import merge
from apps.merger.models import Network
from apps.recommendations.models import UserRecommendation
from apps.reviews.models import Review
from apps.users.models import PlayerBase, UserFollowElement, UserGame
from apps.utils.dates import monday
from apps.utils.game_session import PlayerGameSessionController
from apps.utils.tests import APITestCase, haystack_test_config
from . import GamesBaseTestCase


class GamesTestCase(GamesBaseTestCase, TestCase):
    def setUp(self):
        super().setUp()
        self.game_num, _ = Game.objects.get_or_create(name='1601')
        self.game_num.display_external = True
        self.game_num.save()

    def test_games(self):
        with self.assertNumQueries(4):
            self.assertEqual(self.client.get('/api/games').status_code, 200)

    def test_games_filter(self):
        games = Game.objects.all()[0:10]
        for i in range(0, 3):
            GamePlatform.objects.create(game=games[i], platform_id=4)

        with self.settings(**haystack_test_config(self.id())):
            haystack_connections.reload('default')
            call_command('update_index', 'games.game', remove=True, verbosity=0)

            with self.assertNumQueries(4):
                response = self.client.get('/api/games', {'filter': 'true'})
            self.assertEqual(response.status_code, 200)

            with self.assertNumQueries(9):
                response = self.client.get('/api/games', {'platforms': 4, 'filter': 'true'})
            response_data_1 = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertIn('seo_title', response_data_1)
            self.assertIn('seo_description', response_data_1)
            self.assertIn('seo_h1', response_data_1)

            with self.assertNumQueries(10):
                response = self.client.get('/api/games', {'parent_platforms': 1, 'filter': 'true'})
            response_data_2 = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response_data_1['count'], response_data_2['count'])
            self.assertEqual(response_data_1['count'], 3)

            genre = Genre.objects.first()
            catalog_filter = CatalogFilter.objects.create(
                platform_id=4, genre=genre, year=2018,
                name='Test', title='Test', description='Test',
            )

            filter_by = {'platforms': '4,1', 'genres': genre.id, 'dates': '2018-01-01,2018-12-31', 'filter': 'true'}
            with self.assertNumQueries(6):
                response = self.client.get('/api/games', filter_by)
            response_data_3 = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response_data_3['seo_title'], catalog_filter.title)
            self.assertEqual(response_data_3['seo_description'], catalog_filter.description)
            self.assertEqual(response_data_3['seo_h1'], catalog_filter.name)

            filter_by['genres'] = genre.slug
            with self.assertNumQueries(6):
                response = self.client.get('/api/games', filter_by)
            response_data_4 = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response_data_4['seo_title'], catalog_filter.title)
            self.assertEqual(response_data_4['seo_description'], catalog_filter.description)
            self.assertEqual(response_data_4['seo_h1'], catalog_filter.name)

    def test_games_filter_persons(self):
        game = Game.objects.first()
        game.released = now()
        game.save(update_fields=['released'])
        person = Person.objects.create(name='Ben Harper')
        composer = Position.objects.create(name='Composer')
        programmer = Position.objects.create(name='Programmer')
        GamePerson.objects.create(game=game, person=person, position=composer)
        GamePerson.objects.create(game=game, person=person, position=programmer)

        with self.settings(**haystack_test_config(self.id())):
            haystack_connections.reload('default')
            call_command('update_index', 'games.game', remove=True, verbosity=0)

            with self.assertNumQueries(4):
                response = self.client.get('/api/games', {'creators': person.slug, 'filter': 'true'})
            response_data = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response_data['count'], 1)

            with self.assertNumQueries(4):
                response = self.client.get('/api/games', {'creators': person.id, 'filter': 'true'})
            response_data = response.json()
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response_data['count'], 1)
            self.assertTrue(response_data['filters']['years'])

    def test_games_game(self):
        with self.assertNumQueries(4):
            self.assertEqual(self.client.get('/api/games/not-found-game').status_code, 404)

        with self.assertNumQueries(2):
            self.assertEqual(self.client.get('/api/games/grand-theft-auto-san-andreas').status_code, 200)

        with self.assertNumQueries(2):
            self.assertEqual(self.client.get('/api/games/416').status_code, 200)

        with self.assertNumQueries(2):
            self.assertEqual(self.client.get('/api/games/{}'.format(self.game_num.slug)).status_code, 200)

        with self.assertNumQueries(2):
            self.assertEqual(self.client.get('/api/games/{}'.format(self.game_num.id)).status_code, 200)

    def test_games_game_auth(self):
        with self.assertNumQueries(8):
            self.user.settings = {'users_platforms': [1, 3, 4]}
            self.user.games_count = 3
            self.user.save(update_fields=['settings', 'games_count'])
            self.assertEqual(self.client_auth.get('/api/games/grand-theft-auto-san-andreas').status_code, 200)

    def test_games_moved_merged_games(self):
        game_one = Game.objects.get(name='Grand Theft Auto: San Andreas')
        game_one_slug = game_one.slug
        game_two = Game.objects.get(name='Grand Theft Auto: Vice City')
        game_two_slug = game_two.slug

        merge(game_one, game_two)

        response = self.client.get('/api/games/{}'.format(game_one_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])
        self.assertEqual(response_data['slug'], game_two_slug)

        response = self.client.get('/api/games/{}'.format(game_two_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertNotIn('redirect', response_data)

        game_two = Game.objects.get(slug=game_two_slug)
        game_three = Game.objects.get(name='Grand Theft Auto V')
        game_three_slug = game_three.slug

        merge(game_one, game_three)

        response = self.client.get('/api/games/{}'.format(game_one_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])

        response = self.client.get('/api/games/{}'.format(game_two_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['redirect'])

        response = self.client.get('/api/games/{}'.format(game_three_slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertNotIn('redirect', response_data)

    def test_games_game_screenshots(self):
        game = Game.objects.get(slug='grand-theft-auto-san-andreas')
        game.screenshots_count = 1
        game.save(update_fields=['screenshots_count'])
        ScreenShot.objects.create(game=game, source='https://google.com/search/image.jpg', is_external=True)

        with self.assertNumQueries(2):
            self.assertEqual(
                self.client.get(
                    '/api/games/grand-theft-auto-san-andreas/screenshots', HTTP_X_API_CLIENT='website'
                ).status_code,
                200
            )

        with self.assertNumQueries(2):
            self.assertEqual(
                self.client.get('/api/games/416/screenshots', HTTP_X_API_CLIENT='website').status_code,
                200
            )

        with self.assertNumQueries(1):
            self.assertEqual(
                self.client.get(
                    '/api/games/{}/screenshots'.format(self.game_num.id), HTTP_X_API_CLIENT='website'
                ).status_code,
                200
            )

        with self.assertNumQueries(1):
            self.assertEqual(
                self.client.get(
                    '/api/games/{}/screenshots'.format(self.game_num.slug), HTTP_X_API_CLIENT='website'
                ).status_code,
                200
            )

        game = Game.objects.get(slug='grand-theft-auto-san-andreas')
        ScreenShot.objects.create(
            game=game, source='https://google.com/search/another.jpg', is_external=True, hidden=True
        )

        with self.assertNumQueries(2):
            response = self.client.get(
                '/api/games/grand-theft-auto-san-andreas/screenshots', {'with_deleted': True},
                HTTP_X_API_CLIENT='website'
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['count'], 2)

        with self.assertNumQueries(2):
            response = self.client.get(
                '/api/games/416/screenshots', {'with_deleted': True},
                HTTP_X_API_CLIENT='website'
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()['count'], 2)

    def test_games_game_screenshots_screenshot(self):
        game = Game.objects.get(slug='grand-theft-auto-san-andreas')
        screen = ScreenShot.objects.create(game=game, source='https://google.com/search/image.jpg', is_external=True)

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.slug}/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 200)
            self.assertIn(screen.source, response.json()['image'])

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.id}/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 200)
            self.assertIn(screen.source, response.json()['image'])

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.slug}-404/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 404)

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.id}404/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 404)

        screen.hidden = True
        screen.save(update_fields=['hidden'])

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.slug}/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 404)

        with self.assertNumQueries(1):
            response = self.client.get(f'/api/games/{game.id}/screenshots/{screen.id}')
            self.assertEqual(response.status_code, 404)

    def test_games_game_movies(self):
        self.assertEqual(self.client.get('/api/games/grand-theft-auto-san-andreas/movies').status_code, 200)
        self.assertEqual(self.client.get('/api/games/416/movies').status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/movies'.format(self.game_num.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/movies'.format(self.game_num.slug)).status_code, 200)

    def test_games_game_movies_auth(self):
        with self.assertNumQueries(5):
            self.user.settings = {'users_platforms': [1, 3, 4]}
            self.user.games_count = 3
            self.user.save(update_fields=['settings', 'games_count'])
            self.assertEqual(self.client_auth.get('/api/games/grand-theft-auto-san-andreas/movies').status_code, 200)

    def test_games_game_suggested(self):
        self.assertEqual(self.client.get('/api/games/grand-theft-auto-san-andreas/suggested').status_code, 200)

    def test_games_game_suggested_auto(self):
        game = Game.objects.get(slug='grand-theft-auto-san-andreas')

        game.game_seo_fields_json = {'similar_games': games_auto_description(game)}
        game.last_modified_json = {'similar_games': now().strftime("%Y-%m-%dT%H:%M:%S")}
        game.save()

        response = self.client.get('/api/games/grand-theft-auto-san-andreas/suggested')

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['updated'])
        self.assertTrue(response.json()['seo_text'])

    def test_games_game_collections(self):
        collection = Collection.objects.create(name='My collection', creator=self.user, likes_users=1, likes_count=1)
        CollectionGame.objects.create(collection=collection, game=self.game_num)
        self.assertEqual(self.client.get('/api/games/grand-theft-auto-san-andreas/collections').status_code, 200)
        self.assertEqual(self.client.get('/api/games/416/collections').status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/collections'.format(self.game_num.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/collections'.format(self.game_num.slug)).status_code, 200)

    def test_games_game_achievements(self):
        network = Network.objects.create(name='Steam')
        parent = ParentAchievement.objects.create(name='Red Bullet', game=self.game_num)
        Achievement.objects.create(name='Red Bullet', parent=parent, network=network)
        self.assertEqual(self.client.get('/api/games/grand-theft-auto-san-andreas/achievements').status_code, 200)
        self.assertEqual(self.client.get('/api/games/416/achievements').status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/achievements'.format(self.game_num.id)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/achievements'.format(self.game_num.slug)).status_code, 200)

    def test_games_game_reviews_your(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        review = Review.objects.get_or_create(user=self.user, rating=ratings[1]['id'], game=self.game_num)[0]
        review.reactions.add(reactions[0]['id'])
        review.reactions.add(reactions[3]['id'])

        retrieve = self.client_auth.get('/api/games/{}/reviews'.format(self.game_num.slug)).json()
        self.assertIn('your', retrieve)

    def test_games_platforms(self):
        self.assertEqual(self.client.get('/api/games/filters/platforms').status_code, 200)
        self.assertEqual(self.client.get('/api/games/filters/platforms').json()['platforms'], [])
        platforms = Platform.objects.all()
        games = Game.objects.all()[0:3]
        ids = ','.join([str(g.id) for g in games])
        GamePlatform.objects.create(game=games[0], platform=platforms[0])
        GamePlatform.objects.create(game=games[0], platform=platforms[1])
        GamePlatform.objects.create(game=games[0], platform=platforms[2])
        GamePlatform.objects.create(game=games[1], platform=platforms[1])
        GamePlatform.objects.create(game=games[1], platform=platforms[2])
        GamePlatform.objects.create(game=games[2], platform=platforms[2])
        GamePlatform.objects.create(game=games[2], platform=platforms[3])
        get = self.client.get('/api/games/filters/platforms?games={}'.format(ids)).json()
        self.assertEqual(get['count'], 1)
        self.assertEqual(get['platforms'][0]['id'], platforms[2].id)

    def test_games_lists(self):
        self.assertEqual(self.client.get('/api/games/lists/promo-featured').status_code, 200)
        self.assertEqual(self.client.get('/api/games/lists/recent-games').status_code, 200)
        self.assertEqual(self.client.get('/api/games/lists/recent-games-past').status_code, 200)
        self.assertEqual(self.client.get('/api/games/lists/recent-games-future').status_code, 200)
        self.assertEqual(self.client.get('/api/games/lists/popular').status_code, 200)
        self.assertEqual(self.client.get('/api/games/lists/greatest').status_code, 200)

    def test_games_external(self):
        self.assertEqual(self.client.get('/api/games/{}/reddit'.format(self.game_num.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/twitch'.format(self.game_num.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/youtube'.format(self.game_num.slug)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/{}/imgur'.format(self.game_num.slug)).status_code, 200)

    def test_games_calendar(self):
        self.assertEqual(self.client.get('/api/games/calendar').status_code, 200)
        self.assertEqual(self.client.get('/api/games/calendar/2017/06').status_code, 200)
        self.assertEqual(self.client.get('/api/games/calendar/2017/6').status_code, 200)
        self.assertEqual(self.client.get('/api/games/calendar/platforms').status_code, 200)
        platform = Platform.objects.first().id
        self.assertEqual(self.client.get('/api/games/calendar?platform={}'.format(platform)).status_code, 200)
        self.assertEqual(self.client.get('/api/games/calendar/2017/6?platform={}'.format(platform)).status_code, 200)

    def test_games_sitemap(self):
        retrieve = self.client.get('/api/games/sitemap')
        self.assertEqual(retrieve.status_code, 404)

        retrieve = self.client.get('/api/games/sitemap', {'letter': 'g'})
        self.assertEqual(retrieve.status_code, 200)
        self.assertGreater(len(retrieve.json().get('results')), 0)

        retrieve = self.client.get("/api/games/sitemap", {'letter': '_'})
        self.assertEqual(retrieve.status_code, 200)

    def test_games_game_additions_list(self):
        game = Game.objects.create(name='GTA: San Andreas')
        game_two = Game.objects.create(name='GTA V')
        parent_game = Game.objects.create(name='GTA: Vice City', additions_count=2)
        Addition.objects.create(parent_game=parent_game, game=game)
        Addition.objects.create(parent_game=parent_game, game=game_two)

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/games/{parent_game.slug}/additions')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 2)

    def test_games_game_additions_create(self):
        game = Game.objects.create(name='GTA: San Andreas')
        parent_game = Game.objects.create(name='GTA: Vice City', additions_count=1)

        response = self.client_auth.post(
            f'/api/games/{parent_game.slug}/additions',
            {'game': game.id, 'link_type': 'dlc'}
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.get(f'/api/games/{parent_game.slug}/additions')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

    def test_games_game_additions_update(self):
        game = Game.objects.create(name='GTA: San Andreas')
        parent_game = Game.objects.create(name='GTA: Vice City')
        self.client_auth.post(
            f'/api/games/{parent_game.slug}/additions',
            {'game': game.id, 'link_type': 'dlc'}
        )

        response = self.client_auth.patch(
            f'/api/games/{parent_game.slug}/additions/{game.id}',
            data={'link_type': 'edition'},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['link_type'], 'edition')

    def test_games_game_additions_delete(self):
        game = Game.objects.create(name='GTA: San Andreas')
        parent_game = Game.objects.create(name='GTA: Vice City')
        self.client_auth.post(
            f'/api/games/{parent_game.slug}/additions',
            {'game': game.id, 'link_type': 'dlc'}
        )

        response = self.client_auth.delete(f'/api/games/{parent_game.slug}/additions/{game.id}')
        self.assertEqual(response.status_code, 403)

        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        response = self.client_auth.delete(f'/api/games/{parent_game.slug}/additions/{game.id}')
        self.assertEqual(response.status_code, 204)

    def test_games_game_parent_games_list(self):
        game = Game.objects.create(name='GTA: San Andreas', parents_count=2)
        parent_game = Game.objects.create(name='GTA: Vice City')
        parent_two = Game.objects.create(name='GTA V')
        Addition.objects.create(parent_game=parent_game, game=game)
        Addition.objects.create(parent_game=parent_two, game=game)

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/games/{game.slug}/parent-games')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 2)

    def test_games_game_game_series_list(self):
        game = Game.objects.create(name='GTA: San Andreas', game_series_count=1)
        two = Game.objects.create(name='GTA: Vice City', game_series_count=1)
        game.game_series.add(two)

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/games/{game.slug}/game-series')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/games/{two.slug}/game-series')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

    def test_game_iframe_url(self):
        game = Game.objects.create(name='Iframe game', iframe='https://some.link/here', can_play=True)
        app_id = str(game.pk)
        # Create an instance of a GET request.
        request = APIRequestFactory().get(f'/api/games/{app_id}')
        request.LANGUAGE_CODE = get_language()
        request.API_CLIENT_IS_WEBSITE = False
        request.API_GROUP = settings.API_GROUP_FREE
        request.user = AnonymousUser()
        middleware = SessionMiddleware()
        middleware.process_request(request)
        request.session.save(must_create=True)
        response = GameViewSet.as_view({'get': 'retrieve'})(request, pk=app_id)
        self.assertEqual(response.status_code, 200)
        params = dict(parse_qsl(urlparse(response.data['iframe_url'])[4]))
        player_data = PlayerGameSessionController().get_session(game=game, player=PlayerBase.from_request(request))
        self.assertEqual(params['player_id'], player_data.player.id.hex)
        self.assertEqual(params['game_sid'], player_data.game_sid)
        self.assertEqual(params['app_id'], app_id)

    def test_playable_game_meta(self):
        game = Game.objects.filter(can_play=True).last()
        headers = {'x-api-client': 'website'}
        query = {'lang': 'ru'}
        url = urlunparse(('', '', reverse('api:games-detail', kwargs={'pk': game.pk}), '', urlencode(query), ''))
        response = self.client.get(url, headers=headers)
        self.assertEqual(response.data['seo_title'], f'Игра {game.name} - играть онлайн бесплатно на AG.ru')
        self.assertEqual(
            response.data['seo_description'],
            f'Играть в браузерную игру {game.name} онлайн бесплатно и без регистрации на портале AG.ru. '
            f'Полная информация об игре, как играть, системные требования и отзывы игроков. '
            f'Играй в {game.name} прямо сейчас!'
        )
        self.assertIn('og_title', response.data)
        self.assertEqual(response.data['og_title'], game.name)
        self.assertIn('og_description', response.data)
        self.assertEqual(response.data['og_description'], game.description[:250])

    def test_not_playable_game_meta(self):
        game = Game.objects.filter(can_play=False).last()
        headers = {'x-api-client': 'website'}
        query = {'lang': 'ru'}
        url = urlunparse(('', '', reverse('api:games-detail', kwargs={'pk': game.pk}), '', urlencode(query), ''))
        response = self.client.get(url, headers=headers)
        self.assertEqual(
            response.data['seo_title'],
            f'{game.name} вся информация об игре, читы, дата выхода, системные требования, купить игру {game.name}'
        )
        platforms = ', '.join(platform['platform']['name'] for platform in game.platforms_json or [])
        self.assertEqual(
            response.data['seo_description'],
            f'Вся информация об игре {game.name}: дата выхода на {platforms} читы, патчи и дополнения, '
            f'рецензии, системные требования, видео, фото',
        )
        self.assertNotIn('og_title', response.data)
        self.assertNotIn('og_description', response.data)


class GamesTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def setUp(self):
        super().setUp()
        self.game_num, _ = Game.objects.get_or_create(name='1601')

    def test_games_game_create(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')

        with open(image, 'rb') as fp:
            request_data = {
                'name': 'Test Game TEST',
                'alternative_names': '["Testgame", "Test game"]',
                'description': 'blabla',
                'esrb_rating': 1,
                'platforms': [4],
                'genres': [2],
                'released': '2010-10-10',
                'tba': True,
                'developers': [6],
                'publishers': [187],
                'website': 'https://ag.ru/',
                'reddit_url': 'https://reddit.com/r/game',
                'metascore_url': 'http://www.metacritic.com/game/pc/grand-theft-auto-v',
                'image': fp,
            }

            content = encode_multipart('BOUNDARY', request_data)
            content_type = 'multipart/form-data; boundary=BOUNDARY'

            request = self.client.post(
                "/api/games",
                content,
                content_type=content_type,
            )

            self.assertEqual(request.status_code, 401)

            request = self.client_auth.post(
                "/api/games",
                content,
                content_type=content_type,
            )

            response = request.json()

            self.assertEqual(request.status_code, 201)

            self.assertEqual(response['platforms'][0]['id'], 4)
            self.assertTrue(response.get('id'))
            self.assertTrue(response['image'].endswith('.jpg'))
            self.assertEqual(response['tba'], True)
            self.assertEqual(response['released'], '1900-01-01')

    def test_games_game_update(self):
        modified_at = self.game_num.updated
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')

        with open(image, 'rb') as fp:
            request_data = {
                'esrb_rating': 4,
                'platforms': [9],
                'image': fp,
                'released': '2013-01-01',
                'tba': True
            }
            content = encode_multipart('BOUNDARY', request_data)
        content_type = 'multipart/form-data; boundary=BOUNDARY'
        request = self.client.patch(
            '/api/games/{}'.format(self.game_num.pk),
            content,
            content_type=content_type,
        )

        self.assertEqual(request.status_code, 401)

        request = self.client_auth.patch(
            '/api/games/{}'.format(self.game_num.pk),
            content,
            content_type=content_type,
        )
        response = request.json()

        self.assertEqual(request.status_code, 200)
        self.assertEqual(response['id'], self.game_num.pk)
        self.assertEqual(response['platforms'][0]['id'], 9)
        self.assertEqual(response['esrb_rating']['id'], 4)
        self.assertEqual(response['tba'], True)
        self.assertEqual(response['released'], '1900-01-01')
        self.assertGreater(Game.objects.get(id=response['id']).updated, modified_at)

    def test_games_game_update_description(self):
        modified_at = self.game_num.updated
        text = 'updated description'
        request = self.client_auth.patch(
            f'/api/games/{self.game_num.id}',
            {'description': text},
            content_type='application/json',
        )

        game = Game.objects.get(id=request.json()['id'])
        self.assertGreater(game.updated, modified_at)
        self.assertEqual(game.description_en, text)

    def test_games_game_screenshots(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')

        with open(image, 'rb') as fp:
            content = encode_multipart(
                'BOUNDARY',
                {
                    'image': fp,
                    'game_id': self.game_num.pk,
                },
            )
            content_type = 'multipart/form-data; boundary=BOUNDARY'

            modified_at = self.game_num.updated

            request = self.client_auth.post(
                '/api/games/{}/screenshots'.format(self.game_num.pk),
                content,
                content_type=content_type,
            )

            self.assertEqual(request.status_code, 201)

            response = request.json()

            screen_id = response['id']
            screenshot = ScreenShot.objects.get(id=screen_id)

            self.assertTrue(screenshot.created)
            self.assertTrue(ScreenShotCount.objects.get(game_id=screenshot.game_id).queued)

            self.assertGreater(screenshot.game.updated, modified_at)

            request = self.client_auth.patch(
                '/api/games/{}/screenshots/{}'.format(self.game_num.pk, screen_id),
                content,
                content_type=content_type,
            )

            self.assertEqual(request.status_code, 200)

            response = request.json()
            self.assertEqual(int(response['id']), int(screen_id))
            self.assertGreater(screenshot.game.updated, modified_at)

            request = self.client_auth.delete(
                '/api/games/{}/screenshots/{}'.format(self.game_num.pk, screen_id),
                content,
                content_type=content_type,
            )
            self.assertGreater(screenshot.game.updated, modified_at)

            self.assertEqual(request.status_code, 204)

    def test_games_game_stores(self):
        modified_at = self.game_num.updated
        post_data = {
            'store': 9,
            'url': r'https://evil.com\evil\@pukami.itch.io/kings-last-stand',
        }
        request = self.client_auth.post(
            '/api/games/{}/stores'.format(self.game_num.pk),
            post_data,
            content_type='application/json',
        )

        self.assertEqual(request.status_code, 400)
        post_data['url'] = 'https://indiecn.itch.io/weapon-shop-fantasy'

        request = self.client_auth.post(
            '/api/games/{}/stores'.format(self.game_num.pk),
            post_data,
            content_type='application/json',
        )

        self.assertEqual(request.status_code, 201)
        self.assertGreater(Game.objects.get(id=self.game_num.pk).updated, modified_at)

        response = request.json()
        store = response['id']

        request = self.client_auth.patch(
            '/api/games/{}/stores/{}'.format(self.game_num.pk, store),
            {
                'store': 5,
                'url': 'https://gog.com/game',
            },
            content_type='application/json',
        )

        self.assertEqual(request.status_code, 200)
        self.assertGreater(Game.objects.get(id=self.game_num.pk).updated, modified_at)

        response = request.json()
        self.assertEqual(int(response['store']['id']), 5)

        request = self.client_auth.delete(
            '/api/games/{}/stores/{}'.format(self.game_num.pk, store),
            content_type='application/json',
        )

        self.assertEqual(request.status_code, 403)

    def test_games_game_persons(self):
        modified_at = now()
        game = Game.objects.create(name='Jay-Jay', updated=modified_at)
        person_1 = Person.objects.create(name='Nick Cave', wikibase_id='Q1')
        person_2 = Person.objects.create(name='Warren Ellis', wikibase_id='Q2')
        position_1 = Position.objects.create(name='Composer', wikibase_id='P1')
        position_2 = Position.objects.create(name='Director', wikibase_id='P2')
        GamePerson.objects.create(game=game, person=person_1, position=position_1)

        response = self.client_auth.get(f'/api/games/{game.slug}/development-team')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['id'], person_1.id)
        self.assertGreater(Game.objects.get(id=game.pk).updated, modified_at)

        response = self.client_auth.post(
            f'/api/games/{game.pk}/development-team',
            {
                'person': person_2.id,
                'positions': [position_2.id],
            },
        )

        self.assertEqual(response.status_code, 201)
        data = self.client_auth.get(f'/api/games/{game.pk}/development-team').json()
        self.assertEqual(data['count'], 2)
        self.assertEqual(data['results'][1]['id'], person_2.id)
        self.assertGreater(Game.objects.get(id=game.pk).updated, modified_at)

        response = self.client_auth.post(
            f'/api/games/{game.pk}/development-team',
            {
                'person': person_2.id,
                'positions': [position_1.id],
            },
        )
        self.assertEqual(response.status_code, 201)

        response = self.client_auth.patch(
            f'/api/games/{game.slug}/development-team/{person_2.id}',
            {
                'positions': [position_2.id],
            },
            content_type='application/json',
        )

        self.assertEqual(response.status_code, 200)
        data = self.client_auth.get(f'/api/games/{game.pk}/development-team').json()
        self.assertEqual(data['count'], 2)
        check_person = None
        for row in data['results']:
            if row['id'] == person_2.id:
                check_person = row
                break
        self.assertEqual(len(check_person['positions']), 1)
        self.assertEqual(check_person['positions'][0]['id'], position_2.id)
        self.assertGreater(Game.objects.get(id=game.pk).updated, modified_at)

        response = self.client_auth.delete(f'/api/games/{game.pk}/development-team/{person_2.id}')

        self.assertEqual(response.status_code, 403)

        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        response = self.client_auth.delete(f'/api/games/{game.pk}/development-team/{person_2.id}')

        self.assertEqual(response.status_code, 204)
        data = self.client_auth.get(f'/api/games/{game.pk}/development-team').json()
        self.assertEqual(data['count'], 1)
        self.assertEqual(data['results'][0]['id'], person_1.id)
        self.assertGreater(Game.objects.get(id=game.pk).updated, modified_at)

    def test_games_game_game_series(self):
        game = Game.objects.create(name='GTA: San Andreas')
        game_another = Game.objects.create(name='GTA: Vice City')

        # post

        response = self.client_auth.post(
            f'/api/games/{game.slug}/game-series',
            {'game': game_another.id}
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.get(f'/api/games/{game.slug}/game-series')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['count'], 1)

        response = self.client_auth.post(
            f'/api/games/{game.slug}/game-series',
            {'game': game_another.id}
        )
        self.assertEqual(response.status_code, 201)

        # delete

        response = self.client_auth.delete(f'/api/games/{game.slug}/game-series/{game_another.id}')

        self.assertEqual(response.status_code, 403)

        self.user.is_staff = True
        self.user.save(update_fields=['is_staff'])
        response = self.client_auth.delete(f'/api/games/{game.slug}/game-series/{game_another.id}')

        self.assertEqual(response.status_code, 204)
        data = self.client_auth.get(f'/api/games/{game.id}/game-series').json()
        self.assertEqual(data['count'], 0)

    def test_games_game_ratings_and_reactions(self):
        game = Game.objects.first()
        # modified_at = game.updated
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']
        # 1
        review = Review.objects.get_or_create(user=self.user, rating=ratings[2]['id'], game=game, text='cool')[0]
        review.reactions.add(reactions[0]['id'])
        review.reactions.add(reactions[1]['id'])
        review.reactions.add(reactions[3]['id'])
        # 2
        review = Review.objects.get_or_create(user=self.user_1, rating=ratings[0]['id'], game=game, text='cool')[0]
        review.reactions.add(reactions[1]['id'])
        review.reactions.add(reactions[2]['id'])
        # 3
        Review.objects.get_or_create(user=self.user_2, rating=ratings[2]['id'], game=game)
        # 4
        Review.objects.get_or_create(user=self.user_3, rating=ratings[1]['id'], game=game)
        # 5
        Review.objects.get_or_create(user=self.user_4, rating=ratings[3]['id'], game=game)
        # 6
        Review.objects.get_or_create(user=self.user_5, rating=ratings[0]['id'], game=game)

        retrieve = self.client.get('/api/games/{}'.format(game.slug)).json()
        self.assertEqual(retrieve['ratings'][0]['count'], 2)
        self.assertEqual(retrieve['ratings'][1]['count'], 2)
        self.assertEqual(retrieve['ratings'][2]['count'], 1)
        self.assertEqual(retrieve['ratings'][3]['count'], 1)
        self.assertEqual(retrieve['rating'], 3.5)
        self.assertEqual(retrieve['rating_top'], 5)

        pk = Game.objects.exclude(id=game.id).first().id
        retrieve = self.client.get('/api/games/{}'.format(pk)).json()
        self.assertRaises(IndexError, lambda: retrieve['ratings'][0]['count'])
        self.assertRaises(IndexError, lambda: retrieve['ratings'][1]['count'])
        self.assertRaises(IndexError, lambda: retrieve['ratings'][2]['count'])
        self.assertRaises(IndexError, lambda: retrieve['ratings'][3]['count'])
        self.assertEqual(retrieve['rating'], 0)
        self.assertEqual(retrieve['rating_top'], 0)

    def test_games_game_reviews(self):
        modified_at = self.game_num.updated
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']

        review = Review.objects.get_or_create(
            user=self.user, rating=ratings[1]['id'],
            game=self.game_num, text='cool',
        )[0]
        review.reactions.add(reactions[0]['id'])
        review.reactions.add(reactions[3]['id'])
        review = Review.objects.get_or_create(
            user=self.user_1, rating=ratings[3]['id'],
            game=self.game_num, text='cool',
        )[0]
        review.reactions.add(reactions[1]['id'])
        review.reactions.add(reactions[2]['id'])

        with self.assertNumQueries(6):
            retrieve = self.client.get('/api/games/{}/reviews'.format(self.game_num.slug))
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(len(retrieve.json()['results'][0]['reactions']), 2)
        self.assertEqual(self.client.get('/api/games/{}/reviews'.format(self.game_num.id)).status_code, 200)
        self.assertNotIn('your', retrieve)

        retrieve = self.client.get('/api/games/{}'.format(self.game_num.slug)).json()
        self.assertEqual(retrieve['rating_top'], 0)
        self.assertGreater(Game.objects.get(id=self.game_num.pk).updated, modified_at)

    def test_games_game_reviews_following(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        reactions = self.client.get('/api/reviews/reactions').json()['results']

        review = Review.objects.get_or_create(
            user=self.user_1, rating=ratings[1]['id'],
            game=self.game_num, text='cool',
        )[0]
        review.reactions.add(reactions[0]['id'])
        review.reactions.add(reactions[3]['id'])
        review = Review.objects.get_or_create(
            user=self.user_2, rating=ratings[3]['id'],
            game=self.game_num, text='cool too',
        )[0]
        review.reactions.add(reactions[1]['id'])
        review.reactions.add(reactions[2]['id'])

        with self.assertNumQueries(11):
            retrieve = self.client_auth.get(f'/api/games/{self.game_num.slug}/reviews')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(retrieve.json()['results'][0]['user']['id'], self.user_2.id)

        with self.assertNumQueries(11):
            retrieve = self.client_auth.get(f'/api/games/{self.game_num.slug}/reviews', {'ordering': '-following'})
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(retrieve.json()['results'][0]['user']['id'], self.user_2.id)

        UserFollowElement.objects.create(
            user_id=self.user.id,
            content_type_id=ContentType.objects.get(app_label='users', model='user').id,
            object_id=self.user_1.id
        )
        with self.assertNumQueries(11):
            retrieve = self.client_auth.get(f'/api/games/{self.game_num.slug}/reviews', {'ordering': '-following'})
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(retrieve.json()['results'][0]['user']['id'], self.user_1.id)

    def test_games_game_reviews_rating_top(self):
        ratings = self.client.get('/api/reviews/ratings').json()['results']
        for i, rating in enumerate(ratings):
            for x in range(0, 6 if i == 1 else 5):
                user = get_user_model().objects.create(
                    username='review{}rating{}'.format(x, rating),
                    email='review{}rating{}@test.io'.format(x, rating),
                )
                Review.objects.create(user=user, rating=rating['id'], game=self.game_num)

        retrieve = self.client.get('/api/games/{}'.format(self.game_num.slug)).json()
        self.assertEqual(retrieve['rating_top'], ratings[1]['id'])

        reviews = Review.objects.all()[0:10]
        for review in reviews:
            review.delete()

        retrieve = self.client.get('/api/games/{}'.format(self.game_num.slug)).json()
        self.assertEqual(retrieve['rating_top'], 4)

    def test_games_game_discussions(self):
        Discussion.objects.create(
            user=self.user, game=self.game_num, title='cool english title', text='cool english text', language='eng',
        )
        Discussion.objects.create(
            user=self.user_1, game=self.game_num, title='cool english title', text='cool english text', language='eng',
        )

        retrieve = self.client.get(f'/api/games/{self.game_num.slug}/discussions')
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(self.client.get(f'/api/games/{self.game_num.id}/discussions').status_code, 200)

        retrieve = self.client.get(f'/api/games/{self.game_num.slug}').json()
        self.assertEqual(retrieve['discussions_count'], 2)

    def test_games_game_owned(self):
        UserGame.objects.get_or_create(user=self.user, game=self.game_num)
        UserGame.objects.get_or_create(user=self.user_1, game=self.game_num)

        retrieve = self.client.get('/api/games/{}/owned'.format(self.game_num.slug))
        self.assertEqual(retrieve.status_code, 200)
        self.assertEqual(retrieve.json()['count'], 2)
        self.assertEqual(len(retrieve.json()['users']), 2)
        self.assertFalse(retrieve.json()['friends'])

    def test_games_development_team(self):
        game_1 = Game.objects.create(name='Wind River')

        modified_at = game_1.updated

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

        self.assertGreater(Game.objects.get(id=game_1.id).updated, modified_at)

        with self.assertNumQueries(7):
            response = self.client.get('/api/games/{}/development-team'.format(game_1.slug))
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['games_count'], 3)
        self.assertEqual(response_data['results'][1]['games_count'], 2)
        self.assertEqual(len(response_data['results'][0]['games']), 3)
        self.assertEqual(len(response_data['results'][1]['games']), 2)
        self.assertEqual(len(response_data['results'][0]['positions']), 2)
        self.assertEqual(len(response_data['results'][1]['positions']), 1)
        slugs_0 = [el['slug'] for el in response_data['results'][0]['positions']]
        self.assertIn('composer', slugs_0)
        self.assertIn('director', slugs_0)
        slugs_1 = [el['slug'] for el in response_data['results'][1]['positions']]
        self.assertIn('composer', slugs_1)

        GamePerson.objects.filter(game=game_2, person=person_1, position=position_2).delete()

        with self.assertNumQueries(7):
            response_data = self.client.get('/api/games/{}/development-team'.format(game_1.slug)).json()
        self.assertEqual(response_data['results'][0]['games_count'], 2)
        self.assertEqual(response_data['results'][1]['games_count'], 2)
        self.assertEqual(len(response_data['results'][0]['games']), 2)
        self.assertEqual(len(response_data['results'][1]['games']), 2)

        GamePerson.objects.filter(game=game_1, person=person_1, position=position_2).delete()

        with self.assertNumQueries(7):
            response_data = self.client.get('/api/games/{}/development-team'.format(game_1.slug)).json()
        self.assertEqual(len(response_data['results'][0]['positions']), 1)
        self.assertEqual(len(response_data['results'][1]['positions']), 1)
        slugs_0 = [el['slug'] for el in response_data['results'][0]['positions']]
        self.assertIn('composer', slugs_0)
        slugs_1 = [el['slug'] for el in response_data['results'][1]['positions']]
        self.assertIn('composer', slugs_1)

    def test_games_lists_main_games(self):
        game_2 = Game.objects.create(name='Bad Seeds', released=now())
        game_3 = Game.objects.create(name='Bad Seeds 2', released=now())
        game_1 = Game.objects.create(
            name='Wind River',
            released=(now() - timedelta(days=85)),
            suggestions={'games': [game_2.id, game_3.id]},
            added=5,
        )
        GamePlatform.objects.create(game=game_1, platform_id=1)

        user_visitor = get_user_model().objects.create(
            username='alex2',
            email='alex2@test.io',
            last_visited_games_ids=[game_1.id, game_2.id]
        )
        token_visitor = Token.objects.get_or_create(user=user_visitor)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest', 'HTTP_TOKEN': 'Token {}'.format(token_visitor)}
        client_auth_visitor = Client(**kwargs)

        for game in [game_2, game_3, game_1]:
            UserRecommendation.objects.create(
                position=1, sources=[UserRecommendation.SOURCES_COLLABORATIVE], game=game, user=user_visitor
            )

        response = self.client.get('/api/games/lists/main')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game_1.id)

        with self.assertNumQueries(7):
            response = client_auth_visitor.get('/api/games/lists/main')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn(game_2.id, [item['id'] for item in response_data['results']])
        self.assertIn('playtime', response_data['results'][0])

        with self.assertNumQueries(8):
            response = client_auth_visitor.get('/api/games/lists/main', {'platforms': 1})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(8):
            response = client_auth_visitor.get('/api/games/lists/main', {'parent_platforms': 3})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_games_lists_recent_games(self):
        game_1 = Game.objects.create(name='Wind River', released=now())
        game_2 = Game.objects.create(name='Bad Seeds', released=now())
        UserGame.objects.create(game=game_1, user=self.user_1, status=UserGame.STATUS_PLAYING)
        UserGame.objects.create(game=game_2, user=self.user_1, status=UserGame.STATUS_PLAYING)
        UserGame.objects.create(game=game_2, user=self.user_2, status=UserGame.STATUS_PLAYING)
        GamePlatform.objects.create(game=game_1, platform_id=1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game_2.id)
        self.assertEqual(response_data['results'][0]['users']['count'], 0)
        self.assertEqual(len(response_data['results'][0]['users']['results']), 2)
        self.assertEqual(response_data['results'][0]['users']['results'][0]['username'], 'warren')
        self.assertEqual(response_data['results'][0]['users']['results'][1]['username'], 'nick')
        self.assertEqual(response_data['results'][1]['id'], game_1.id)
        self.assertEqual(response_data['results'][1]['users']['count'], 0)
        self.assertEqual(len(response_data['results'][1]['users']['results']), 1)
        self.assertIn('playtime', response_data['results'][0])

        for x in range(0, 6):
            user = get_user_model().objects.create(username='user{}'.format(x), email='user{}@test.io'.format(x))
            UserGame.objects.create(game=game_1, user=user, status=UserGame.STATUS_PLAYING)

        response_data = self.client.get('/api/games/lists/recent-games').json()
        self.assertEqual(response_data['results'][0]['id'], game_1.id)
        self.assertEqual(response_data['results'][0]['users']['count'], 2)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games', {'platforms': 1})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games', {'parent_platforms': 3})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_games_lists_recent_games_future(self):
        game_1 = Game.objects.create(name='Wind River', released=monday(now()) + timedelta(days=9))
        game_2 = Game.objects.create(name='Bad Seeds', released=monday(now()) + timedelta(days=9))
        UserGame.objects.create(game=game_1, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_2, status=UserGame.STATUS_TOPLAY)
        GamePlatform.objects.create(game=game_1, platform_id=1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-future')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game_2.id)
        self.assertEqual(response_data['results'][1]['id'], game_1.id)
        self.assertIn('playtime', response_data['results'][0])

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-future', {'platforms': 1})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-future', {'parent_platforms': 3})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_games_lists_recent_games_past(self):
        game_1 = Game.objects.create(name='Wind River', released=monday(now()) - timedelta(days=9))
        game_2 = Game.objects.create(name='Bad Seeds', released=monday(now()) - timedelta(days=9))
        UserGame.objects.create(game=game_1, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_2, status=UserGame.STATUS_TOPLAY)
        GamePlatform.objects.create(game=game_1, platform_id=1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-past')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game_2.id)
        self.assertEqual(response_data['results'][1]['id'], game_1.id)
        self.assertIn('playtime', response_data['results'][0])

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-past', {'platforms': 1})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(3):
            response = self.client.get('/api/games/lists/recent-games-past', {'parent_platforms': 3})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_games_lists_greatest(self):
        game_1 = Game.objects.create(name='Wind River', released=now())
        game_2 = Game.objects.create(name='Bad Seeds', released=now())
        UserGame.objects.create(game=game_1, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_1, status=UserGame.STATUS_TOPLAY)
        UserGame.objects.create(game=game_2, user=self.user_2, status=UserGame.STATUS_TOPLAY)
        GamePlatform.objects.create(game=game_1, platform_id=1)

        with self.assertNumQueries(1):
            response = self.client.get('/api/games/lists/greatest')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game_2.id)
        self.assertEqual(response_data['results'][1]['id'], game_1.id)
        self.assertIn('playtime', response_data['results'][0])

        with self.assertNumQueries(2):
            response = self.client.get(
                '/api/games/lists/greatest',
                {'page_size': 10, 'year': now().year}
            )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 2)

        with self.assertNumQueries(2):
            response = self.client.get(
                '/api/games/lists/greatest',
                {'platforms': 1, 'page_size': 10, 'year': now().year}
            )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(2):
            response = self.client.get(
                '/api/games/lists/greatest',
                {'parent_platforms': 3, 'page_size': 10, 'year': now().year}
            )
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_games_lists_popular(self):
        game_1 = Game.objects.create(name='Wind River')
        Game.objects.create(name='Bad Seeds')
        GamePlatform.objects.create(game=game_1, platform_id=1)

        with self.assertNumQueries(2):
            response = self.client.get('/api/games/lists/popular')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 17)

        with self.assertNumQueries(2):
            response = self.client.get('/api/games/lists/popular', {'platforms': 1})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

        with self.assertNumQueries(2):
            response = self.client.get('/api/games/lists/popular', {'parent_platforms': 3})
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['count'], 1)

    def test_game_tags_list(self):
        game = Game.objects.get(slug='grand-theft-auto-vice-city')
        game_tags = sorted(x.id for x in game.tags.visible())
        response = self.client.get('/api/games/{}'.format(game.slug))
        self.assertEqual(response.status_code, 200)
        response_tags = sorted(x['id'] for x in response.json()['tags'])
        self.assertIn('tags', response.json().keys())
        self.assertEqual(response_tags, game_tags)

    def test_game_tags_change(self):
        kwargs = {'HTTP_TOKEN': 'Token {}'.format(self.token)}
        self.client_auth = Client(**kwargs)

        tag_update_url = '/api/games/{}'
        tag = Tag.objects.create(name='Tag 1')

        game = Game.objects.get(slug='grand-theft-auto-vice-city')

        response = self.client_auth.patch(
            tag_update_url.format(game.slug),
            data={'tags': [tag.name, '#myveryuniquetag', None]},
            content_type='application/json',
        )
        updated_tag_names = [field['name'] for field in response.json()['tags']]
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            set(game.tags.values_list('name', flat=True)),
            set(updated_tag_names)
        )

        response = self.client_auth.patch(
            tag_update_url.format(game.slug),
            data={'tags': []},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['tags']), 0)

    def test_games_game_store_url(self):
        game = Game.objects.get(slug='grand-theft-auto-vice-city')
        store = Store.objects.create(name='Steam')
        game_store = GameStore.objects.create(store=store, game=game)
        response_data = self.client.get('/api/games/{}'.format(game.slug)).json()
        self.assertEqual(response_data['stores'][0]['url'], '')

        game_store.url = 'https://ag.ru/'
        game_store.save(update_fields=['url', 'url_en'])

        response_data = self.client.get('/api/games/{}'.format(game.slug)).json()
        self.assertEqual(response_data['stores'][0]['url'], game_store.url)

    def test_games_game_achievements_field_change(self):
        modified_at = self.game_num.updated

        network = Network.objects.create(name='Steam')
        parent = ParentAchievement.objects.create(name='Red Bullet', game=self.game_num)
        Achievement.objects.create(name='Red Bullet', parent=parent, network=network)

        self.assertGreater(Game.objects.get(id=self.game_num.id).updated, modified_at)


class FeaturedTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.games = Game.objects.all()[:10]
        Featured.objects.bulk_create(
            [
                Featured(
                    game=game,
                    description=f'desc {idx}',
                    image=f'https://cdn.ag.ru/somepath/image_{idx}.jpg',
                    image_mobile=f'https://cdn.ag.ru/somepath/image_mobile_{idx}.jpg'
                )
                for idx, game in enumerate(self.games)
            ]
        )
        self.featured = Featured.objects.all()
        self.url = reverse('api:featured')

    def test_games_lists_featured(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), len(self.games))
        for instance, featured_data in zip(self.featured, response.data):
            self.assertEqual(
                featured_data,
                {
                    'description': instance.description,
                    'image': instance.image.url,
                    'image_mobile': instance.image_mobile.url,
                    'name': instance.game.name,
                    'slug': instance.game.slug
                }
            )


class RecommendedTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.games = Game.objects.all()[:10]
        Recommended.objects.bulk_create([Recommended(game=game) for game in self.games])
        self.recommended = Recommended.objects.all()
        self.url = reverse('api:recommended')

    def test_games_lists_recommended(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), len(self.games))
        for instance, recommended_data in zip(self.recommended, response.data):
            valid_data = {
                'name': instance.game.name,
                'image': instance.game.image.url if instance.game.image else None,
                'slug': instance.game.slug,
            }
            self.assertEqual(recommended_data, valid_data)


class LastPlayedTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.history_size = apps.get_app_config('games').PLAYED_HISTORY_SIZE
        self.games = []
        for i in range(self.history_size + 2):
            self.games.append(
                Game.objects.create(name=f'Game_{i}', can_play=True, iframe=f'https://testurl_{i}.ru/path')
            )
        self.user_1 = get_user_model().objects.create_user(email='user_1@test.com', username='user_1', password='123')
        self.url = reverse('api:last_played')
        shuffle(self.games)

    def test_auth(self):
        self.client.login(username=self.user_1.username, password='123')
        for game in self.games:
            self.client.get(reverse('api:games-detail', kwargs={'pk': game.pk}))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.history_size, len(response.data))
        for instance, played_data in zip(self.games[-1:self.history_size-1:-1], response.data):
            self.assertEqual(played_data, {'image': instance.image, 'name': instance.name, 'slug': instance.slug})

    def test_guest(self):
        for game in self.games:
            self.client.get(reverse('api:games-detail', kwargs={'pk': game.pk}))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.history_size, len(response.data))
        for instance, played_data in zip(self.games[-1:self.history_size - 1:-1], response.data):
            self.assertEqual(played_data, {'image': instance.image, 'name': instance.name, 'slug': instance.slug})


class PlaysTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.user = get_user_model().objects.create_user(email='user_1@test.com', username='user_1', password='123')
        self.game = Game.objects.playable()[0]
        self.increment_plays_url = reverse('api:game_plays', kwargs={'game_id': self.game.pk})
        self.get_game_url = reverse('api:games-detail', kwargs={'pk': self.game.pk})

    def test_unauth(self):
        plays = self.game.plays
        for i in range(10):
            response = self.client.post(self.increment_plays_url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.game.refresh_from_db()
        self.assertEqual(self.game.plays, plays + 10)

    def test_auth(self):
        plays = self.game.plays
        self.client.login(username=self.user.username, password='123')
        for i in range(10):
            response = self.client.post(self.increment_plays_url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.game.refresh_from_db()
        self.assertEqual(self.game.plays, plays + 10)

    def test_unknown_game(self):
        pk = Game.objects.order_by('id').values_list('id', flat=True).last() + 1000
        url = reverse('api:game_plays', kwargs={'game_id': pk})
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
