import datetime
import hashlib
import hmac
import json
import random
from collections import OrderedDict
from decimal import Decimal
from unittest.mock import patch

import responses
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.reverse import reverse
from rest_framework.test import APITestCase

from apps.games.models import Game, PlayerGameSession
from apps.payments.models import CreatedEvent, ErrorEvent, Payment, PaymentEvent, PaymentProject, PendingEvent
from apps.payments.utils import Constants
from apps.users.models import AuthenticatedPlayer
from apps.utils.payments import PaymentSystemManager


def user_data_factory():
    user_data_factory._next_id += 1
    user = get_user_model().objects.create(
        username=f'test_webhook_user #{user_data_factory._next_id}',
        email=f'test_webhook_user{user_data_factory._next_id}@fakemail.com'
    )
    player = AuthenticatedPlayer(user)
    return {
        'country': 'RU',
        'email': user.email,
        'id': player.id.hex,
        'ip': '8.8.8.8',
        'name': user.username,
        'phone': '+71239998877'
    }


user_data_factory._next_id = 0


def settings_data_factory():
    settings_data_factory._next_id += 1
    game = Game.objects.create(name=f'Webhook test game #{settings_data_factory._next_id}')
    project = PaymentProject.objects.create(
        game=game,
        id=settings_data_factory._next_id,
        secret_key=secret_key_factory(settings_data_factory._next_id),
        payment_system_name=Payment.XSOLLA
    )
    return {
        'merchant_id': settings_data_factory._next_id,
        'project_id': project.id
    }


settings_data_factory._next_id = 0


def secret_key_factory(project_id):
    return f'AAAaaa_secret_key{project_id}'


def transaction_data_factory():
    transaction_data_factory._next_id += 1
    return {
        'id': transaction_data_factory._next_id,
        'external_id': transaction_data_factory._next_id,
        'dry_run': 1,
        'agreement': 1
    }


transaction_data_factory._next_id = 0


def payment_transaction_data_factory():
    data = transaction_data_factory()
    data.update(
        {
            'payment_date': datetime.datetime.now().isoformat(),
            'payment_method': 1,
            'payment_method_name': 'PayPal',
            'payment_method_order_id': random.randrange(1, 1000000),
        }
    )
    return data


class CommonTestsMixin:
    def generate_signature(self, request_data):
        raw_json = json.dumps(request_data, separators=(',', ':')).encode()
        project_id = request_data['settings']['project_id']
        secret = secret_key_factory(project_id)
        self.assertTrue(
            PaymentProject.objects.filter(id=project_id, secret_key=secret, payment_system_name=Payment.XSOLLA).exists()
        )
        signature = hashlib.sha1(raw_json + secret.encode()).hexdigest()
        return f'Signature {signature}'

    def post(self, url, data, **kwargs):
        defaults = {'HTTP_X_FORWARDED_FOR': '185.30.20.1', 'format': 'json'}
        defaults.update(kwargs)
        signature = kwargs.get('HTTP_AUTHORIZATION', self.generate_signature(data))
        self.client.credentials(HTTP_AUTHORIZATION=signature)
        return self.client.post(url, data, **defaults)

    def test_invalid_signature(self):
        invalid_signature_header = {'HTTP_AUTHORIZATION': 'Signature nsdfu3fnfasd'}
        response = self.post(self.webhook_url, self.request_data, **invalid_signature_header)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'error': {'code': 'INVALID_SIGNATURE', 'message': 'Invalid signature'}})

    def test_invalid_user(self):
        self.request_data['user']['id'] = 'wrong_id'
        response = self.post(self.webhook_url, self.request_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'error': {'code': 'INVALID_USER', 'message': 'Invalid user'}})

    def test_invalid_parameter(self):
        del self.request_data['user']
        response = self.post(self.webhook_url, self.request_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'error': {'code': 'INVALID_USER', 'message': 'Invalid user'}})

    def test_invalid_amount(self):
        pass

    def test_invalid_invoice(self):
        pass


