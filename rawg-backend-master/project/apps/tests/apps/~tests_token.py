import os
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.test import TestCase, TransactionTestCase, tag
from django.utils.timezone import now

from apps.achievements.models import Achievement, ParentAchievement, UserAchievement
from apps.games.models import Game
from apps.merger.models import Network
from apps.token.models import Cycle, CycleKarma, CycleStage, CycleUser, GameStatus
from apps.token.signals import user_joined, user_out
from apps.token.tasks import update_progress, update_yesterday_position
from apps.utils.tasks import send_email


class Base:
    def setUp(self):
        self.email = os.environ.get('TEST_EMAIL', 'current@test.io')
        self.user = get_user_model().objects.create(
            username='current', email=self.email, token_program=True, steam_id_confirm=True
        )
        self.network = Network.objects.create(name='Steam')
        self.game = Game.objects.create(name='Grand Theft Auto VI')
        self.parent_0 = ParentAchievement.objects.create(name='Red Bullet', game=self.game)
        self.parent_1 = ParentAchievement.objects.create(name='Blue Bullet', game=self.game)
        self.parent_2 = ParentAchievement.objects.create(name='Green Bullet', game=self.game)
        self.achievement_0 = Achievement.objects.create(
            name='Red Bullet', parent=self.parent_0, network=self.network, uid='0'
        )
        self.achievement_1 = Achievement.objects.create(
            name='Blue Bullet', parent=self.parent_1, network=self.network, uid='1'
        )
        self.achievement_2 = Achievement.objects.create(
            name='Green Bullet', parent=self.parent_2, network=self.network, uid='2'
        )
        self.achievement_3 = Achievement.objects.create(
            name='Green Bullet', parent=self.parent_2, network=self.network, uid='3'
        )
        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')
        super().setUp()

    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        super().tearDown()


@tag('token')
class StartEndTestCase(Base, TransactionTestCase):
    def test_start(self):
        Cycle.objects.create(
            start=now() - timedelta(weeks=2), end=now() - timedelta(weeks=1), status=Cycle.STATUS_FAILURE
        )
        next_cycle = Cycle.objects.create(start=now(), end=now() + timedelta(weeks=2))

        self.assertEqual(next_cycle.status, Cycle.STATUS_NEW)

        update_progress()

        self.assertEqual(Cycle.objects.get(id=next_cycle.id).status, Cycle.STATUS_ACTIVE)

    @patch('apps.token.tasks.fast_achievements_fetching')
    def test_end_finishing_and_failure(self, achievements_mock):
        achievements_mock.return_value = [1, 2, 3]

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() - timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )

        update_progress()

        achievements_mock.assert_called_once()

        update_progress()

        self.assertEqual(Cycle.objects.get(id=cycle.id).status, Cycle.STATUS_FAILURE)

    @patch('apps.token.tasks.fast_achievements_fetching')
    def test_end_finishing_and_success(self, achievements_mock):
        achievements_mock.return_value = [1, 2, 3]

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() - timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=1, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=2, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        UserAchievement.objects.create(
            user=self.user, achievement=self.achievement_0, achieved=now() - timedelta(minutes=3)
        )

        update_progress()

        achievements_mock.assert_called_once()

        update_progress()

        self.assertEqual(Cycle.objects.get(id=cycle.id).status, Cycle.STATUS_SUCCESS)

    @patch('apps.token.tasks.fast_achievements_fetching')
    def test_end_finishing_and_completed(self, achievements_mock):
        def achievements(user, achievement_0, achievement_1, achievement_2, achievement_3):
            UserAchievement.objects.create(
                user=user, achievement=achievement_0, achieved=now() - timedelta(hours=1)
            )
            UserAchievement.objects.create(
                user=user, achievement=achievement_1, achieved=now() - timedelta(hours=1)
            )
            UserAchievement.objects.create(
                user=user, achievement=achievement_2, achieved=now() - timedelta(hours=1)
            )
            UserAchievement.objects.create(
                user=user, achievement=achievement_3, achieved=now() - timedelta(hours=1)
            )
            return [1, 2, 3]

        achievements_mock.side_effect = lambda: achievements(
            self.user, self.achievement_0, self.achievement_1, self.achievement_2, self.achievement_3
        )

        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() - timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=1, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=2, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        update_progress()

        achievements_mock.assert_called_once()

        update_progress()

        self.assertEqual(Cycle.objects.get(id=cycle.id).status, Cycle.STATUS_COMPLETED)

    @tag('mail')
    def test_start_email(self):
        template_prefix = 'token/email/cycle_is_started'
        context = {
            'user_id': 1,
            'security_hash': 'some_hash',
            'mail_slug': 'cycle_is_started',
            'email': 'test@test.io',
        }
        send_email(template_prefix, context, [self.email])

    @tag('mail')
    def test_failed_email(self):
        template_prefix = 'token/email/cycle_is_failed'
        context = {
            'user_id': 1,
            'security_hash': 'some_hash',
            'mail_slug': 'cycle_is_failed',
            'email': 'test@test.io',
        }
        send_email(template_prefix, context, [self.email])

    @tag('mail')
    def test_finished_email(self):
        template_prefix = 'token/email/cycle_is_finished'
        context = {
            'user_id': 1,
            'security_hash': 'some_hash',
            'mail_slug': 'cycle_is_finished',
            'email': 'test@test.io',
        }
        send_email(template_prefix, context, [self.email])

    @tag('mail')
    def test_exchange_karma(self):
        template_prefix = 'token/email/exchange_karma'
        context = {
            'user_id': 1,
            'security_hash': 'some_hash',
            'mail_slug': 'exchange_karma',
            'email': 'test@test.io',
        }
        send_email(template_prefix, context, [self.email])


