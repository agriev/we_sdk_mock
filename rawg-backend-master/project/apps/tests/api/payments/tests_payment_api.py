import hashlib
import hmac
import json
import re
import typing
from unittest.mock import patch
from urllib import parse

import responses
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.reverse import reverse

from apps.games.models import Game, PlayerGameSession
from apps.payments.models import CreatedEvent, LLPConfig, LoginsLoyaltyProgram, Payment, PaymentEvent, PaymentProject, \
    PendingEvent
from apps.payments.utils import Constants
from apps.users.models import Balance
from apps.utils.payments import ANY_CURRENCY, PaymentSystemManager
from apps.utils.tests import APITestCase, changed_date


class GetTokenTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games', 'payments_projects'
    ]

    @classmethod
    def setUpTestData(cls):
        cls.user_1 = get_user_model().objects.create(
            username='test_token_user', email='test_token_user@gmail.com', password='123'
        )
        cls.user_2 = get_user_model().objects.create(
            username='test_token_user_2', email='test_token_user_2@gmail.com', password='321'
        )

        cls.game_1 = Game.objects.filter(can_play=True, paymentproject__isnull=False).first()
        cls.game_2 = Game.objects.exclude(pk=cls.game_1.pk).filter(can_play=True, paymentproject__isnull=False).first()
        cls.not_playable_game = Game.objects.filter(can_play=False, paymentproject__isnull=False).first()

        cls.payment_project_1 = PaymentProject.objects.filter(game=cls.game_1).first()
        cls.payment_project_2 = PaymentProject.objects.filter(game=cls.game_2).first()
        cls.not_playable_payment_project = PaymentProject.objects.filter(game=cls.not_playable_game).first()

        cls.session_1 = PlayerGameSession.objects.create(game=cls.game_1, player=cls.user_1)
        cls.session_2 = PlayerGameSession.objects.create(game=cls.game_2, player=cls.user_2)
        cls.not_playable_session = PlayerGameSession.objects.create(game=cls.not_playable_game, player=cls.user_2)
        cls.url = reverse('api:payment_token-list')

    def setUp(self) -> None:
        self.request_data = {
            'player_id': self.user_1.player_id.hex,
            'game_sid': self.session_1.game_sid,
            'app_id': self.game_1.pk,
            'debug_mode': True,
            'purchase': {
                'currency': 'RUB',
                'amount': 100.3,
                'description': 'Покупка на 100 рублей 30 копеек',
                'items': [
                    {
                        'name': 'item_1',
                        'quantity': 4,
                        'price': 15
                    },
                    {
                        'name': 'item_1',
                        'quantity': 2,
                        'price': 20
                    },
                    {
                        'name': 'item_2',
                        'quantity': 1,
                        'price': 0.3
                    },
                ],
            },
        }
        self.make_signature(self.request_data, self.game_1.secret_key)

    def make_signature(self, request_data, secret_key):
        raw_json = json.dumps(request_data, ensure_ascii=False, separators=(',', ':')).encode()
        signature = hmac.new(secret_key.encode(), raw_json, hashlib.sha256).hexdigest()
        self.client.credentials(HTTP_AUTHORIZATION=f'Signature {signature}')

    def test_get_token(self):
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_invalid_signature(self):
        self.make_signature(self.request_data, 'wrong_secret')
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_wrong_app_id(self):
        game = Game.objects.exclude(pk=self.game_1.pk).last()
        self.make_signature(self.request_data, game.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_game_sid(self):
        self.request_data['game_sid'] += 'A'
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_not_playable_game(self):
        self.request_data['app_id'] = self.not_playable_game.id
        self.request_data['game_sid'] = self.not_playable_session.game_sid
        self.request_data['player_id'] = self.user_2.player_id.hex
        self.make_signature(self.request_data, self.not_playable_game.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_game_sid_from_another_game(self):
        self.request_data['game_sid'] = self.session_2.game_sid
        self.make_signature(self.request_data, self.game_2.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_has_not_played_yet(self):
        self.request_data['player_id'] = self.user_2.player_id.hex
        self.request_data['game_sid'] = self.session_2.game_sid
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_player_id(self):
        self.request_data['player_id'] = self.request_data['player_id'][:-2] + 'a4'
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertListEqual(
            [str(i) for i in response.data['player_id']],
            ['Player not found']
        )

    def test_invalid_purchase_amount(self):
        for amount in [-100, -1]:
            self.request_data['purchase']['amount'] = amount
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data,
            {'purchase': {'amount': ['Ensure this value is greater than or equal to 0.']}}
        )

    def test_empty_items_list(self):
        self.request_data['purchase']['items'] = []
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {'purchase': {'items': ['Items list may not be empty.']}})

    def test_all_items_cost_not_equal_total(self):
        self.request_data['purchase']['items'][0]['price'] = 10
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data, {'purchase': ['Cost of all purchased items is not equal to the total purchase cost.']}
        )

    def test_wrong_item_price_amount(self):
        self.request_data['purchase']['items'][0]['price'] = -10.2
        self.make_signature(self.request_data, self.game_1.secret_key)
        response = self.client.post(self.url, self.request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data['purchase']['items'][0]['price'], ['Ensure this value is greater than or equal to 0.']
        )


class PaymentTransactionTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games', 'payments_projects'
    ]

    @classmethod
    def setUpTestData(cls):
        cls.user_1 = get_user_model().objects.create(
            username='test_token_user', email='test_token_user@gmail.com', password='123'
        )
        cls.game_1 = Game.objects.filter(can_play=True, paymentproject__isnull=False).first()
        cls.game_session_1 = PlayerGameSession.objects.create(game=cls.game_1, player=cls.user_1)
        cls.payment_project_1 = PaymentProject.objects.filter(game=cls.game_1).first()
        cls.payment = Payment.objects.create(
            player_id=cls.user_1.player_id, game_session=cls.game_session_1, game=cls.game_1
        )
        cls.event = CreatedEvent(
            payment=cls.payment,
            data={
                'player_id': cls.game_session_1.player_id.hex,
                'game_id': cls.game_session_1.game_id,
                'purchase': {
                    'items': [
                        {'name': 'item_1', 'price': 15.0, 'quantity': 4},
                        {'name': 'item_1', 'price': 20.0, 'quantity': 2},
                        {'name': 'item_2', 'price': 0.3, 'quantity': 1},
                    ],
                    'amount': 100.3,
                    'currency': 'RUB',
                    'description': f'Покупка на 100 рублей 30 копеек',
                },
                'game_session_id': cls.game_session_1.game_sid,
                'custom_parameters': {}
            },
        )
        cls.event.save()
        cls.base_url = reverse('api:payment_transaction')
        cls.query = {'transaction_id': cls.payment.id}
        cls.url = parse.urlunparse(('', '', cls.base_url, '', parse.urlencode(cls.query), ''))

    def setUp(self) -> None:
        self.make_signature(self.query, self.game_1.secret_key)

    def make_signature(self, query, secret_key):
        message = ''.join(map(str, sorted(query.values())))
        signature = hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
        self.client.credentials(HTTP_AUTHORIZATION=f'Signature {signature}')

    def test_get_transaction(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'game_sid': self.game_session_1.game_sid,
                'player_id': self.user_1.player_id.hex,
                'app_id': self.game_1.pk,
                'debug_mode': None,
                'purchase': self.event.data['purchase'],
                'custom_parameters': {},
                'state': self.payment.state,
                'transaction_id': self.payment.id,
                'token': self.payment.token,
            }
        )

    def test_wrong_transaction_id(self):
        query = {'transaction_id': self.payment.id + 10}
        url = parse.urlunparse(('', '', self.base_url, '', parse.urlencode(query), ''))
        self.make_signature(query, self.game_1.secret_key)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_transaction_id(self):
        for transaction_id in (0, -10):
            query = {'transaction_id': transaction_id}
            url = parse.urlunparse(('', '', self.base_url, '', parse.urlencode(query), ''))
            self.make_signature(query, self.game_1.secret_key)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PaymentTestCase(APITestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games', 'payments_projects'
    ]

    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(
            username='test_token_user', email='test_token_user@gmail.com', password='123'
        )
        cls.user_2 = get_user_model().objects.create_user(
            username='test_user_2', email='test_user_2@ya.ru', password='321'
        )
        cls.game = Game.objects.filter(can_play=True, paymentproject__isnull=False).first()

        cls.game_session = PlayerGameSession.objects.create(game=cls.game, player=cls.user)
        cls.payment_project = PaymentProject.objects.filter(game=cls.game).first()
        cls.payment_project_2 = PaymentProject.objects.create(
            payment_system_name=Payment.XSOLLA, id=111, secret_key='secretkeyabc', game_id=cls.game.id
        )

    def setUp(self) -> None:
        self.client.login(username='test_token_user', password='123')
        self.client_data = {
            'player_id': self.user.player_id.hex,
            'app_id': self.game.id,
            'game_sid': self.game_session.game_sid,
            'debug_mode': True,
            'custom_parameters': {'key': 'val'},
            'purchase': {
                'currency': 'RUB',
                'amount': 100.3,
                'description': 'Покупка на 100 рублей 30 копеек',
                'items': [
                    {'name': 'item_1', 'quantity': 4, 'price': 15},
                    {'name': 'item_1', 'quantity': 2, 'price': 20},
                    {'name': 'item_2', 'quantity': 1, 'price': 0.3}
                ]
            }
        }
        self.client_2 = self.client_class()
        self.client_2.login(username='test_user_2', password='321')

        self.make_signature(self.client_data, secret_key=self.game.secret_key)
        self.token_response = {'system': self.payment_project.payment_system_name, 'token': 'ABC112223'}
        patcher = patch('apps.utils.payments.BasePaymentSystem.token')
        get_token_patched = patcher.start()
        get_token_patched.return_value = self.token_response
        self.addCleanup(patcher.stop)

    def make_signature(self, request_data, secret_key):
        raw_json = json.dumps(request_data, ensure_ascii=False, separators=(',', ':')).encode()
        signature = hmac.new(secret_key.encode(), raw_json, hashlib.sha256).hexdigest()
        self.client.credentials(HTTP_AUTHORIZATION=f'Signature {signature}')

    def test_create_payment(self):
        response = self.client.post(reverse('api:payment-list'), data=self.client_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payment = Payment.objects.last()
        self.assertIsNotNone(payment)
        self.assertEqual(payment.state, Constants.CREATED)
        self.assertEqual(payment.payment_events.count(), 1)
        created_event = CreatedEvent.objects.get(payment=payment)
        self.assertEqual(payment.last_success_event_id, created_event.id)
        self.assertEqual(response.data, dict(transaction_id=payment.id, token=payment.token))

    def test_invalid_signature(self):
        self.make_signature(self.client_data, self.game.secret_key + '_WRONG')
        response = self.client.post(reverse('api:payment-list'), data=self.client_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Payment.objects.all())
        self.assertFalse(PaymentEvent.objects.all())

    def test_invalid_methods(self):
        methods_by_urls = {
            reverse('api:payment-list'): ['put', 'patch', 'delete'],
            reverse('api:payment-detail', kwargs={'id': Payment.objects.create().id}): ['get', 'put', 'delete', 'post'],
            reverse('api:payment_token-token'): ['get', 'put', 'patch', 'delete'],
        }
        self.client.login(username=self.user.username, password='123')
        for url, methods in methods_by_urls.items():
            for method in methods:
                response = getattr(self.client, method)(url)
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_validate_payment_with_wrong_state(self):
        common_invalid_sources = [
            Constants.INITIAL, Constants.CREATED, Constants.PENDING, Constants.CANCELED, Constants.ERROR
        ]
        invalid_sources_by_targes = {
            Constants.PAYMENT_CONFIRMED: common_invalid_sources + [Constants.REFUNDED, Constants.REFUND_CONFIRMED],
            Constants.REFUND_CONFIRMED: common_invalid_sources + [Constants.PAID, Constants.PAYMENT_CONFIRMED],

        }
        for target, sources in invalid_sources_by_targes.items():
            for source in sources:
                payment = Payment.objects.create(
                    player=self.user, game=self.game, game_session=self.game_session, current_state=source
                )
                PaymentEvent.objects.bulk_create(
                    [CreatedEvent(payment=payment, data=self.client_data, _event_type=CreatedEvent.EVENT_TYPE)]
                )
                url = reverse('api:payment-detail', kwargs={'id': payment.id})
                response = self.client.patch(url, data=dict(state=target), format='json')
                if source == Constants.INITIAL:
                    self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
                else:
                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                    self.assertEqual(response.data, dict(state=['Invalid state.']))
                self.assertEqual(payment.payment_events.count(), 1)

    def test_validate_payment(self):
        sources_by_targets = {
            Constants.PAYMENT_CONFIRMED: [Constants.PAID, Constants.PAYMENT_CONFIRMED],
            Constants.REFUND_CONFIRMED: [Constants.REFUNDED, Constants.REFUND_CONFIRMED]
        }
        for target, sources in sources_by_targets.items():
            for source in sources:
                payment = Payment.objects.create(
                    player=self.user, game=self.game, game_session=self.game_session, current_state=source
                )
                PaymentEvent.objects.bulk_create(
                    [CreatedEvent(payment=payment, data=self.client_data, _event_type=CreatedEvent.EVENT_TYPE)]
                )
                url = reverse('api:payment-detail', kwargs={'id': payment.id})
                data = dict(state=target)
                self.make_signature(data, self.game.secret_key)
                response = self.client.patch(url, data=data, format='json')
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data, dict(state=target))
                payment.refresh_from_db()
                self.assertEqual(payment.payment_events.count(), 2)
                event = payment.payment_events.last()
                self.assertEqual([payment.state, payment.current_state, event._event_type], [target] * 3)

    def test_list_payments(self):
        url = parse.urlunparse(
            ('', '', reverse('api:payment-list'), '', parse.urlencode({'app_id': self.game.id}), '')
        )
        signature = hmac.new(self.game.secret_key.encode(), str(self.game.id).encode(), hashlib.sha256).hexdigest()
        self.client.credentials(HTTP_AUTHORIZATION=f'Signature {signature}')
        for state in Constants.STATES:
            payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
            CreatedEvent.objects.create(payment=payment, data=self.client_data)
            payment.state = state
            payment.save()
        response = self.client.get(url)
        payments = Payment.objects.exclude(current_state=Constants.INITIAL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [response.data['count'], payments.count()],
            [len(Constants.STATES) - 1] * 2
        )
        for payment_data, payment in zip(response.data['results'], payments):
            data_event = payment.payment_events.first().data
            self.assertEqual(payment_data['game_sid'], self.game_session.game_sid)
            self.assertEqual(payment_data['player_id'], self.user.player_id.hex)
            self.assertEqual(payment_data['app_id'], self.game.id)
            self.assertEqual(payment_data['debug_mode'], data_event.get('debug_mode'))
            self.assertEqual(payment_data['purchase'], data_event['purchase'])
            self.assertEqual(payment_data['custom_parameters'], data_event.get('custom_parameters', {}))
            self.assertEqual(payment_data['state'], payment.state)
            self.assertEqual(payment_data['transaction_id'], payment.id)
            self.assertEqual(payment_data['token'], payment.token)

    def test_filter_payments(self):
        url = reverse('api:payment-filter')
        request_data = {'app_id': self.game.id, 'player_id': self.user.player_id.hex}
        self.make_signature(request_data, self.game.secret_key)
        for state in Constants.STATES:
            payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
            CreatedEvent.objects.create(payment=payment, data=self.client_data)
            payment.state = state
            payment.save()
        response = self.client.post(url, data=request_data, format='json')
        payments = Payment.objects.exclude(current_state=Constants.INITIAL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [response.data['count'], payments.count()],
            [len(Constants.STATES) - 1] * 2
        )
        for payment_data, payment in zip(response.data['results'], payments):
            data_event = payment.payment_events.first().data
            self.assertDictEqual(
                payment_data,
                {
                    'game_sid': self.game_session.game_sid,
                    'player_id': self.user.player_id.hex,
                    'app_id': self.game.id,
                    'debug_mode': data_event.get('debug_mode'),
                    'purchase': data_event['purchase'],
                    'custom_parameters': data_event.get('custom_parameters', {}),
                    'state': payment.state,
                    'transaction_id': payment.id,
                    'token': payment.token
                }
            )

    def test_invalid_query_list_payments(self):
        url = parse.urlunparse(('', '', reverse('api:payment-list'), '', '', ''))
        signature = hmac.new(self.game.secret_key.encode(), str(self.game.id).encode(), hashlib.sha256).hexdigest()
        self.client.credentials(HTTP_AUTHORIZATION=f'Signature {signature}')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, dict(app_id=['This field is required.']))

    def test_get_payment_token(self):
        for name in PaymentSystemManager._map_by_names:
            with patch.object(PaymentSystemManager._map_by_names[name], 'send_data', return_value={}):
                payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
                CreatedEvent.objects.create(payment=payment, data=self.client_data)
                url = reverse('api:payment_token-token')
                request_data = {'token': payment.token, 'payment_system': name}
                self.make_signature(request_data, self.game.secret_key)
                response = self.client.post(url, data=request_data, format='json')
                payment.refresh_from_db()
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data, self.token_response)
                self.assertEqual(
                    [payment.state, payment.current_state, payment.last_success_event._event_type],
                    [PendingEvent.EVENT_TYPE] * 3
                )

    def test_get_payment_token_another_user(self):
        for name in PaymentSystemManager._map_by_names:
            with patch.object(PaymentSystemManager._map_by_names[name], 'send_data', return_value={}):
                payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
                CreatedEvent.objects.create(payment=payment, data=self.client_data)
                url = reverse('api:payment_token-token')
                request_data = {'token': payment.token, 'payment_system': name}
                response = self.client_2.post(url, data=request_data, format='json')
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(response.data['error'][0], 'invalid_user')

    def test_get_payment_token_unauth(self):
        self.client_2.logout()
        for name in PaymentSystemManager._map_by_names:
            with patch.object(PaymentSystemManager._map_by_names[name], 'send_data', return_value={}):
                payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
                CreatedEvent.objects.create(payment=payment, data=self.client_data)
                url = reverse('api:payment_token-token')
                request_data = {'token': payment.token, 'payment_system': name}
                self.make_signature(request_data, self.game.secret_key)
                response = self.client_2.post(url, data=request_data, format='json')
                self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_payment_token_invalid_system_name(self):
        payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data)
        url = reverse('api:payment_token-token')
        request_data = {'token': payment.token, 'payment_system': 'some'}
        self.make_signature(request_data, self.game.secret_key)
        response = self.client.post(url, data=request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['payment_system'][0], 'not_registered')

    def test_get_payment_token_invalid_internal_token(self):
        non_existent_token = 'non_existent_token'
        payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data)
        url = reverse('api:payment_token-token')
        request_data = {'token': non_existent_token, 'payment_system': list(PaymentSystemManager._map_by_names.items())[0][0]}
        self.make_signature(request_data, self.game.secret_key)
        response = self.client.post(url, data=request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['token'][0], 'token_not_found')

    def test_get_payment_token_wrong_currency(self):
        payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
        self.client_data['purchase']['currency'] = 'wrong_currency'
        CreatedEvent.objects.create(payment=payment, data=self.client_data)
        for payment_system in PaymentSystemManager._map_by_names.values():
            with patch.object(payment_system, 'send_data', return_value={}):
                request_data = {'token': payment.token, 'payment_system': payment_system.NAME}
                self.make_signature(request_data, self.game.secret_key)
                response = self.client.post(reverse('api:payment_token-token'), data=request_data, format='json')
                if ANY_CURRENCY in payment_system.AVAILABLE_CURRENCIES:
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                else:
                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_by_token_auth(self):
        payment = Payment.objects.create(player=self.user, game=self.game, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data, _event_type=CreatedEvent.EVENT_TYPE)
        url = reverse('api:payment-by-token', kwargs={'token': payment.token})
        for state in Constants.STATES:
            payment.current_state = state
            payment.save()
            response = self.client.get(url)
            if state == Constants.INITIAL:
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
            else:
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data, {'transaction_id': payment.id, 'player_id': payment.player_id.hex})

    def test_by_token_unauth(self):
        payment = Payment.objects.create(player=self.user, game=self.game, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data, _event_type=CreatedEvent.EVENT_TYPE)
        self.client.logout()
        url = reverse('api:payment-by-token', kwargs={'token': payment.token})
        for state in Constants.STATES:
            payment.current_state = state
            payment.save()
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_by_token_another_user(self):
        payment = Payment.objects.create(player=self.user, game=self.game, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data, _event_type=CreatedEvent.EVENT_TYPE)
        url = reverse('api:payment-by-token', kwargs={'token': payment.token})
        for state in Constants.STATES:
            payment.current_state = state
            payment.save()
            response = self.client_2.get(url)
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @responses.activate
    def test_payment_system_unavailable(self):
        for name in PaymentSystemManager._map_by_names:
            payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
            CreatedEvent.objects.create(payment=payment, data=self.client_data)
            url = reverse('api:payment_token-token')
            request_data = {'token': payment.token, 'payment_system': name}
            self.make_signature(request_data, self.game.secret_key)
            rsp = responses.Response(method='POST', url=re.compile(r'.*'), status=404)
            responses.add(rsp)
            response = self.client.post(url, data=request_data, format='json')
            self.assertEqual(response.data['error'], 'Payment services unavailable now')

    @responses.activate
    def test_withdraw_bonuses(self):
        self.user.balance.top_up_bonuses(300)
        payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data)
        url = reverse('api:payment_token-token')
        request_data = {'token': payment.token, 'payment_system': 'xsolla'}
        self.make_signature(request_data, self.game.secret_key)

        rsp = responses.Response(
            method=responses.POST, url=re.compile(r'.*'), json={'token': 'ABC123'}, match=self._xsolla_data_matchers()
        )

        responses.add(rsp)
        response = self.client.post(url, data=request_data, format='json')
        self.user.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        responses.add(responses.Response(method=responses.POST, url=re.compile(r'.*'), json={'token': 'ABC123'}))
        request_data['payment_system'] = 'ukassa'
        response = self.client.post(url, data=request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    @responses.activate
    def test_withdraw_all_bonuses(self):
        self.user.balance.top_up_bonuses(0.01)
        payment = Payment.objects.create(game=self.game, player=self.user, game_session=self.game_session)
        CreatedEvent.objects.create(payment=payment, data=self.client_data)
        url = reverse('api:payment_token-token')
        request_data = {'token': payment.token, 'payment_system': 'xsolla'}
        self.make_signature(request_data, self.game.secret_key)

        items_matcher = [dict(name=i['name'], quantity=i['quantity'], price={'amount': str(float(i['price']))})
                         for i in self.client_data['purchase']['items']]
        items_matcher[2]['price']['amount'] = '0.29'
        matchers = [
            responses.matchers.json_params_matcher(
                {'purchase': {'checkout': {'amount': 100.29}}}, strict_match=False
            ),
            responses.matchers.json_params_matcher(
                {'purchase': {'description': {'items': items_matcher}}}, strict_match=False
            )
        ]
        rsp = responses.Response(
            method=responses.POST, url=re.compile(r'.*'), json={'token': 'ABC123'}, match=matchers
        )

        responses.add(rsp)
        response = self.client.post(url, data=request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        responses.add(responses.Response(method=responses.POST, url=re.compile(r'.*'), json={'token': 'ABC123'}))
        request_data['payment_system'] = 'ukassa'
        response = self.client.post(url, data=request_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _xsolla_data_matchers(self) -> typing.List:
        items_matcher = [dict(name=i['name'], quantity=i['quantity'], price={'amount': str(i['price'] / 2)})
                         for i in self.client_data['purchase']['items']]
        return [
            responses.matchers.json_params_matcher({'purchase': {'checkout': {'amount': 50.15}}}, strict_match=False),
            responses.matchers.json_params_matcher(
                {'purchase': {'description': {'items': items_matcher}}}, strict_match=False
            )
        ]


class APILoginLoyaltyProgramTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.url = reverse('api:logins_loyalty_program')
        cls.password = '123'

    def setUp(self) -> None:
        self.loyalty_config = LLPConfig.objects.create(
            active=True, full_duration=28, stage_duration=7, lives=2, hot_streak_factor=0.15, serial_hot_streak=2,
            weekly_logins_hot_streak=3, bonus_per_day=5
        )
        self.user = get_user_model().objects.create_user(username='gamer', email='gamer@gm.com', password=self.password)
        self.balance = Balance.objects.get(user_id=self.user.id)
        self.program = LoginsLoyaltyProgram.objects.get()
        self.client.login(username=self.user.username, password=self.password)

    def test_get(self):
        for day in range(self.loyalty_config.full_duration + 10):
            with changed_date(day):
                self.program = LoginsLoyaltyProgram.objects.get(id=self.program.id)
                response = self.client.get(self.url)
                self.assertEqual(response.status_code, status.HTTP_200_OK)
                result = [
                    dict(is_visited=is_visited, hot_streak=False, used_save=False)
                    for is_visited in self.program.logins_as_bits_array[:self.program.completed_days]
                ]
                for index in self.program.hot_streak_days:
                    result[index]['hot_streak'] = True

                for date in self.program.saved_days:
                    result[(date - self.program.start_date).days]['used_save'] = True
                self.assertEqual(response.data['logins'], result)

    def test_get_guest(self):
        self.client.logout()
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(LoginsLoyaltyProgram.objects.count(), 1)

    def test_not_found(self):
        with changed_date(self.loyalty_config.full_duration):
            self.client.get(self.url)
            LoginsLoyaltyProgram.accept(user_id=self.user.id)
            self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
            self.assertFalse(LoginsLoyaltyProgram.objects.not_accepted().filter(user=self.user).exists())

            self.program.delete()

            self.assertEqual(self.client.get(self.url).status_code, status.HTTP_404_NOT_FOUND)
            self.assertFalse(LoginsLoyaltyProgram.objects.exists())

    def test_restart(self):
        for interval in range(5):
            LoginsLoyaltyProgram.objects.not_accepted().filter(user_id=self.user.id).update(accepted=True)
            with changed_date(interval):
                response = self.client.get(self.url)
                if interval == 0:
                    self.assertEqual(
                        response.status_code,
                        status.HTTP_404_NOT_FOUND,
                        'the new program should start only the next day.'
                    )
                    self.assertEqual(LoginsLoyaltyProgram.objects.count(), 1)
                else:
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertEqual(response.data['completed_days'], 1)
                    self.assertEqual(LoginsLoyaltyProgram.objects.count(), interval + 1)

    def test_post(self):
        bonuses = 0
        for interval in range(self.loyalty_config.full_duration + 10):
            with changed_date(interval):
                response = self.client.post(self.url)
                self.balance.refresh_from_db(fields=['bonuses'])
                self.program.refresh_from_db(fields=['accepted_bonuses'])

                if interval < self.loyalty_config.full_duration - 1:
                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                    self.assertEqual(response.data, dict(non_field_errors=['Loyalty program is not over yet.']))
                    self.assertEqual(LoginsLoyaltyProgram.objects.count(), 1)
                    self.assertEqual(self.balance.bonuses, 0)
                else:
                    bonuses += self.program.accepted_bonuses
                    self.assertEqual(response.status_code, status.HTTP_200_OK)
                    self.assertEqual(
                        LoginsLoyaltyProgram.objects.count(), interval + 2 - self.loyalty_config.full_duration
                    )
                    self.assertEqual(self.balance.bonuses, bonuses)

                    with changed_date(-interval):
                        self.program = LoginsLoyaltyProgram.objects.create(user=self.user)

    def test_not_started_yet(self):
        with changed_date(self.loyalty_config.full_duration - 1):
            self.client.post(self.url)
            response = self.client.post(self.url)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(response.data, dict(non_field_errors=['Loyalty program has not started yet.']))