class PaymentTestsMixin:
    @responses.activate
    def test_sending_payment_to_game(self):
        self.post(self.webhook_url, self.request_data)
        self.game.webhook_url = 'https://game_webhook.ru/path'
        self.game.save()
        event_data = CreatedEvent.objects.get(payment=self.payment).data
        self.payment.refresh_from_db()
        data = OrderedDict(
            [
                ('game_sid', self.payment.game_session_id),
                ('player_id', self.payment.player_id.hex),
                ('app_id', self.payment.game_id),
                ('debug_mode', event_data.get('debug_mode')),
                ('purchase', event_data['purchase']),
                ('custom_parameters', event_data['custom_parameters']),
                ('state', self.payment.state),
                ('transaction_id', self.payment.id),
                ('token', self.payment.token),
            ]
        )
        signature = hmac.new(self.game.secret_key.encode(), json.dumps(data).encode(), hashlib.sha256).hexdigest()
        headers = {'Authorization': f'Signature {signature}', 'Content-Type': 'application/json'}
        responses.post(
            self.game.webhook_url,
            match=[
                responses.matchers.json_params_matcher(data),
                responses.matchers.header_matcher(headers)
            ]
        )
        self.post(self.webhook_url, self.request_data)
        responses.assert_call_count(self.game.webhook_url, 1)


