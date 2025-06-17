import hashlib
import hmac
import json
import random
import uuid
from collections import OrderedDict
from decimal import Decimal
from unittest.mock import patch

import responses
from django.contrib.auth import get_user_model
from django.utils import timezone
from responses.matchers import header_matcher, json_params_matcher
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.games.models import Game, PlayerGameSession
from apps.payments.models import CanceledEvent, CreatedEvent, PaidEvent, Payment, PaymentProject, PendingEvent, \
    RefundedEvent
from apps.users.models import AuthenticatedPlayer
from apps.utils.payments import PaymentSystemManager


def payment_project_factory():
    payment_project_factory._next_id += 1
    game = Game.objects.create(name=f'Webhook test game #{payment_project_factory._next_id}')
    shop = PaymentProject.objects.create(id=payment_project_factory._next_id, game=game, payment_system_name=Payment.UKASSA)
    return {'account_id': shop.id, 'gateway_id': shop.id + random.randint(0, 10000)}
payment_project_factory._next_id = 0


def payment_method_data_factory():
    return {
        'id': str(uuid.uuid4()),
        'card': {
            'last4': '4477',
            'first6': '555555',
            'card_type': 'MasterCard',
            'expiry_year': '2030',
            'expiry_month': '01',
            'issuer_country': 'US'
        },
        'type': 'bank_card',
        'saved': False,
        'title': 'Bank card *4477'
    }


def authorization_details_data_factory():
    return {
        'rrn': random.randrange(100000000, 999999999),
        'auth_code': random.randrange(1, 999999),
        'three_d_secure': {
            'applied': True,
            'protocol': 'v1',
            'method_completed': False,
            'challenge_completed': True
        }
    }


def now_factory():
    return str(timezone.now())[:-9] + 'Z'


def amount_data_factory():
    return {'value': '100.30', 'currency': 'RUB'}


def object_data_factory():
    object_data_factory._next_id += 1
    recipient_data = payment_project_factory()
    user = get_user_model().objects.create(
        username=f'test_webhook_user #{object_data_factory._next_id}',
        email=f'test_webhook_user{object_data_factory._next_id}@fakemail.com'
    )
    game = PaymentProject.objects.get(id=recipient_data['account_id']).game
    payment = Payment.objects.create(
        player=user,
        game=game,
        game_session=PlayerGameSession.objects.create(player=user, game=game),
        current_state=PendingEvent.EVENT_TYPE
    )
    data = {
        'id': str(uuid.uuid4()),
        'paid': True,
        'test': True,
        'amount': amount_data_factory(),
        'status': 'succeeded',
        'metadata': {'external_id': payment.id},
        'recipient': recipient_data,
        'created_at': now_factory(),
        'refundable': True,
        'captured_at': now_factory(),
        'description': 'Покупка на 100 рублей 30 копеек',
        'income_amount': {'value': '96.79', 'currency': 'RUB'},
        'payment_method': payment_method_data_factory(),
        'refunded_amount': {'value': '0.00', 'currency': 'RUB'},
        'merchant_customer_id': AuthenticatedPlayer(user).id.hex,
        'authorization_details': authorization_details_data_factory(),
    }
    PendingEvent.objects.bulk_create([PendingEvent(payment=payment, data=data, _event_type=PendingEvent.EVENT_TYPE)])
    return data
object_data_factory._next_id = 0


def refund_object_data_factory():
    paid_data = paid_data_factory()
    payment = Payment.objects.get(id=paid_data['object']['metadata']['external_id'])
    PaidEvent.objects.create(payment=payment, data=paid_data)
    return {
        'id': str(uuid.uuid4()),
        'amount': paid_data['object']['amount'],
        'status': 'succeeded',
        'created_at': now_factory(),
        'payment_id': paid_data['object']['id']
    }


def paid_data_factory():
    return {'type': 'notification', 'event': 'payment.succeeded', 'object': object_data_factory()}


def canceled_data_factory():
    return {'type': 'notification', 'event': 'payment.canceled', 'object': object_data_factory()}


def refunded_data_factory():
    return {'type': 'notification', 'event': 'refund.succeeded', 'object': refund_object_data_factory()}


