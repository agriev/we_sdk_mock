import io
import os
import secrets

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status

from apps.games.apps import GamesConfig
from apps.games.models import Game, PlayerGameSession, PlayerGameSessionData
from apps.users.models import AuthenticatedPlayer
from apps.utils.game_session import PlayerGameSessionController
from apps.utils.tests import APITestCase


class UserGameSessionTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers', 'games_publishers',
        'games_genres', 'games_tags', 'games_games',
    ]

    def make_file(self, size, name, mime_type):
        buffer = io.BytesIO(secrets.token_bytes(size))
        file = SimpleUploadedFile(name=name, content=buffer.getvalue(), content_type=mime_type)
        file.seek(0)
        return file

    @classmethod
    def setUpTestData(cls):
        cls.game = Game.objects.filter(can_play=True).first()
        cls.user = get_user_model().objects.create_user(email='test@test.com', username='test_username', password='123')

    def setUp(self) -> None:
        self.game_session = PlayerGameSession(game=self.game, player_id=self.user.player_id)
        self.game_session.save()
        self.file = self.make_file(30000, 'test.bin', 'application/octet-stream')
        self.game_session_data = PlayerGameSessionData(session=self.game_session)
        self.game_session_data.data.save('test.bin', self.file)
        self.file.seek(0)
        self.game_session_data.save()
        controller = PlayerGameSessionController()
        self.auth_key = controller.make_auth_key(controller.get_session(self.game, AuthenticatedPlayer(self.user)))
        self.url = reverse('api:gamesessiondata', kwargs={'game_sid': self.game_session.game_sid})
        self.write_url = f'{self.url}?app_id={self.game.pk}&auth_key={self.auth_key}'
        self.client.login(username=self.user.username, password='123')

    def test_session_data_retrieve(self):
        response = self.client.get(self.url, {'auth_key': self.auth_key, 'app_id': self.game.pk})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.has_header('X-Accel-Redirect'))
        self.assertEqual(
            response['X-Accel-Redirect'],
            os.path.join(settings.XSENDFILE_NGINX_PREFIX, self.game_session_data.data.name)
        )
        # TODO: configure nginx in docker
        # self.assertEqual(self.game_session_data.data.read(), response.data)

    def test_session_data_put(self):
        another_file = self.make_file(15000, 'test.bin', 'application/octet-stream')
        response = self.client.put(self.write_url, another_file.read(), format='bin')
        self.game_session_data.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        another_file.seek(0)
        path = self.game_session_data.data.path
        self.assertEqual(default_storage.open(path, 'rb').read(), another_file.read())

    def test_session_data_put_as_create(self):
        self.game_session_data.delete()
        response = self.client.put(self.write_url, self.file.read(), format='bin')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.file.seek(0)
        path = self.game_session.data.data.path
        self.assertEqual(default_storage.open(path, 'rb').read(), self.file.read())

    def test_invalid_app_id_retrieve(self):
        another_game = Game.objects.filter(can_play=False).first()
        response = self.client.get(self.url, {'auth_key': self.auth_key, 'app_id': another_game.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_app_id_put(self):
        another_game = Game.objects.filter(can_play=False).first()
        url = f'{self.url}?app_id={another_game.pk}&auth_key={self.auth_key}'
        response = self.client.put(url, self.file.read(), format='bin')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            PlayerGameSessionData.objects.get(session=self.game_session).created, self.game_session_data.created
        )

    def test_invalid_auth_key(self):
        response = self.client.get(self.url, {'auth_key': self.auth_key + '42', 'app_id': self.game.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_not_playable_game(self):
        game = Game.objects.filter(can_play=False).first()
        game_session = PlayerGameSession(game=game, player_id=self.user.player_id)
        game_session.save()
        controller = PlayerGameSessionController()
        auth_key = controller.make_auth_key(controller.get_session(game, AuthenticatedPlayer(self.user)))
        response = self.client.get(self.url, {'auth_key': auth_key, 'app_id': game.pk})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_unauth_session_data_retrieve(self):
        self.client.logout()
        response = self.client.get(self.url, {'auth_key': self.auth_key, 'app_id': self.game.pk})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauth_session_data_put(self):
        self.client.logout()
        response = self.client.put(self.write_url, self.file.read(), format='bin')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(
            PlayerGameSessionData.objects.get(session=self.game_session).created, self.game_session_data.created
        )

    def test_too_big_file(self):
        file = self.make_file(GamesConfig.SESSIONS_DATA_SIZE * 2, 'test.bin', 'application/octet-stream')
        response = self.client.put(self.write_url, file.read(), format='bin')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            PlayerGameSessionData.objects.get(session=self.game_session).created, self.game_session_data.created
        )
