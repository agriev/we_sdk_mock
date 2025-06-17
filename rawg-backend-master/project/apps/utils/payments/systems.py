from decimal import Decimal
from urllib.parse import urljoin

import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth

from apps.payments.models import Payment
from apps.users.models import PlayerType
from apps.utils.payments import ANY_CURRENCY, BasePaymentSystem, PaymentSystemManager


@PaymentSystemManager.register_payment_system
class XsollaPaymentSystem(BasePaymentSystem):
    NAME = Payment.XSOLLA
    BASE_URL = f'https://api.xsolla.com/merchant/v2/merchants/{settings.XSOLLA_MERCHANT_ID}/'
    AVAILABLE_CURRENCIES = [ANY_CURRENCY]
    _currencies_for_discount = ['RUB']
    _manual_redirection_action = 'postmessage'  # 'redirect' or 'postmessage' available

    def send_data(self, data: dict, player: PlayerType) -> dict:
        auth = HTTPBasicAuth(settings.XSOLLA_MERCHANT_ID, settings.XSOLLA_API_KEY)
        url = urljoin(self.BASE_URL, 'token')
        data_for_request = self.data_converter(data, player)
        response = requests.post(url, json=data_for_request, auth=auth)
        response.raise_for_status()
        ret = response.json()
        ret['discount'] = data_for_request['custom_parameters']['discount']
        return ret

    @staticmethod
    def token_from_response(data: dict) -> str:
        return data['token']

    @staticmethod
    def get_discount(data: dict) -> Decimal:
        return Decimal(str(data['custom_parameters']['discount']))

    def data_converter(self, client_data: dict, player: PlayerType) -> dict:
        if client_data['purchase']['currency'] in self._currencies_for_discount:
            discount = self.apply_discount(client_data, player.balance.bonuses)
        else:
            discount = 0.0
        request_data = {
            'user': {
                'id': {
                    'value': client_data['player_id']
                },
            },
            'settings': {
                'project_id': self.project.id,
                'external_id': str(self.payment.id),
                'redirect_policy': {
                    'manual_redirection_action': self._manual_redirection_action,
                },
            },
            'purchase': {
                'checkout': {
                    'currency': client_data['purchase']['currency'],
                    'amount': client_data['purchase']['amount'],
                },
                'description': {
                    'value': str(client_data['purchase']['description']),
                },
            },
            'custom_parameters': {'discount': discount}
        }

        request_data['purchase']['description']['items'] = []
        for item in client_data['purchase']['items']:
            request_data['purchase']['description']['items'].append(
                {'name': str(item['name']), 'quantity': item['quantity'], 'price': {'amount': str(item['price'])}}
            )

        if not settings.XSOLLA_PRODUCTION_MODE or client_data.get('debug_mode'):
            request_data['settings']['mode'] = 'sandbox'
        return request_data


@PaymentSystemManager.register_payment_system
class UkassaPaymentSystem(BasePaymentSystem):
    NAME = Payment.UKASSA
    BASE_URL = f'https://api.yookassa.ru/v3/'
    AVAILABLE_CURRENCIES = ['RUB']

    _vat_code = 4
    _measure = 'piece'
    _payment_subject = 'service'
    _payment_mode = 'full_payment'

    def send_data(self, data: dict, player: PlayerType) -> dict:
        url = urljoin(self.BASE_URL, 'payments')
        auth = HTTPBasicAuth(self.project.id, self.project.secret_key)
        headers = {'Idempotence-Key': str(self.payment.id)}
        data_for_request = self.data_converter(data, player)
        response = requests.post(url, json=data_for_request, headers=headers, auth=auth)
        response.raise_for_status()
        ret = response.json()
        ret['discount'] = data_for_request['metadata']['discount']
        return ret

    @staticmethod
    def token_from_response(data: dict) -> str:
        return data['confirmation']['confirmation_token']

    @staticmethod
    def get_discount(data: dict) -> Decimal:
        return Decimal(str(data['object']['metadata']['discount']))

    def data_converter(self, client_data: dict, player: PlayerType) -> dict:
        discount = self.apply_discount(client_data, player.balance.bonuses)
        return {
            'amount': dict(value=client_data['purchase']['amount'], currency=client_data['purchase']['currency']),
            'description': str(client_data['purchase']['description']),
            'confirmation': dict(type='embedded', locale='ru_RU'),
            'metadata': dict(external_id=str(self.payment.id), discount=discount),
            'merchant_customer_id': client_data['player_id'],
            'capture': True,
            'receipt': self._make_receipt(client_data, player)
        }

    def _make_receipt(self, client_data: dict, player: PlayerType) -> dict:
        return dict(
            customer={'email': player.email},
            items=[
                {
                    'description': str(item['name']),
                    'amount': {
                        'value': str(item['price']),
                        'currency': client_data['purchase']['currency']
                    },
                    'vat_code': self._vat_code,
                    'quantity': str(item['quantity']),
                    'measure': self._measure,
                    'payment_subject': self._payment_subject,
                    'payment_mode': self._payment_mode
                }
                for item in client_data['purchase']['items']
            ]
        )