class PaymentSucceededWebhookTestCase(APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:ukassa_webhook')
        self.request_data = paid_data_factory()
        self.payment = Payment.objects.get(id=self.request_data['object']['metadata']['external_id'])
        self.game = self.payment.game
        self.balance = self.payment.player.balance
        ukassa_payment_system = PaymentSystemManager._map_by_names[Payment.UKASSA]
        patcher = patch.object(ukassa_payment_system, 'get_discount', return_value=Decimal('10.0'))
        self.get_discount_patched = patcher.start()
        self.addCleanup(patcher.stop)

    def post(self, url, data, **kwargs):
        defaults = dict(HTTP_X_FORWARDED_FOR='185.71.76.10', format='json', **kwargs)
        return self.client.post(url, data, **defaults)

    def test_success_paid(self):
        response = self.post(self.webhook_url, data=self.request_data)
        self.payment.refresh_from_db()
        event = self.payment.payment_events.last()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(event)
        self.assertEqual(
            [self.payment.state, self.payment.current_state, event._event_type], [PaidEvent.EVENT_TYPE] * 3
        )
        self.assertEqual(event.data, self.request_data)

    @responses.activate
    def test_send_data_to_game(self):
        Game.objects.filter(id=self.payment.game_id).update(webhook_url='https://game-url.ru/path')
        self.game.refresh_from_db()
        data = {
            'game_sid': self.payment.game_session_id,
            'player_id': self.payment.player_id.hex,
            'app_id': self.game.id,
            'debug_mode': True,
            'purchase': {
                'items': [
                    {'name': 'item_1', 'price': 15.0, 'quantity': 4},
                    {'name': 'item_1', 'price': 20.0, 'quantity': 2},
                    {'name': 'item_2', 'price': 0.3, 'quantity': 1},
                ],
                'amount': self.request_data['object']['amount'],
                'description': self.request_data['object']['description'],
            },
            'custom_parameters': {'key': 'value'},
        }
        created_event = CreatedEvent(payment=self.payment, data=data, _event_type=CreatedEvent.EVENT_TYPE)
        CreatedEvent.objects.bulk_create([created_event])
        data = OrderedDict(data, state=PaidEvent.EVENT_TYPE, transaction_id=self.payment.id, token=self.payment.token)
        signature = hmac.new(self.game.secret_key.encode(), json.dumps(data).encode(), hashlib.sha256).hexdigest()
        headers = {'Authorization': f'Signature {signature}', 'Content-Type': 'application/json'}
        responses.post(self.game.webhook_url, match=[json_params_matcher(data), header_matcher(headers)])
        self.post(self.webhook_url, data=self.request_data)
        responses.assert_call_count(self.game.webhook_url, 1)

    def test_withdraw_bonuses(self):
        self.balance.bonuses = 100
        self.balance.save()
        self.post(self.webhook_url, self.request_data)
        self.balance.refresh_from_db(fields=['bonuses'])
        self.assertEqual(self.balance.bonuses, Decimal('90.0'))

        self.post(self.webhook_url, self.request_data)
        self.balance.refresh_from_db(fields=['bonuses'])
        self.assertEqual(self.balance.bonuses, Decimal('90.0'))

    def test_withdraw_all_bonuses(self):
        self.balance.bonuses = 100
        self.balance.save()
        self.get_discount_patched.return_value = 1000

        self.post(self.webhook_url, self.request_data)
        self.balance.refresh_from_db(fields=['bonuses'])
        self.assertEqual(self.balance.bonuses, Decimal('0.0'))

class PaymentCanceledWebhookTestCase(APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:ukassa_webhook')
        self.request_data = canceled_data_factory()
        self.payment = Payment.objects.get(id=self.request_data['object']['metadata']['external_id'])
        self.game = self.payment.game

    def post(self, url, data, **kwargs):
        defaults = dict(HTTP_X_FORWARDED_FOR='185.71.76.10', format='json', **kwargs)
        return self.client.post(url, data, **defaults)

    def test_success_canceled(self):
        response = self.post(self.webhook_url, data=self.request_data)
        self.payment.refresh_from_db()
        event = self.payment.payment_events.last()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(event)
        self.assertEqual(
            [self.payment.state, self.payment.current_state, event._event_type], [CanceledEvent.EVENT_TYPE] * 3
        )
        self.assertEqual(event.data, self.request_data)


class PaymentRefundedWebhookTestCase(APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:ukassa_webhook')
        self.request_data = refunded_data_factory()

        self.payment = Payment.objects.get(
            payment_events__data__object__id=self.request_data['object']['payment_id']
        )
        self.payment.state = PaidEvent.EVENT_TYPE
        self.payment.save()
        self.game = self.payment.game

    def post(self, url, data, **kwargs):
        defaults = dict(HTTP_X_FORWARDED_FOR='185.71.76.10', format='json', **kwargs)
        return self.client.post(url, data, **defaults)

    def test_success_refund(self):
        response = self.post(self.webhook_url, data=self.request_data)
        self.payment.refresh_from_db()
        event = self.payment.payment_events.last()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(event)
        self.assertEqual(
            [self.payment.state, self.payment.current_state, event._event_type], [RefundedEvent.EVENT_TYPE] * 3
        )
        self.assertEqual(event.data, self.request_data)

    @responses.activate
    def test_send_data_to_game(self):
        Game.objects.filter(id=self.payment.game_id).update(webhook_url='https://game-url.ru/path')
        self.game.refresh_from_db()
        paid_event = PaidEvent.objects.get(payment=self.payment)
        data = {
            'game_sid': self.payment.game_session_id,
            'player_id': self.payment.player_id.hex,
            'app_id': self.game.id,
            'debug_mode': True,
            'purchase': {
                'items': [{'name': 'item_1', 'price': paid_event.data['object']['amount']['value'], 'quantity': 1}],
                'amount': paid_event.data['object']['amount'],
                'description': paid_event.data['object']['description'],
            },
            'custom_parameters': {'key': 'value'},
        }
        created_event = CreatedEvent(payment=self.payment, data=data, _event_type=CreatedEvent.EVENT_TYPE)
        CreatedEvent.objects.bulk_create([created_event])
        data = OrderedDict(
            data, state=RefundedEvent.EVENT_TYPE, transaction_id=self.payment.id, token=self.payment.token
        )
        signature = hmac.new(self.game.secret_key.encode(), json.dumps(data).encode(), hashlib.sha256).hexdigest()
        headers = {'Authorization': f'Signature {signature}', 'Content-Type': 'application/json'}
        responses.post(self.game.webhook_url, match=[json_params_matcher(data), header_matcher(headers)])
        self.post(self.webhook_url, data=self.request_data)
        responses.assert_call_count(self.game.webhook_url, 1)

    def test_get_refund_before_paid(self):
        self.payment.state = PendingEvent.EVENT_TYPE
        self.payment.save()
        response = self.post(self.webhook_url, data=self.request_data)
        self.payment.refresh_from_db()
        event = self.payment.payment_events.last()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(event)
        self.assertEqual(
            [self.payment.state, self.payment.current_state, event._event_type], [RefundedEvent.EVENT_TYPE] * 3
        )
        self.assertEqual(event.data, self.request_data)