class UserValidationTests(CommonTestsMixin, APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:xsolla_webhook')
        self.request_data = {
            'notification_type': 'user_validation',
            'settings': settings_data_factory(),
            'user': user_data_factory()
        }


class SuccessPaymentsTests(CommonTestsMixin, PaymentTestsMixin, APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:xsolla_webhook')
        self.request_data = {
            'notification_type': 'payment',
            'transaction': payment_transaction_data_factory(),
            'payment_details': {
                'direct_wht': {
                    'currency': 'RUB',
                    'amount': 0,
                    'percent': 0
                },
                'payment': {
                    'currency': 'RUB',
                    'amount': 230
                },
                'payment_method_fee': {
                    'currency': 'RUB',
                    'amount': 20
                },
                'payment_method_sum': {
                    'amount': 0,
                    'currency': 'RUB'
                },
                'payout': {
                    'currency': 'RUB',
                    'amount': 200
                },
                'payout_currency_rate': 1,
                'repatriation_commission': {
                    'currency': 'RUB',
                    'amount': 10
                },
                'sales_tax': {
                    'currency': 'RUB',
                    'amount': 0,
                    'percent': 0
                },
                'vat': {
                    'currency': 'RUB',
                    'amount': 0,
                    'percent': 20
                },
                'xsolla_fee': {
                    'currency': 'RUB',
                    'amount': 10
                },
                'xsolla_balance_sum': {
                    'currency': 'RUB',
                    'amount': 0
                },
            },
            'custom_parameters': {
                'parameter1': 'value1',
                'parameter2': 'value2'
            },
            'purchase': {
                'total': {
                    'amount': 200.0,
                    'currency': 'RUB',
                },
                'checkout': {
                    'currency': 'RUB',
                    'amount': 50
                },
                'coupon': {
                    'coupon_code': 'ICvj45S4FUOyy',
                    'campaign_code': '1507'
                },
                'promotions': [{
                    'technical_name': 'Demo Promotion',
                    'id': '853'
                }],
                'subscription': {
                    'plan_id': 'b5dac9c8',
                    'subscription_id': '10',
                    'product_id': 'Demo Product',
                    'date_create': '2014-09-22T19:25:25+04:00',
                    'date_next_charge': '2014-10-22T19:25:25+04:00',
                    'currency': 'RUB',
                    'amount': 9.99,
                    'tags': ['tag1', 'tag2']
                },
                'virtual_currency': {
                    'name': 'AGCoins',
                    'sku': 'test_package1',
                    'quantity': 10,
                    'currency': 'RUB',
                    'amount': 100
                },
                'virtual_items': {
                    'items': [
                        {
                            'sku': 'test_item1',
                            'amount': 1
                        }
                    ],
                    'currency': 'RUB',
                    'amount': 50
                },
            },
            'settings': settings_data_factory(),
            'user': user_data_factory(),
        }
        self.game = PaymentProject.objects \
            .get(id=self.request_data['settings']['project_id'], payment_system_name=Payment.XSOLLA).game
        self.session = PlayerGameSession.objects.create(player_id=self.request_data['user']['id'], game_id=self.game.id)
        self.payment = Payment.objects.create(
            id=self.request_data['transaction']['external_id'],
            player_id=self.request_data['user']['id'],
            game_session=self.session,
            game_id=self.session.game_id
        )
        self.payment_created_event = CreatedEvent.objects.create(
            _event_type=Constants.CREATED,
            payment=self.payment,
            data={
                'player_id': self.session.player.player_id,
                'game_id': self.session.game_id,
                'purchase': {
                    'items': [
                        {'name': 'item_1', 'price': 15.0, 'quantity': 4},
                        {'name': 'item_1', 'price': 20.0, 'quantity': 2},
                        {'name': 'item_2', 'price': 0.3, 'quantity': 1},
                    ],
                    'amount': self.request_data['purchase']['total']['amount'],
                    'currency': self.request_data['purchase']['total']['currency'],
                    'description': f'Покупка на {self.request_data["purchase"]["total"]["amount"]} рублей',
                },
                'project_id': self.session.game.paymentproject_set.get(payment_system_name=Payment.XSOLLA).id,
                'game_session_id': self.session.game_sid,
                'custom_parameters': {}
            }
        )
        self.balance = self.payment.player.balance
        PendingEvent.objects.create(payment=self.payment, data={})
        xsolla_payment_system = PaymentSystemManager._map_by_names[Payment.XSOLLA]
        patcher = patch.object(xsolla_payment_system, 'get_discount', return_value=Decimal('10.0'))
        self.get_discount_patched = patcher.start()
        self.addCleanup(patcher.stop)

    def test_get_payment_info(self):
        # TODO: более подробное сравнение данных в запросе и БД
        response = self.post(self.webhook_url, self.request_data)
        paid_event = self.payment.payment_events.last()
        self.payment.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNotNone(paid_event)
        self.assertEqual(paid_event.data, self.request_data)
        self.assertEqual([self.payment.state, self.payment.current_state, paid_event._event_type], [Constants.PAID] * 3)

    def test_invalid_amount(self):
        for amount in [-100, 0]:
            self.request_data['payment_details']['payment']['amount'] = amount
            response = self.post(self.webhook_url, self.request_data)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data, {'error': {'code': 'INCORRECT_AMOUNT', 'message': 'Incorrect amount'}})
            self.assertIsNone(ErrorEvent.objects.filter(payment=self.payment).last())

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


class RefundPaymentsTests(CommonTestsMixin, PaymentTestsMixin, APITestCase):
    def setUp(self) -> None:
        self.webhook_url = reverse('api:xsolla_webhook')
        self.request_data = {
            'notification_type': 'refund',
            'settings': settings_data_factory(),
            'purchase': {
                'virtual_currency': {
                    'name': 'AGCoins',
                    'quantity': 10,
                    'currency': 'RUB',
                    'amount': 100
                },
                'subscription': {
                    'plan_id': 'b5dac9c8',
                    'subscription_id': '10',
                    'product_id': 'Demo Product',
                    'date_create': '2014-09-22T19:25:25+04:00',
                    'date_next_charge': '2014-10-22T19:25:25+04:00',
                    'currency': 'RUB',
                    'amount': 9.99,
                    'tags': ['tag1', 'tag2']
                },
                'checkout': {
                    'currency': 'RUB',
                    'amount': 50
                },
                'virtual_items': {
                    'items': [
                        {
                            'sku': 'test_item1',
                            'amount': 1
                        }
                    ],
                    'currency': 'RUB',
                    'amount': 50
                },
                'total': {
                    'amount': 200.0,
                    'currency': 'RUB',
                }
            },
            'user': user_data_factory(),
            'transaction': transaction_data_factory(),
            'refund_details': {
                'code': 4,
                'reason': 'Potential fraud',
                'author': 'support@xsolla.com'
            },
            'payment_details': {
                'sales_tax': {
                    'currency': 'RUB',
                    'amount': 0,
                    'percent': 0
                },
                'direct_wht': {
                    'currency': 'RUB',
                    'amount': 0.70,
                    'percent': 0
                },
                'xsolla_fee': {
                    'currency': 'RUB',
                    'amount': 10
                },
                'payout': {
                    'currency': 'RUB',
                    'amount': 200
                },
                'payment_method_fee': {
                    'currency': 'RUB',
                    'amount': 20
                },
                'payment_method_sum': {
                    'amount': 0,
                    'currency': 'RUB'
                },
                'payout_currency_rate': 1,
                'payment': {
                    'currency': 'RUB',
                    'amount': 230
                },
                'repatriation_commission': {
                    'currency': 'RUB',
                    'amount': 10
                },
                'xsolla_balance_sum': {
                    'currency': 'RUB',
                    'amount': 0
                },
                'vat': {
                    'currency': 'RUB',
                    'amount': 0,
                    'percent': 20
                },
            }
        }
        self.game = PaymentProject.objects.get(
            id=self.request_data['settings']['project_id'], payment_system_name=Payment.XSOLLA
        ).game
        self.session = PlayerGameSession.objects.create(player_id=self.request_data['user']['id'], game=self.game)
        self.payment = Payment.objects.create(
            id=self.request_data['transaction']['external_id'],
            player_id=self.request_data['user']['id'],
            game_session=self.session,
            current_state=Constants.PAID,
            game_id=self.session.game_id
        )
        self.created_event = PaymentEvent(
            _event_type=Constants.CREATED,
            payment=self.payment,
            data={
                'player_id': self.session.player.player_id,
                'game_id': self.session.game_id,
                'purchase': {
                    'items': [
                        {'name': 'item_1', 'price': 15.0, 'quantity': 4},
                        {'name': 'item_1', 'price': 20.0, 'quantity': 2},
                        {'name': 'item_2', 'price': 0.3, 'quantity': 1},
                    ],
                    'amount': self.request_data['purchase']['total']['amount'],
                    'currency': self.request_data['purchase']['total']['currency'],
                    'description': f'Покупка на {self.request_data["purchase"]["total"]["amount"]} рублей',
                },
                'project_id': self.session.game.paymentproject_set.get(payment_system_name=Payment.XSOLLA).id,
                'game_session_id': self.session.game_sid,
                'custom_parameters': {}
            }
        )

        PaymentEvent.objects.bulk_create(
            [self.created_event, PaymentEvent(_event_type=Constants.PAID, payment=self.payment, data={})]
        )

    def test_get_refund_info(self):
        response = self.post(self.webhook_url, self.request_data)
        refund_event = self.payment.payment_events.last()
        self.payment.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIsNotNone(refund_event)
        self.assertEqual(refund_event.data, self.request_data)
        self.assertEqual(
            [self.payment.state, self.payment.current_state, refund_event._event_type], [Constants.REFUNDED] * 3
        )

    def test_invalid_amount(self):
        for amount in [-100, 0]:
            self.request_data['payment_details']['payment']['amount'] = amount
            response = self.post(self.webhook_url, self.request_data)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data, {'error': {'code': 'INCORRECT_AMOUNT', 'message': 'Incorrect amount'}})
            self.assertIsNone(ErrorEvent.objects.filter(payment=self.payment).last())

    @responses.activate
    def test_get_refund_before_paid(self):
        self.game.webhook_url = 'https://webhook_game.ru/path'
        self.game.save()
        self.payment.payment_events.exclude(_event_type=CreatedEvent.EVENT_TYPE).delete()
        self.payment.state = Constants.CREATED
        created_event = self.payment.payment_events.get()
        PendingEvent.objects.create(payment=self.payment, data={})
        data_for_game = OrderedDict(
            [
                ('game_sid', self.payment.game_session_id),
                ('player_id', self.payment.player_id),
                ('app_id', self.payment.game_id),
                ('debug_mode', created_event.data.get('debug_mode')),
                ('purchase', created_event.data['purchase']),
                ('custom_parameters', created_event.data['custom_parameters']),
                ('state', Constants.REFUNDED),
                ('transaction_id', self.payment.id),
                ('token', self.payment.token),
            ]
        )
        signature = hmac.new(
            self.session.game.secret_key.encode(), json.dumps(data_for_game).encode(), hashlib.sha256
        ).hexdigest()
        headers = {'Authorization': f'Signature {signature}', 'Content-Type': 'application/json'}
        responses.post(
            self.session.game.webhook_url,
            match=[
                responses.matchers.json_params_matcher(data_for_game),
                responses.matchers.header_matcher(headers)
            ]
        )
        self.post(self.webhook_url, self.request_data)
        self.payment.refresh_from_db()
        self.assertEqual(
            [self.payment.state, self.payment.current_state, self.payment.payment_events.last()._event_type],
            [Constants.REFUNDED] * 3
        )
        responses.assert_call_count(self.session.game.webhook_url, 1)
