import os
from decimal import Decimal

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TransactionTestCase, override_settings

from apps.achievements.models import Achievement, ParentAchievement, UserAchievement
from apps.games.models import Game
from apps.merger.models import Network


class TasksTestCase(TransactionTestCase):
    def setUp(self):
        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')
        super().setUp()

    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        super().tearDown()

    def test_calculate_percent_game(self):
        network = Network.objects.create(name='Steam')
        game = Game.objects.create(name='Grand Theft Auto V')
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=game)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=game)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=network, uid='2')
        self._calculate_percent(achievement_0, achievement_1, achievement_2)

    def test_calculate_percent_game_name(self):
        network = Network.objects.create(name='Steam')
        game_name = 'Grand Theft Auto V'
        parent_0 = ParentAchievement.objects.create(name='Red Bullet', game_name=game_name)
        parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game_name=game_name)
        parent_2 = ParentAchievement.objects.create(name='Green Bullet', game_name=game_name)
        achievement_0 = Achievement.objects.create(name='Red Bullet', parent=parent_0, network=network, uid='0')
        achievement_1 = Achievement.objects.create(name='Blue Bullet', parent=parent_1, network=network, uid='1')
        achievement_2 = Achievement.objects.create(name='Green Bullet', parent=parent_2, network=network, uid='2')
        self._calculate_percent(achievement_0, achievement_1, achievement_2)

    def _calculate_percent(self, achievement_0, achievement_1, achievement_2):
        user_0 = get_user_model().objects.create(username='curt', email='curt@test.io')
        user_1 = get_user_model().objects.create(username='nick', email='nick@test.io')
        user_2 = get_user_model().objects.create(username='warren', email='warren@test.io')

        UserAchievement.objects.create(user=user_0, achievement=achievement_0)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, 100)
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 0)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, 0)

        UserAchievement.objects.create(user=user_1, achievement=achievement_1)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, 50)
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 50)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, 0)

        UserAchievement.objects.create(user=user_2, achievement=achievement_1)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, Decimal('33.33'))
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, Decimal('66.67'))
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, 0)

        UserAchievement.objects.create(user=user_2, achievement=achievement_2)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, Decimal('33.33'))
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, Decimal('66.67'))
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, Decimal('33.33'))

        UserAchievement.objects.create(user=user_0, achievement=achievement_1)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, Decimal('33.33'))
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 100)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, Decimal('33.33'))

        UserAchievement.objects.create(user=user_1, achievement=achievement_2)
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, Decimal('33.33'))
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 100)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, Decimal('66.67'))

        UserAchievement.objects.filter(user=user_1, achievement=achievement_2).delete()
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, Decimal('33.33'))
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 100)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, Decimal('33.33'))

        UserAchievement.objects.filter(user=user_1, achievement=achievement_1).delete()
        call_command('achievements_percents', **self.command_kwargs)
        self.assertEqual(Achievement.objects.get(id=achievement_0.id).percent, 50)
        self.assertEqual(Achievement.objects.get(id=achievement_1.id).percent, 100)
        self.assertEqual(Achievement.objects.get(id=achievement_2.id).percent, 50)

    @override_settings(CRAWLING_SAVE_IMAGES=True)
    def test_image_saving(self):
        network = Network.objects.create(name='Steam')
        game_name = 'Grand Theft Auto V'
        parent = ParentAchievement.objects.create(name='Red Bullet', game_name=game_name)
        achievement, created = Achievement.objects.get_or_create(network=network, uid='0', defaults={
            'parent': parent,
            'name': 'Red Bullet',
            'image_source': 'file://{}'.format(
                os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
            ),
        })
        self.assertTrue(created)
        self.assertIsNotNone(achievement.image_file.name)

    @override_settings(CRAWLING_SAVE_IMAGES=True)
    def test_image_saving_bad(self):
        network = Network.objects.create(name='Steam')
        game_name = 'Grand Theft Auto V'
        parent = ParentAchievement.objects.create(name='Red Bullet', game_name=game_name)
        achievement, created = Achievement.objects.get_or_create(network=network, uid='0', defaults={
            'parent': parent,
            'name': 'Red Bullet',
            'image_source': 'file:///app/',
        })
        self.assertTrue(created)
        self.assertIsNone(achievement.image_file.name)
