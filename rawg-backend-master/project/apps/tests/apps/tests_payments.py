import datetime
from collections import OrderedDict, namedtuple
from datetime import date, datetime as dt
from functools import reduce
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils.timezone import make_aware
from transitions.core import MachineError

from apps.games.models import Game, PlayerGameSession
from apps.payments.models import CanceledEvent, CreatedEvent, ErrorEvent, LLPConfig, LoginsLoyaltyProgram, PaidEvent, \
    Payment, PaymentConfirmedEvent, PaymentProject, PendingEvent, RefundConfirmedEvent, RefundedEvent
from apps.payments.utils import Constants
from apps.stat.models import Visit
from apps.users.models import Balance
from apps.utils.tests import changed_date

LOGINS_VARIATION = namedtuple('logins_variation', ['logins', 'full_bonus', 'hot_streak_days', 'saved_days'])


class PaymentTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.available_transitions = {
            Constants.INITIAL: {Constants.CREATED, Constants.ERROR},
            Constants.CREATED: {Constants.PENDING, Constants.ERROR},
            Constants.PENDING: {
                Constants.PENDING, Constants.PAID, Constants.REFUNDED, Constants.CANCELED, Constants.ERROR
            },
            Constants.PAID: {Constants.PAID, Constants.PAYMENT_CONFIRMED, Constants.REFUNDED, Constants.ERROR},
            Constants.PAYMENT_CONFIRMED: {Constants.PAYMENT_CONFIRMED, Constants.REFUNDED, Constants.ERROR},
            Constants.REFUNDED: {Constants.REFUNDED, Constants.REFUND_CONFIRMED, Constants.ERROR},
            Constants.REFUND_CONFIRMED: {Constants.REFUND_CONFIRMED, Constants.ERROR},
            Constants.CANCELED: {Constants.PAID, Constants.REFUNDED, Constants.ERROR},
            Constants.ERROR: {Constants.ERROR}
        }

    @patch.object(Payment, 'action_before_change')
    @patch.object(Payment, 'action_after_change')
    @patch.object(Payment, 'handle_exception')
    def test_valid_transitions(self, mock_handle_exception, mock_action_after_change, mock_action_before_change):
        payment = Payment()
        self.assertEqual(payment.state, Constants.INITIAL)
        for state in Constants.STATES:
            for available_state in self.available_transitions[state]:
                payment.current_state = state
                payment.trigger(f'change_to_{available_state}')
                self.assertEqual(payment.state, available_state)
        count = reduce(lambda _amount, value: _amount + len(value), self.available_transitions.values(), 0)
        self.assertEqual(mock_action_after_change.call_count, count, 'Amount of available transitions does not match')
        self.assertEqual(mock_action_before_change.call_count, count, 'Amount of available transitions does not match')
        mock_handle_exception.assert_not_called()

    @patch.object(Payment, 'action_before_change')
    @patch.object(Payment, 'action_after_change')
    @patch.object(Payment, 'handle_exception', side_effect=MachineError('error'))
    def test_invalid_transitions(self, mock_handle_exception, mock_action_after_change, mock_action_before_change):
        payment = Payment()
        count = 0
        for state in Constants.STATES:
            payment.current_state = state
            for not_available_state in set(Constants.STATES) - self.available_transitions[state]:
                msg = f'Can change state from {state} to {not_available_state}'
                with self.assertRaises(expected_exception=(MachineError, AttributeError), msg=msg) as cm:
                    payment.trigger(f'change_to_{not_available_state}')
                count += 1 if isinstance(cm.exception, MachineError) else 0
        self.assertEqual(mock_handle_exception.call_count, count, 'Amount of unavailable transitions does not match')
        mock_action_after_change.assert_not_called()
        mock_action_before_change.assert_not_called()


class PaymentEventTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create(username='gamer', email='gamer@test.com')
        cls.game = Game.objects.create(name='Worms 3D')
        cls.session = PlayerGameSession.objects.create(player=cls.user, game=cls.game)
        cls.xsolla_project = PaymentProject.objects.create(
            game=cls.game, id=100, secret_key='some_key', payment_system_name=Payment.XSOLLA
        )
        cls.ukassa_shop = PaymentProject.objects.create(
            game=cls.game, id=200, secret_key='another_key', payment_system_name=Payment.UKASSA
        )
        cls.available_events_transitions = {
            CreatedEvent: {PendingEvent},
            PendingEvent: {PendingEvent, PaidEvent, RefundedEvent, CanceledEvent},
            PaidEvent: {PaidEvent, PaymentConfirmedEvent, RefundedEvent},
            PaymentConfirmedEvent: {PaymentConfirmedEvent, RefundedEvent},
            RefundedEvent: {RefundedEvent, RefundConfirmedEvent},
            RefundConfirmedEvent: {RefundConfirmedEvent},
            CanceledEvent: {PaidEvent, RefundedEvent},
            ErrorEvent: {},
        }

    def setUp(self):
        self.payment = Payment.objects.create(game_session=self.session, game=self.game, player=self.user)

    def test_state_transition(self):
        event_models_states_map = OrderedDict(
            [
                (CreatedEvent, Constants.CREATED),
                (PendingEvent, Constants.PENDING),
                (PaidEvent, Constants.PAID),
                (PaymentConfirmedEvent, Constants.PAYMENT_CONFIRMED),
                (RefundedEvent, Constants.REFUNDED),
                (RefundConfirmedEvent, Constants.REFUND_CONFIRMED),
                (ErrorEvent, Constants.ERROR),
            ]
        )
        for event_model, state in event_models_states_map.items():
            event = event_model(payment=self.payment, data={})
            event.save()
            self.assertEqual([self.payment.state, self.payment.state], [state] * 2)
            if not isinstance(event, ErrorEvent):
                self.assertEqual(self.payment.last_success_event_id, event.id)

    def test_before_after_change_error(self):
        for action in ['action_after_change', 'action_before_change']:
            for source_model, dest_models in self.available_events_transitions.items():
                for dest_model in dest_models:
                    self.payment.current_state = source_model.EVENT_TYPE
                    self.payment.save()
                    with patch.object(dest_model, action, side_effect=ValueError('Error')), \
                            patch.object(dest_model, 'on_exception') as patched_on_exception:
                        event_data = {'key': 'value'}
                        dest_event = dest_model(payment=self.payment, data=event_data)
                        dest_event.save()
                        patched_on_exception.assert_called_once()


class LoginLoyaltyProgramTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.logins_variations = [
            LOGINS_VARIATION([], full_bonus=23, hot_streak_days=[0, 1], saved_days=[0, 1]),
            LOGINS_VARIATION([True], full_bonus=34.5, hot_streak_days=[0, 1, 2], saved_days=[1, 2]),
            LOGINS_VARIATION([False], full_bonus=23, hot_streak_days=[0, 1], saved_days=[0, 1]),
            LOGINS_VARIATION(
                ([True] * 14) + ([False] * 14), full_bonus=161, hot_streak_days=list(range(14)), saved_days=[]
            ),
            LOGINS_VARIATION(
                ([False] * 14) + ([True] * 14), full_bonus=23, hot_streak_days=[0, 1], saved_days=[0, 1]
            ),
            LOGINS_VARIATION(
                [i % 2 == 0 for i in range(1, 29)],
                full_bonus=102, hot_streak_days=[0, 1, 2, 3] + [i for i in range(7, 14) if i % 2 != 0], saved_days=[0, 2]
            ),
            LOGINS_VARIATION([True] * 100, full_bonus=161, hot_streak_days=list(range(14)), saved_days=[]),
            LOGINS_VARIATION([False] * 100, full_bonus=23, hot_streak_days=[0, 1], saved_days=[0, 1]),
            LOGINS_VARIATION([False] * 27 + [True], full_bonus=23, hot_streak_days=[0, 1], saved_days=[0, 1]),
            LOGINS_VARIATION([True] + [False] * 27, full_bonus=34.5, hot_streak_days=[0, 1, 2], saved_days=[1, 2]),
        ]

    def setUp(self):
        self.loyalty_config = LLPConfig.objects.create(
            active=True, full_duration=14, stage_duration=7, lives=2, hot_streak_factor=0.15, serial_hot_streak=2,
            weekly_logins_hot_streak=3, bonus_per_day=10
        )
        self.user = get_user_model().objects.create_user(username='gamer', email='gamer@test.com', last_visit=date.today())
        self.balance = Balance.objects.get(user=self.user)
        self.loyalty = LoginsLoyaltyProgram.objects.get()

    def test_create_program(self):
        self.user.delete()
        self.assertFalse(LoginsLoyaltyProgram.objects.exists())
        self.user.save()

        loyalty = LoginsLoyaltyProgram.objects.get()
        self.assertEqual(loyalty.user_id, self.user.id)
        self.assertFalse(loyalty.accepted)
        self.assertEqual(loyalty.start_date, date.today())

    def test_same_day_save(self):
        with self.assertNumQueries(3):
            self.user.save(update_fields=['username'])

        with self.assertNumQueries(5):
            self.user.save(update_fields=['last_visit'])

        self.assertEqual(self.loyalty.user_id, self.user.id)
        self.assertFalse(self.loyalty.accepted)
        self.assertEqual(self.loyalty.start_date, date.today())

    def test_logins(self):
        Visit.objects.create(user=self.user, datetime=make_aware(dt.now() + datetime.timedelta(days=1)))
        self.assertEqual(self.loyalty.logins, [date.today(), date.today() + datetime.timedelta(days=1)])

    def test_touch_after_end(self):
        for day in range(self.loyalty_config.full_duration, self.loyalty_config.full_duration * 2):

            with changed_date(day) as timestamp:
                Visit.objects.create(user_id=self.user.id, datetime=make_aware(dt.fromtimestamp(timestamp())))
                self.assertEqual(self.loyalty.logins, [self.loyalty.start_date])

    def test_touch_before_end(self):
        expected_logins = []
        for day in range(self.loyalty_config.full_duration):
            with changed_date(day) as timestamp:
                dtime = make_aware(dt.fromtimestamp(timestamp()))
                Visit.objects.create(user_id=self.user.id, datetime=dtime)
                expected_logins.append(dtime.date())
                self.assertEqual(LoginsLoyaltyProgram.objects.get(id=self.loyalty.id).logins, expected_logins)

    def test_accept(self):
        self.assertEqual(self.balance.bonuses, 0)
        self.assertFalse(self.loyalty.can_accept)
        self.assertFalse(self.loyalty.accepted)

        self.assertIsNone(self.loyalty.accepted_date)
        with self.assertRaises(LoginsLoyaltyProgram.CannotAccept, msg='Сannot be accepted until program is completed'):
            LoginsLoyaltyProgram.accept(self.user.id)
        with changed_date(self.loyalty_config.full_duration):
            LoginsLoyaltyProgram.accept(self.user.id)
            loyalty = LoginsLoyaltyProgram.objects.get(id=self.loyalty.id)
            self.balance.refresh_from_db()
            self.assertEqual(self.balance.bonuses, loyalty.full_bonus)
            self.assertTrue(loyalty.accepted)
            self.assertFalse(loyalty.can_accept)
            self.assertEqual(loyalty.accepted_date, date.today())

    def test_variants(self):
        for variant in self.logins_variations:
            Visit.objects.all().delete()
            Visit.objects.bulk_create([
                Visit(
                    user_id=self.user.id,
                    datetime=make_aware(
                        dt.combine(
                            self.loyalty.start_date + datetime.timedelta(days=day),
                            dt.min.time()
                        )
                    )
                )
                for day, is_visited in enumerate(variant.logins)
                if is_visited
            ])

            loyalty = LoginsLoyaltyProgram.objects.get(id=self.loyalty.id)
            with changed_date(self.loyalty_config.full_duration):
                self.assertEqual(loyalty.full_bonus, variant.full_bonus)
                self.assertEqual(loyalty.hot_streak_days, variant.hot_streak_days)
                self.assertEqual(
                    loyalty.saved_days,
                    [loyalty.start_date + datetime.timedelta(days=index) for index in variant.saved_days]
                )

    def test_can_accept(self):
        self.assertFalse(self.loyalty.can_accept)
        for program_day in range(0, self.loyalty_config.full_duration * 2):
            with changed_date(program_day):
                if program_day < self.loyalty_config.full_duration - 1:
                    self.assertFalse(self.loyalty.can_accept)
                else:
                    self.assertTrue(self.loyalty.can_accept)

    def test_recreate_program(self):
        self.assertEqual(LoginsLoyaltyProgram.objects.count(), 1)
        with self.assertRaises(LoginsLoyaltyProgram.CannotAccept):
            LoginsLoyaltyProgram.accept(self.user.id)
        with changed_date(self.loyalty_config.full_duration):
            LoginsLoyaltyProgram.accept(self.user.id)
        self.assertEqual(LoginsLoyaltyProgram.objects.count(), 1)
        self.user.save(update_fields=['last_visit'])
        self.assertEqual(LoginsLoyaltyProgram.objects.count(), 2)
