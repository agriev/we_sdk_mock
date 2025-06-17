from datetime import timedelta

from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import Client, TestCase, TransactionTestCase, tag
from django.utils.timezone import now
from rest_framework.authtoken.models import Token

from apps.achievements.models import Achievement, ParentAchievement, UserAchievement
from apps.games.models import Game
from apps.merger.models import Network
from apps.token.models import Cycle, CycleKarma, CycleStage, CycleUser
from apps.users.models import UserGame


class Base:
    def setUp(self):
        self.network = Network.objects.create(name='Steam')
        self.user = get_user_model().objects.create(username='current', email='current@test.io')
        self.user_token = get_user_model().objects.create(
            username='token', email='token@test.io', token_program=True, steam_id_confirm=True
        )
        self.token = Token.objects.get_or_create(user=self.user)[0].key
        self.token_token = Token.objects.get_or_create(user=self.user_token)[0].key
        kwargs = {'HTTP_X_REQUESTED_WITH': 'XMLHttpRequest'}
        self.client = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token)
        self.client_auth = Client(**kwargs)
        kwargs['HTTP_TOKEN'] = 'Token {}'.format(self.token_token)
        self.client_auth_token = Client(**kwargs)
        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')
        super().setUp()

    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        super().tearDown()


@tag('token')
class TokenTestCase(Base, TestCase):
    def test_cycle(self):
        response = self.client.get('/api/token/cycle')
        self.assertEqual(response.status_code, 404)

        cycle = Cycle.objects.create(start=now(), end=now() + timedelta(weeks=1), status=Cycle.STATUS_ACTIVE)
        cycle_next = Cycle.objects.create(start=now() + timedelta(weeks=2), end=now() + timedelta(weeks=3))
        CycleStage.objects.create(cycle=cycle, achievements=100, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=300, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=500, tokens=3000)
        get_user_model().objects.create(username='curt', email='curt@test.io', token_program=True)
        get_user_model().objects.create(username='nick', email='nick@test.io', token_program=True)
        get_user_model().objects.create(username='warren', email='warren@test.io', token_program=True)

        response = self.client.get('/api/token/cycle')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data['status'], Cycle.STATUS_ACTIVE)
        self.assertEqual(len(response_data['stages']), 3)
        self.assertEqual(response_data['next']['id'], cycle_next.id)
        self.assertEqual(response_data['joined'], 4)
        self.assertEqual(len(response_data['last_users']), 4)

        response = self.client_auth.get('/api/token/cycle')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data['current_user']['karma'], 0)
        self.assertEqual(response_data['current_user']['achievements'], 0)
        self.assertEqual(response_data['current_user']['achievements_gold'], 0)
        self.assertEqual(response_data['current_user']['achievements_silver'], 0)
        self.assertEqual(response_data['current_user']['achievements_bronze'], 0)
        self.assertEqual(response_data['current_user']['position'], 1)
        self.assertEqual(response_data['current_user']['position_yesterday'], 0)

        CycleUser.objects.create(
            user=self.user, cycle=cycle, karma=100, achievements=10, achievements_gold=2, achievements_silver=3,
            achievements_bronze=5, position_yesterday=5,
        )

        response_data = self.client_auth.get('/api/token/cycle').json()
        self.assertEqual(response_data['current_user']['karma'], 100)
        self.assertEqual(response_data['current_user']['achievements'], 10)
        self.assertEqual(response_data['current_user']['achievements_gold'], 2)
        self.assertEqual(response_data['current_user']['achievements_silver'], 3)
        self.assertEqual(response_data['current_user']['achievements_bronze'], 5)
        self.assertEqual(response_data['current_user']['position'], 1)
        self.assertEqual(response_data['current_user']['position_yesterday'], 5)

    def test_join(self):
        response = self.client.post('/api/token/join')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.post('/api/token/join')
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data['code'], 1)

        self.user.steam_id = 'accujazz'
        self.user.steam_id_status = 'ready'
        self.user.save(update_fields=['steam_id', 'steam_id_status'])

        response = self.client_auth.post('/api/token/join')
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data['code'], 2)

        self.user.steam_id_confirm = True
        self.user.save(update_fields=['steam_id_confirm'])

        response = self.client_auth.post('/api/token/join')
        self.assertEqual(response.status_code, 400)
        response_data = response.json()
        self.assertEqual(response_data['code'], 3)

        EmailAddress.objects.create(user=self.user, email=self.user.email, primary=True, verified=True)

        response = self.client_auth.post('/api/token/join')
        self.assertEqual(response.status_code, 200)

        response = self.client_auth.post('/api/token/join')
        self.assertEqual(response.status_code, 200)

    def test_games(self):
        response = self.client.get('/api/token/games')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.get('/api/token/games')
        self.assertEqual(response.status_code, 200)

        cycle = Cycle.objects.create(start=now(), end=now() + timedelta(weeks=1))
        CycleStage.objects.create(cycle=cycle, achievements=100, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=300, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=500, tokens=3000)

        game = Game.objects.create(name='Grand Theft Auto V', parent_achievements_count_all=2)
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=self.network, uid='0')
        Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=self.network, uid='1')
        UserAchievement.objects.create(user=self.user, achievement=achievement_0, achieved=now())
        user_game = UserGame.objects.create(game=game, user=self.user)

        response = self.client_auth.get('/api/token/games')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game.id)
        self.assertEqual(response_data['results'][0]['percent'], 50)
        self.assertEqual(len(response_data['results'][0]['achievements']), 1)

        user_game.status = UserGame.STATUS_PLAYING
        user_game.save()

        response = self.client_auth.get('/api/token/games')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(response_data['results'][0]['id'], game.id)

    def test_players(self):
        response = self.client.get('/api/token/players')
        self.assertEqual(response.status_code, 200)

        cycle = Cycle.objects.create(start=now(), end=now() + timedelta(weeks=1))
        CycleStage.objects.create(cycle=cycle, achievements=100, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=300, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=500, tokens=3000)

        response = self.client.get('/api/token/players')
        self.assertEqual(response.status_code, 200)

        user_0 = get_user_model().objects.create(username='curt', email='curt@test.io', token_program=True)
        user_1 = get_user_model().objects.create(username='nick', email='nick@test.io', token_program=True)
        user_2 = get_user_model().objects.create(username='alberta', email='alberta@test.io', token_program=True)
        user_3 = get_user_model().objects.create(username='cross', email='cross@test.io', token_program=True)
        CycleUser.objects.create(cycle=cycle, user=user_1, karma=5)
        CycleUser.objects.create(cycle=cycle, user=user_0, karma=4)
        CycleUser.objects.create(cycle=cycle, user=user_2, karma=3)
        CycleUser.objects.create(cycle=cycle, user=user_3, karma=2)
        CycleUser.objects.create(cycle=cycle, user=self.user_token, karma=1)

        response = self.client.get('/api/token/players')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(len(response_data['results']), 5)
        self.assertEqual(response_data['results'][0]['user']['id'], user_1.id)
        self.assertEqual(response_data['results'][0]['user']['username'], user_1.username)

        response = self.client_auth_token.get('/api/token/players?from_current=true')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(len(response_data['results']), 4)
        self.assertEqual(response_data['results'][3]['user']['id'], self.user_token.id)
        self.assertEqual(response_data['results'][3]['user']['username'], self.user_token.username)

    def test_subscribe(self):
        response = self.client.post('/api/token/subscribe')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.post('/api/token/subscribe')
        self.assertEqual(response.status_code, 400)

        Cycle.objects.create(start=now(), end=now() + timedelta(weeks=1))
        Cycle.objects.create(start=now() + timedelta(weeks=2), end=now() + timedelta(weeks=3))

        response = self.client_auth.post('/api/token/subscribe')
        self.assertEqual(response.status_code, 400)

        response = self.client_auth_token.post('/api/token/subscribe')
        self.assertEqual(response.status_code, 200)

        response = self.client_auth_token.post('/api/token/subscribe')
        self.assertEqual(response.status_code, 200)

    def test_last_achievement(self):
        response = self.client.get('/api/token/last-achievement')
        self.assertEqual(response.status_code, 404)

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1),
            end=now() + timedelta(weeks=1),
            status=Cycle.STATUS_ACTIVE,
        )
        game = Game.objects.create(name='Grand Theft Auto V')
        parent_0 = ParentAchievement.objects.create(
            name='Red Bullet',
            game=game,
        )
        parent_1 = ParentAchievement.objects.create(
            name='Blue Bullet',
            game=game,
        )
        description = 'test red description'
        achievement_0 = Achievement.objects.create(
            name='Red Bullet',
            parent=parent_0,
            network=self.network,
            uid='0',
            description=description,
        )
        achievement_1 = Achievement.objects.create(
            name='Red Bullet',
            parent=parent_1,
            network=self.network,
            uid='1',
            description=description,
        )
        UserAchievement.objects.create(
            user=self.user,
            achievement=achievement_0,
            achieved=now(),
        )
        CycleKarma.objects.create(
            cycle=cycle,
            user=self.user,
            karma=10,
            parent_achievement=parent_0,
            achieved=now(),
        )

        dt_last = now()
        UserAchievement.objects.create(
            user=self.user,
            achievement=achievement_1,
            achieved=dt_last,
        )
        CycleKarma.objects.create(
            cycle=cycle,
            user=self.user,
            karma=20,
            parent_achievement=parent_1,
            achieved=dt_last,
        )

        response = self.client.get('/api/token/last-achievement')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['user'].get('id'), self.user.id)
        self.assertEqual(data.get('description'), description)
        self.assertEqual(data['achieved'], dt_last.strftime('%Y-%m-%dT%H:%M:%S.%fZ'))