@tag('token')
class TriggersTestCase(Base, TransactionTestCase):
    def test_user_achievement_add_true(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

        UserAchievement.objects.create(user=self.user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertTrue(CycleKarma.objects.order_by('-id').first().karma)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

    def test_user_achievement_add_false_because_date(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

        UserAchievement.objects.create(
            user=self.user, achievement=self.achievement_0, achieved=now() - timedelta(weeks=10)
        )

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

        UserAchievement.objects.create(user=self.user, achievement=self.achievement_1, achieved=None)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

    def test_user_achievement_add_false_because_confirmation(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(weeks=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

        user = get_user_model().objects.create(username='themagnetic', email='magnetic@test.io', token_program=True)
        UserAchievement.objects.create(user=user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

    def test_user_achievement_delete(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        user_achievement = UserAchievement.objects.create(
            user=self.user, achievement=self.achievement_0, achieved=now()
        )

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)

        user_achievement.delete()

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

    def test_user_achievement_achieved_change(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        user_achievement = UserAchievement.objects.create(
            user=self.user, achievement=self.achievement_0, achieved=now()
        )

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)

        user_achievement.achieved = now() - timedelta(weeks=2)
        user_achievement.save(update_fields=['achieved'])

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

        user_achievement.achieved = now()
        user_achievement.save(update_fields=['achieved'])

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        user_achievement.achieved = None
        user_achievement.save(update_fields=['achieved'])

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

    def test_user_achievement_unchangeable(self):
        network = Network.objects.create(name='Steam')
        game = Game.objects.create(name='Grand Theft Auto V')
        parent = ParentAchievement.objects.create(name='Red Bullet', game=game)
        achievement = Achievement.objects.create(name='Red Bullet', parent=parent, network=network, uid='0')

        user_achievement = UserAchievement.objects.create(user=self.user, achievement=achievement)

        # user

        user_new = get_user_model().objects.create(username='national', email='national@test.io')

        user_achievement = UserAchievement.objects.get(id=user_achievement.id)
        user_achievement.user = user_new
        with self.assertRaises(ValidationError):
            user_achievement.save(update_fields=['user'])
        user_achievement.user_id = user_new.id
        with self.assertRaises(ValidationError):
            user_achievement.save(update_fields=['user_id'])

        with self.assertRaises(ValidationError):
            UserAchievement.objects.filter(user=self.user, achievement=achievement).update(user_id=user_new.id)

        # achievement

        parent_new = ParentAchievement.objects.create(name='Blue Bullet', game=game)
        achievement_new = Achievement.objects.create(name='Blue Bullet', parent=parent_new, network=network, uid='1')

        user_achievement = UserAchievement.objects.get(id=user_achievement.id)
        user_achievement.achievement = achievement_new
        with self.assertRaises(ValidationError):
            user_achievement.save()

        with self.assertRaises(ValidationError):
            UserAchievement.objects.filter(user=self.user, achievement=achievement).update(achievement=achievement_new)

    def test_achievement_delete(self):
        achievement = Achievement.objects.create(
            name='Red Bullet', parent=self.parent_0, network=self.network, uid='100'
        )
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=achievement, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)

        achievement.delete()

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

    def test_achievement_parent_achievement_change(self):
        achievement = Achievement.objects.create(
            name='Red Bullet', parent=self.parent_0, network=self.network, uid='100'
        )
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=achievement, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)

        game_new = Game.objects.create(name='Grand Theft Auto IV')
        parent_new = ParentAchievement.objects.create(name='Blue Bullet!', game=game_new)
        GameStatus.objects.create(cycle=cycle, game=game_new, status=GameStatus.STATUS_EXCLUDE)

        achievement.parent_id = parent_new.id
        achievement.save(update_fields=['parent_id'])

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

    def test_parent_achievement_delete(self):
        parent = ParentAchievement.objects.create(name='Blue Bullet!', game=self.game)
        achievement = Achievement.objects.create(name='Red Bullet', parent=parent, network=self.network, uid='100')
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=achievement, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)

        parent.delete()

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)

    def test_parent_achievement_percent_change(self):
        parent = ParentAchievement.objects.create(name='Blue Bullet!', game=self.game)
        achievement = Achievement.objects.create(name='Red Bullet', parent=parent, network=self.network, uid='100')
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=achievement, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        self.assertEqual(parent.percent, 0)
        parent.percent = 1
        parent.save(update_fields=['percent'])

        self.assertGreater(CycleUser.objects.get(id=cycle_user.id).karma, cycle_user.karma)

    def test_parent_achievement_game_change(self):
        parent = ParentAchievement.objects.create(name='Blue Bullet!', game=self.game)
        achievement = Achievement.objects.create(name='Red Bullet', parent=parent, network=self.network, uid='100')
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=achievement, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        game_new = Game.objects.create(name='Grand Theft Auto IV')
        parent.game_id = game_new
        parent.save(update_fields=['game_id'])
        GameStatus.objects.create(cycle=cycle, game=game_new, status=GameStatus.STATUS_PARTNER_FOR_CYCLE)

        self.assertGreater(CycleUser.objects.get(id=cycle_user.id).karma, cycle_user.karma)

    def test_game_status_add(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        UserAchievement.objects.create(user=self.user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        GameStatus.objects.create(game=self.game, status=GameStatus.STATUS_PARTNER_ALWAYS)

        self.assertGreater(CycleUser.objects.get(id=cycle_user.id).karma, cycle_user.karma)

    def test_game_status_delete(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        game_status = GameStatus.objects.create(game=self.game, status=GameStatus.STATUS_PARTNER_ALWAYS)
        UserAchievement.objects.create(user=self.user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        game_status.delete()

        self.assertLess(CycleUser.objects.get(id=cycle_user.id).karma, cycle_user.karma)

    def test_game_status_unchangeable(self):
        game = Game.objects.create(name='Grand Theft Auto V')
        cycle = Cycle.objects.create(start=now() - timedelta(weeks=1), end=now() + timedelta(weeks=1))

        game_status = GameStatus.objects.create(game=game, cycle=cycle, status=GameStatus.STATUS_PARTNER_FOR_CYCLE)

        # game

        game_new = Game.objects.create(name='Grand Theft Auto IV')

        game_status = GameStatus.objects.get(id=game_status.id)
        game_status.game = game_new
        with self.assertRaises(ValidationError):
            game_status.save(update_fields=['game'])
        game_status.game_id = game_new.id
        with self.assertRaises(ValidationError):
            game_status.save(update_fields=['game_id'])

        with self.assertRaises(ValidationError):
            GameStatus.objects.filter(id=game_status.id).update(game_id=game_new.id)

        # cycle

        cycle_new = Cycle.objects.create(start=now() + timedelta(weeks=2), end=now() + timedelta(weeks=4))

        game_status = GameStatus.objects.get(id=game_status.id)
        game_status.cycle = cycle_new
        with self.assertRaises(ValidationError):
            game_status.save()

        with self.assertRaises(ValidationError):
            GameStatus.objects.filter(id=game_status.id).update(cycle=cycle_new)

        # status

        game_status = GameStatus.objects.get(id=game_status.id)
        game_status.status = GameStatus.STATUS_PARTNER_ALWAYS
        with self.assertRaises(ValidationError):
            game_status.save()

        with self.assertRaises(ValidationError):
            GameStatus.objects.filter(id=game_status.id).update(status=GameStatus.STATUS_PARTNER_ALWAYS)

    def test_user_delete(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)
        user = get_user_model().objects.create(
            username='themagnetic', email='magnetic@test.io', token_program=True, steam_id_confirm=True
        )
        UserAchievement.objects.create(user=user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertTrue(CycleKarma.objects.order_by('-id').first().karma)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        user.delete()

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

    def test_user_token_program_change(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        user = get_user_model().objects.create(username='themagneticfields', email='magnetic@test.io')
        UserAchievement.objects.create(user=user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

        user.token_program = True
        user.steam_id_confirm = True
        with transaction.atomic():
            user.save(update_fields=['token_program', 'steam_id_confirm'])
            user_joined.send(sender=user.__class__, instance=user)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertTrue(CycleKarma.objects.order_by('-id').first().karma)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        user.token_program = False
        user.steam_id_confirm = False
        with transaction.atomic():
            user.save(update_fields=['token_program', 'steam_id_confirm'])
            user_out.send(sender=user.__class__, instance=user)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 0)

    def test_user_steam_id_confirm_change(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=3000)

        user = get_user_model().objects.create(
            username='themagneticfields', email='magnetic@test.io', token_program=True, steam_id_confirm=True
        )
        UserAchievement.objects.create(user=user, achievement=self.achievement_0, achieved=now())

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 1)
        self.assertEqual(CycleKarma.objects.count(), 1)
        self.assertTrue(CycleKarma.objects.order_by('-id').first().karma)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertTrue(cycle_user.achievements)
        self.assertTrue(cycle_user.karma)

        user.steam_id_confirm = False
        with transaction.atomic():
            user.save(update_fields=['steam_id_confirm'])
            user_joined.send(sender=user.__class__, instance=user)

        self.assertEqual(Cycle.objects.get(id=cycle.id).achievements, 0)
        self.assertEqual(CycleKarma.objects.count(), 0)
        self.assertEqual(CycleUser.objects.count(), 1)
        cycle_user = CycleUser.objects.order_by('-id').first()
        self.assertFalse(cycle_user.achievements)
        self.assertFalse(cycle_user.karma)


@tag('token')
class PeriodicTestCase(TransactionTestCase):
    def test_update_yesterday_position(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1),
            end=now() + timedelta(minutes=1),
            status=Cycle.STATUS_ACTIVE,
        )

        User = get_user_model()
        users = []
        for i in range(1, 4):
            users.append(User.objects.create(
                username='test%s' % i,
                email='test%s@test.io' % i,
            ))

        cycle_users = []
        for i, user in enumerate(users, start=1):
            cycle_users.append(CycleUser(cycle=cycle, user=user, karma=i * 10))
        CycleUser.objects.bulk_create(cycle_users)

        update_yesterday_position()

        cycle_users_set = CycleUser.objects.all().order_by(
            '-position_yesterday'
        )
        for i in range(1, cycle_users_set.count() - 1):
            self.assertTrue(cycle_users_set[i] != 0)
            self.assertTrue(
                cycle_users_set[i].karma <= cycle_users_set[i + 1].karma
            )


@tag('token')
class CycleUserTestCase(Base, TestCase):
    def test_exchange_karma_0(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1), status=Cycle.STATUS_ACTIVE
        )
        CycleStage.objects.create(cycle=cycle, achievements=1, tokens=2)
        CycleStage.objects.create(cycle=cycle, achievements=2, tokens=3)
        CycleStage.objects.create(cycle=cycle, achievements=3, tokens=4)

        user = get_user_model().objects.create(username='new', email='new@test.io')
        cycle_user = CycleUser.objects.create(cycle=cycle, user=user, karma=1)

        self.assertFalse(cycle_user.exchange_karma())

        cycle.status = Cycle.STATUS_SUCCESS
        cycle.achievements = 2
        cycle.save(update_fields=['status'])

        self.assertFalse(cycle_user.exchange_karma())

        cycle_user = CycleUser.objects.create(cycle=cycle, user=self.user, karma=1)

        self.assertEqual(cycle_user.exchange_karma(), Decimal('0.15'))

        self.assertFalse(cycle_user.exchange_karma())

    def test_exchange_karma_1(self):
        cycle = Cycle.objects.create(
            start=now() - timedelta(weeks=1), end=now() + timedelta(minutes=1),
            status=Cycle.STATUS_SUCCESS, achievements=633,
        )
        CycleStage.objects.create(cycle=cycle, achievements=300, tokens=1000)
        CycleStage.objects.create(cycle=cycle, achievements=600, tokens=2000)
        CycleStage.objects.create(cycle=cycle, achievements=1000, tokens=4000)

        data = [
            (108, 100, '100.0000000000'),
            (49, 100, '100.0000000000'),
            (47, 100, '100.0000000000'),
            (42, 100, '100.0000000000'),
            (33, 100, '100.0000000000'),
            (27, 100, '100.0000000000'),
            (17, '70.83333333333333333333333333', '70.8333333333'),
            (13, '54.16666666666666666666666668', '54.1666666667'),
            (8, '33.33333333333333333333333333', '33.3333333333'),
            (5, '20.83333333333333333333333333', '20.8333333333'),
            (2, '8.333333333333333333333333334', '8.3333333333'),
        ]
        cycle_users = []
        for i in range(0, 11):
            user = get_user_model().objects.create(
                username='new{}'.format(i), email='new{}@test.io'.format(i), token_program=True, steam_id_confirm=True
            )
            cycle_users.append(CycleUser.objects.create(cycle=cycle, user=user, karma=data[i][0]))

        for i, cycle_user in enumerate(cycle_users):
            self.assertEqual(cycle_user.exchange_karma(), Decimal(data[i][1]))
            self.assertEqual(get_user_model().objects.get(username='new{}'.format(i)).tokens, Decimal(data[i][2]))
