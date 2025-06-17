import io
import os
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.exceptions import ObjectDoesNotExist
from django.test import RequestFactory, TestCase, TransactionTestCase
from django.utils import timezone
from redis import Redis
from rest_framework.reverse import reverse

from apps.games.models import Game, Platform, Tag, generate_game_sid
from apps.users.models import AuthenticatedPlayer, PlayerBase
from apps.utils.game_session import CommonPlayerGameSessionData, DatabaseStorage, PlayerGameSessionController, \
    RedisStorage
from apps.utils.images import DEFAULT_COLOR, calculate_dominant_color, calculate_saturated_color
from apps.utils.strings import get_int_from_string_or_none, keep_tags, markdown
from apps.utils.tasks import merge_items


class ImagesTestCase(TestCase):
    image = 'http://cdn.akamai.steamstatic.com/steam/apps/460930/' \
            'ss_20026b1cb7992b4f465433310300bed3d21a132b.1920x1080.jpg?t=1476987181'

    @patch('apps.utils.images.get_url')
    def test_calculate_dominant_color(self, get_url_mock):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        with open(image, 'rb') as f:
            get_url_mock.return_value = io.BytesIO(f.read())
        self.assertEqual(calculate_dominant_color(self.image, True), '8992a7')

    @patch('apps.utils.images.get_url')
    def test_calculate_dominant_color_error(self, get_url_mock):
        get_url_mock.side_effect = Exception
        self.assertEqual(calculate_dominant_color(self.image, True), DEFAULT_COLOR)

    def test_calculate_dominant_color_local(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        self.assertEqual(calculate_dominant_color(image), '8992a7')

    @patch('apps.utils.images.get_url')
    def test_calculate_saturated_color(self, get_url_mock):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        with open(image, 'rb') as f:
            get_url_mock.return_value = io.BytesIO(f.read())
        self.assertEqual(calculate_saturated_color(self.image, True), '4494ac')

    @patch('apps.utils.images.get_url')
    def test_calculate_saturated_color_error(self, get_url_mock):
        get_url_mock.side_effect = Exception
        self.assertEqual(calculate_saturated_color(self.image, True), DEFAULT_COLOR)

    def test_calculate_saturated_color_local(self):
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        self.assertEqual(calculate_saturated_color(image), '4494ac')


class FieldsAutoSlugTestCase(TestCase):
    def test_slug(self):
        platform = Platform.objects.create(name='123456')
        self.assertNotEqual(platform.slug, '123456')
        self.assertEqual(platform.slug, 'platform')

        platform = Platform.objects.create(name='123456')
        self.assertNotEqual(platform.slug, '123456')
        self.assertEqual(platform.slug, 'platform-2')

        platform = Platform.objects.create(name='platform-2')
        self.assertEqual(platform.slug, 'platform-2-2')


class StringsTestCase(TestCase):
    def test_keep_tags(self):
        text = '<p>My text</p><img src="http://google.com/image.png"><ul><li>yes</li></ul>'
        result = '<p>My text</p><ul><li>yes</li></ul>'
        self.assertEqual(keep_tags(text), result)

    def test_keep_tags_p(self):
        text = '<p>My text</p><p>My text</p>'
        self.assertEqual(keep_tags(text), text)

    def test_keep_tags_no_tags(self):
        text = 'My text'
        self.assertEqual(keep_tags(text), text)

    def test_markdown(self):
        text = '[hi](http://google.com)\n\n123\n\n234'
        result = '<p><a href="http://google.com">hi</a></p>\n<p>123</p>\n<p>234</p>'
        self.assertEqual(markdown(text), result)

        text = '[hi](http://google.com)\n123\n234'
        result = '<p><a href="http://google.com">hi</a><br />\n123<br />\n234</p>'
        self.assertEqual(markdown(text), result)

        text = '[hi](http://google.com)\n123\n234\n\n<script="alert(123);"></script>'
        result = '<p><a href="http://google.com">hi</a><br />\n123<br />\n234</p>\n' \
                 '<p>&lt;script=&quot;alert(123);&quot;&gt;&lt;/script&gt;</p>'
        self.assertEqual(markdown(text), result)

    def test_get_int_from_string_or_none(self):
        input_ = '1234abcdefg'
        output = 1234
        self.assertEqual(get_int_from_string_or_none(input_), output)


class TasksTestCase(TransactionTestCase):
    def test_merge_items(self):
        game1 = Game.objects.create(name='Tom Yorke')
        game2 = Game.objects.create(name='Radiohead')
        tag1 = Tag.objects.create(name='Electronic')
        tag2 = Tag.objects.create(name='Experimental')
        tag3 = Tag.objects.create(name='Rock')

        game1.tags.add(tag1)
        game2.tags.add(tag2)
        game2.tags.add(tag3)

        merge_items(tag3.id, [tag2.id, tag1.id], Tag._meta.app_label, Tag._meta.model_name)

        self.assertEqual(list(game1.tags.values_list('id', flat=True)), [tag3.id])
        self.assertEqual(list(game2.tags.values_list('id', flat=True)), [tag3.id])


class BasePlayerGameStorageTestCaseMixin(object):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.game_1, self.game_2 = Game.objects.order_by('pk')[0:2]
        self.game_1.can_play = self.game_2.can_play = True
        self.game_1.iframe = 'https://www.test.org/path/to?arg1=1&arg2=2'
        self.game_2.iframe = 'https://another.ru/path'
        self.game_1.save()
        self.game_2.save()

        factory = RequestFactory()
        self.request = factory.get(reverse('api:games-detail', kwargs={'pk': self.game_1.pk}))
        middleware = SessionMiddleware()
        middleware.process_request(self.request)
        self.request.session.save(must_create=True)

    def test_delete_all(self):
        self.storage.create(self.game_1, self.player)
        self.storage.delete_all(self.player)
        self.assertEqual(len(list(self.storage.all(self.player))), 0)
        self.storage.delete_all(self.player)
        self.assertEqual(len(list(self.storage.all(self.player))), 0)

    def test_delete(self):
        self.storage.create(self.game_1, self.player)
        self.storage.create(self.game_2, self.player)

        self.storage.delete(self.game_1, self.player)
        self.assertEqual(len(list(self.storage.all(self.player))), 1)
        self.storage.delete(self.game_2, self.player)
        self.storage.delete(self.game_2, self.player)
        self.assertEqual(len(list(self.storage.all(self.player))), 0)

    def test_create_many(self):
        sids = [generate_game_sid() for i in range(3)]
        sessions_data = [
            CommonPlayerGameSessionData(game=game, player=self.player, game_sid=sid, created=timezone.now())
            for game, sid in zip((self.game_1, self.game_2, self.game_2), sids)
        ]
        self.storage.create_many(self.player, sessions_data)
        all_sessions = sorted(self.storage.all(self.player), key=lambda x: x.game.pk)
        self.assertEqual(len(all_sessions), 2)
        self.assertEqual(len(list(filter(lambda x: x.game.pk == self.game_2.pk, all_sessions))), 1)
        for session, sid, game in zip(all_sessions, sids, (self.game_1, self.game_2)):
            self.assertEqual(session.game.pk , game.pk)
            self.assertEqual(session.game_sid, sid)

    def test_create_many_empty_data(self):
        self.storage.create_many(self.player, [])
        self.assertEqual(len(list(self.storage.all(self.player))), 0)

    def test_get(self):
        created = self.storage.create(self.game_1, self.player)
        game_session = self.storage.get(self.game_1, self.player)
        self.assertEqual(game_session.game.pk, created.game.pk)
        self.assertEqual(game_session.player.id, created.player.id)
        self.assertEqual(game_session.game_sid, created.game_sid)
        self.assertEqual(game_session.created, created.created)

    def test_get_not_created(self):
        with self.assertRaises(ObjectDoesNotExist):
            self.storage.get(self.game_1, self.player)
            self.storage.get(self.game_2, self.player)

    def test_create(self):
        created_session = self.storage.create(self.game_1, self.player)
        session = self.storage.get(self.game_1, self.player)
        self.assertEqual(created_session.game.pk, session.game.pk)
        self.assertEqual(created_session.player.id, session.player.id)
        self.assertEqual(created_session.game_sid, session.game_sid)
        self.assertEqual(created_session.created, session.created)

    def test_create_duplicates(self):
        self.storage.create(self.game_1, self.player)
        self.storage.create(self.game_1, self.player)
        self.storage.create(self.game_1, self.player)
        all_session = list(self.storage.all(self.player))
        self.assertEqual(len(all_session), 1)

    def test_all(self):
        created_sessions = [self.storage.create(game, self.player) for game in (self.game_1, self.game_2)]
        games_sessions = sorted(self.storage.all(self.player), key=lambda x: x.game.pk)
        for game_session, created in zip(games_sessions, created_sessions):
            self.assertEqual(game_session.game.pk, created.game.pk)
            self.assertEqual(game_session.player.id, created.player.id)
            self.assertEqual(game_session.game_sid, created.game_sid)
            self.assertEqual(game_session.created, created.created)


class PlayerGamePostgresStorageTestCase(BasePlayerGameStorageTestCaseMixin, TestCase):
    def setUp(self) -> None:
        super(PlayerGamePostgresStorageTestCase, self).setUp()
        self.user = get_user_model().objects.create(username='user1', email='user1@test.com')
        self.request.user = self.user
        self.player = AuthenticatedPlayer(self.user)
        self.storage = DatabaseStorage()


class PlayerGameRedisStorageTestCase(BasePlayerGameStorageTestCaseMixin, TestCase):
    def setUp(self) -> None:
        super(PlayerGameRedisStorageTestCase, self).setUp()
        self.request.user = AnonymousUser()
        self.player = PlayerBase.from_request(self.request)
        self.redis_client = Redis.from_url(settings.REDIS_LOCATION)
        self.storage = RedisStorage(redis_client=self.redis_client)

    def tearDown(self) -> None:
        self.redis_client.flushdb(asynchronous=True)

    def test_create_many(self):
        with self.assertRaises(NotImplementedError):
            super(PlayerGameRedisStorageTestCase, self).test_create_many()

    def test_create_many_empty_data(self):
        with self.assertRaises(NotImplementedError):
            super(PlayerGameRedisStorageTestCase, self).test_create_many_empty_data()


class PlayerGameControllerTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self) -> None:
        self.game_1, self.game_2 = Game.objects.order_by('pk')[0:2]
        self.game_1.can_play = self.game_2.can_play = True
        self.game_1.iframe = 'https://www.test.org/path/to?arg1=1&arg2=2'
        self.game_2.iframe = 'https://another.ru/path'
        self.game_1.save()
        self.game_2.save()

        self.user = get_user_model().objects.create(username='user1', email='user1@test.com')
        self.player = AuthenticatedPlayer(self.user)

        self.controller = PlayerGameSessionController()

    def tearDown(self) -> None:
        redis_client = Redis.from_url(settings.REDIS_LOCATION)
        redis_client.flushdb(asynchronous=True)

    def test_get_game_player_data(self):
        data = self.controller.get_session(self.game_1, self.player)
        self.assertEqual(self.game_1.pk, data.game.pk)
        self.assertEqual(self.player.id, data.player.id)

    def test_get_all_player_data(self):
        created_sessions = [
            self.controller.get_session(game, self.player) for game in (self.game_1, self.game_2)
        ]
        sessions = self.controller.get_all_sessions(self.player)
        sessions.sort(key=lambda x: x.game.pk)

        for session, created_session, game in zip(sessions, created_sessions, (self.game_1, self.game_2)):
            self.assertEqual(game.pk, session.game.pk)
            self.assertEqual(self.player.id, session.player.id)
            self.assertEqual(created_session.game_sid, session.game_sid)
            self.assertEqual(created_session.created, session.created)

    def test_copy_between(self):
        factory = RequestFactory()
        request = factory.get(reverse('api:games-detail', kwargs={'pk': self.game_1.pk}))
        middleware = SessionMiddleware()
        middleware.process_request(request)
        request.session.save(must_create=True)
        request.user = AnonymousUser()
        source_player = PlayerBase.from_request(request)
        source_data = self.controller.get_session(self.game_1, source_player)

        self.controller.copy_between_players(source_player, self.player, clear_source=True)
        destination_player_data = self.controller.get_all_sessions(self.player)

        for data in destination_player_data:
            self.assertEqual(data.game.pk, source_data.game.pk)
            self.assertEqual(data.game_sid, source_data.game_sid)
        self.assertEqual(len(self.controller.get_all_sessions(source_player)), 0)
