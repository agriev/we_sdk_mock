from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.authtoken.models import Token

from apps.utils.tests import APITestCase


class GamesBaseTestCase(APITestCase):
    fixtures = [
        'common_lists', 'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games', 'games_esrbratings',
        'reviews_reactions',
    ]

    def setUp(self):
        self.user = get_user_model().objects.create_user(username='curt', email='curt@test.io', password='test_pass_1')
        EmailAddress(user=self.user, verified=True, primary=True)
        self.user_1 = get_user_model().objects.create_user(username='nick', email='nick@test.io')
        self.user_2 = get_user_model().objects.create_user(username='warren', email='warren@test.io')
        self.user_3 = get_user_model().objects.create_user(username='damien', email='damien@test.io')
        self.user_4 = get_user_model().objects.create_user(username='gem_club', email='gemclub@test.io')
        self.user_5 = get_user_model().objects.create_user(username='yusuf', email='yusuf@test.io')
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest', 'HTTP_X_API_CLIENT': 'website'}
        self.client = self.client_class(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = self.client_class(**kwargs)
        self.client_auth.login(self.user.username, 'test_pass_1')
        # self.client_auth.force_login(self.user)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_1)
        self.client_auth_1 = self.client_class(**kwargs)
        self.client_auth_1.login(self.user.username, 'test_pass_1')
        self.client_auth_1.force_login(self.user)

        super().setUp()