@tag('token')
class TokenTransactionTestCase(Base, TransactionTestCase):
    def test_achievements(self):
        response = self.client.get('/api/token/achievements')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.get('/api/token/achievements')
        self.assertEqual(response.status_code, 400)

        Cycle.objects.create(
            start=now() - timedelta(weeks=1),
            end=now() + timedelta(weeks=1),
            status=Cycle.STATUS_ACTIVE,
        )

        response = self.client_auth.get('/api/token/achievements')
        self.assertEqual(response.status_code, 200)

        game = Game.objects.create(name='Grand Theft Auto V')
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=self.network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=self.network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=self.network, uid='2')
        achievement_3 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=self.network, uid='3')
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_0, achieved=now())
        UserAchievement.objects.create(
            user=self.user_token, achievement=achievement_1, achieved=now() - timedelta(minutes=1)
        )
        UserAchievement.objects.create(
            user=self.user_token, achievement=achievement_2, achieved=now() - timedelta(minutes=2)
        )
        UserAchievement.objects.create(
            user=self.user_token, achievement=achievement_3, achieved=now() - timedelta(minutes=3)
        )

        call_command('achievements_percents', **self.command_kwargs)

        parent_0.percent = 15
        parent_0.save(update_fields=['percent'])
        parent_1.percent = 3
        parent_1.save(update_fields=['percent'])

        response = self.client_auth_token.get('/api/token/achievements')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertEqual(len(response_data['results']), 3)
        self.assertEqual(response_data['results'][0]['id'], parent_0.id)
        self.assertEqual(response_data['results'][0]['percent'], '15.00')
        self.assertEqual(response_data['results'][0]['type'], 'silver')
        self.assertEqual(response_data['results'][1]['id'], parent_1.id)
        self.assertEqual(response_data['results'][1]['percent'], '3.00')
        self.assertEqual(response_data['results'][1]['type'], 'gold')
        self.assertEqual(response_data['results'][2]['id'], parent_2.id)
        self.assertEqual(response_data['results'][2]['percent'], '100.00')
        self.assertEqual(response_data['results'][2]['type'], 'bronze')
        self.assertFalse(
            CycleKarma.objects.filter(user=self.user, is_new=True).exists()
        )

    def test_reward(self):
        response = self.client.get('/api/token/reward')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.get('/api/token/reward')
        self.assertEqual(response.status_code, 400)

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1),
            end=now() + timedelta(weeks=1),
            status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=1, tokens=1)
        CycleStage.objects.create(cycle=cycle, achievements=5, tokens=5)
        CycleStage.objects.create(cycle=cycle, achievements=10, tokens=10)

        response = self.client_auth.get('/api/token/reward')
        self.assertEqual(response.status_code, 200)

        game = Game.objects.create(name='Grand Theft Auto V')
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=self.network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=self.network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=self.network, uid='2')
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_0, achieved=now())
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_1, achieved=now())
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_2, achieved=now())

        response = self.client_auth_token.get('/api/token/reward')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data['your_karma'], 3)
        self.assertEqual(response_data['your_tokens'], 0.05)
        self.assertEqual(response_data['your_top'], 100)

    def test_reward_post(self):
        response = self.client.post('/api/token/reward')
        self.assertEqual(response.status_code, 401)

        response = self.client_auth.post('/api/token/reward')
        self.assertEqual(response.status_code, 400)

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1),
            end=now() + timedelta(weeks=1),
            status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=1, tokens=1)
        CycleStage.objects.create(cycle=cycle, achievements=5, tokens=5)
        CycleStage.objects.create(cycle=cycle, achievements=10, tokens=10)

        response = self.client_auth.post('/api/token/reward')
        self.assertEqual(response.status_code, 400)

        game = Game.objects.create(name='Grand Theft Auto V')
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=self.network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=self.network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=self.network, uid='2')
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_0, achieved=now())
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_1, achieved=now())
        UserAchievement.objects.create(user=self.user_token, achievement=achievement_2, achieved=now())

        response = self.client_auth_token.post('/api/token/reward')
        self.assertEqual(response.status_code, 400)

        cycle.end = now()
        cycle.finished = now()
        cycle.status = Cycle.STATUS_SUCCESS
        cycle.save(update_fields=['end', 'finished', 'status'])

        cycle_user = CycleUser.objects.get(user=self.user_token, cycle=cycle)
        self.assertFalse(cycle_user.karma_is_exchanged)

        response = self.client_auth_token.post('/api/token/reward')
        self.assertEqual(response.status_code, 200)

        response_data = response.json()
        self.assertEqual(response_data['your_karma'], 3)
        self.assertEqual(response_data['your_tokens'], 0.05)

        cycle_user = CycleUser.objects.get(user=self.user_token, cycle=cycle)
        self.assertTrue(cycle_user.karma_is_exchanged)

        response = self.client_auth_token.post('/api/token/reward')
        self.assertEqual(response.status_code, 400)
