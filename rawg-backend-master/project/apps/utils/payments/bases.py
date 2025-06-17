import abc
from collections import namedtuple
from decimal import Context, Decimal, ROUND_CEILING, ROUND_FLOOR, localcontext
from functools import reduce
from typing import Dict, Iterable, Optional, Tuple, TypeVar, Union
from urllib.parse import urljoin

import requests
from django.conf import settings
from django.utils.functional import cached_property
from requests.auth import HTTPBasicAuth
from requests.exceptions import HTTPError
from simplejson.errors import JSONDecodeError

from apps.payments.models import Payment, PaymentProject, PendingEvent
from apps.users.models import PlayerType
from .exceptions import InvalidPaymentSystemResponse, PaymentNotFound
from .tools import get_project

SyncResult = Tuple[bool, Optional[str]]
PaymentSyncResultMap = Dict[Payment, SyncResult]


class BaseSynchronizer(metaclass=abc.ABCMeta):
    @property
    @abc.abstractmethod
    def PAYMENT_SYSTEM_NAME(self) -> str:
        pass

    @property
    @abc.abstractmethod
    def BASE_URL(self) -> str:
        pass

    @property
    @abc.abstractmethod
    def POSTFIX(self) -> str:
        pass

    @property
    def name(self) -> str:
        return f'{self.PAYMENT_SYSTEM_NAME}_{self.POSTFIX}'

    def sync(self, payments: Iterable[Payment]) -> PaymentSyncResultMap:
        result = namedtuple('result', ['updated', 'error'])
        results = {}
        for payment in payments:
            if self.need_to_check(payment):
                try:
                    project = get_project(payment.game_id, self.PAYMENT_SYSTEM_NAME)
                    response = self.get_response(payment, project)
                    if self.has_updates(payment, response):
                        results[payment] = result(True, None)
                        self.update(payment, response)
                    else:
                        results[payment] = result(False, None)
                except (InvalidPaymentSystemResponse, PaymentNotFound) as error:
                    results[payment] = result(False, error.description)
        return results

    @abc.abstractmethod
    def get_response(self, payment: Payment, project: PaymentProject):
        pass

    @abc.abstractmethod
    def has_updates(self, payment: Payment, response) -> bool:
        pass

    @abc.abstractmethod
    def update(self, payment: Payment, response) -> None:
        pass

    @abc.abstractmethod
    def need_to_check(self, payment: Payment) -> bool:
        pass


class BaseXsollaSynchronizer(BaseSynchronizer, metaclass=abc.ABCMeta):
    PAYMENT_SYSTEM_NAME = Payment.XSOLLA
    BASE_URL = f'https://api.xsolla.com/merchant/v2/merchants/{settings.XSOLLA_MERCHANT_ID}/reports/transactions/'

    _simple_search_path = 'simple_search'
    _details_path = '{transaction_id}/details'

    def get_response(self, payment: Payment, project: PaymentProject):
        simple_search_response = self._get_simple_search_response(payment)
        try:
            external_id = int(simple_search_response[0]['transaction']['external_id'])
            transaction_id = int(simple_search_response[0]['transaction']['id'])
        except (KeyError, IndexError, ValueError) as error:
            raise InvalidPaymentSystemResponse('Invalid response format from xsolla') from error

        if external_id != payment.id:
            raise InvalidPaymentSystemResponse('Invalid external_id in xsolla response')

        detail_response = self._get_detail_response(transaction_id)
        detail_response['transaction'] = dict(id=transaction_id)
        return detail_response

    @cached_property
    def _auth(self) -> HTTPBasicAuth:
        return HTTPBasicAuth(settings.XSOLLA_MERCHANT_ID, settings.XSOLLA_API_KEY)

    def _check_response(self, response):
        if response.status_code == 404:
            raise PaymentNotFound('Payment not found in xsolla')
        try:
            response.raise_for_status()
            return response.json()
        except (HTTPError, JSONDecodeError) as error:
            raise InvalidPaymentSystemResponse('Unknown error from xsolla') from error

    def _get_simple_search_response(self, payment: Payment):
        url = urljoin(self.BASE_URL, self._simple_search_path)
        response = requests.get(url, auth=self._auth, params=dict(external_id=payment.id))
        return self._check_response(response)

    def _get_detail_response(self, transaction_id: int):
        url = urljoin(self.BASE_URL, self._details_path.format(transaction_id=transaction_id))
        response = requests.get(url, auth=self._auth)
        return self._check_response(response)

    def _prepare_event_data(self, payment: Payment, response) -> dict:
        ret = {
            'user': {
                'id': response['customer_details']['user_id'],
                'ip': response['customer_details']['ip'],
                'zip': response['payment_details']['zip_code'],
                'country': response['customer_details']['country']
            },
            'purchase': {
                'total': response['transaction_details']['purchase']['total'],
                'checkout': response['transaction_details']['purchase']['checkout']
            },
            'settings': {
                'project_id': response['transaction_details']['project'],
                'merchant_id': settings.XSOLLA_MERCHANT_ID
            },
            'transaction': {
                'id': response['transaction']['id'],
                'external_id': payment.id,
            },
            'payment_details': {
                'vat': response['finance_details']['vat'],
                'payout': response['finance_details']['payout'],
                'payment': response['finance_details']['payment'],
                'sales_tax': response['finance_details']['sales_tax'],
                'xsolla_fee': response['finance_details']['xsolla_fee'],
                'payment_method_fee': response['finance_details']['payment_method_fee'],
                'payment_method_sum': response['finance_details']['payment_method_sum'],
                'xsolla_balance_sum': response['finance_details']['xsolla_balance_sum'],
                'payout_currency_rate': response['finance_details']['payout_currency_rate'],
                'repatriation_commission': response['finance_details']['repatriation_commission']
            },
            'custom_parameters': response['transaction_details']['custom_parameters'],
        }
        if not settings.XSOLLA_PRODUCTION_MODE or payment.data.get('debug_mode'):
            ret['transaction']['dry_run'] = 1
        return ret


class BaseUkassaSynchronizer(BaseSynchronizer, metaclass=abc.ABCMeta):
    PAYMENT_SYSTEM_NAME = Payment.UKASSA

    def get_response(self, payment: Payment, project: PaymentProject):
        transaction_id = self.get_transaction_id(payment)
        url = self.get_url(transaction_id)

        auth = HTTPBasicAuth(str(project.id), project.secret_key)

        response = requests.get(url, auth=auth)
        try:
            response.raise_for_status()
            return response.json()
        except (HTTPError, JSONDecodeError) as error:
            raise InvalidPaymentSystemResponse('Unknown error from ukassa') from error

    def get_transaction_id(self, payment: Payment) -> str:
        try:
            event = PendingEvent.objects.get(payment=payment, data__payment_system_name=Payment.UKASSA)
            return event.data['id']
        except PendingEvent.DoesNotExist as error:
            raise PaymentNotFound('Payment creation event in ukassa not found') from error

    @abc.abstractmethod
    def get_url(self, transaction_id: str) -> str:
        pass


SynchronizerType = TypeVar('SynchronizerType', bound=BaseSynchronizer)


class BasePaymentSystem(metaclass=abc.ABCMeta):
    BONUS_FACTOR = Decimal('0.5')

    def __init__(self, payment: Payment):
        self.payment = payment
        self.set_payment_system_name(self.payment)
        self.project = get_project(self.payment.game_id, self.NAME)

    @property
    @abc.abstractmethod
    def NAME(self) -> str:
        pass

    @property
    @abc.abstractmethod
    def BASE_URL(self) -> str:
        pass

    @abc.abstractmethod
    def send_data(self, data: dict, player: PlayerType) -> dict:
        pass

    @staticmethod
    @abc.abstractmethod
    def token_from_response(data: dict) -> str:
        pass

    @staticmethod
    @abc.abstractmethod
    def get_discount(data: dict) -> Decimal:
        pass

    @abc.abstractmethod
    def data_converter(self, client_data: dict, player: PlayerType) -> dict:
        pass

    @classmethod
    def token(cls, data) -> Dict[str, str]:
        return dict(token=cls.token_from_response(data), system=cls.NAME)

    @classmethod
    def set_payment_system_name(cls, payment: Payment) -> None:
        if payment.payment_system_name != cls.NAME:
            payment.payment_system_name = cls.NAME
            payment.save()

    @classmethod
    def purchase_amount(cls, client_data: dict) -> dict:
        return dict(amount=client_data['purchase']['amount'], currency=client_data['purchase']['currency'])

    def apply_discount(self, client_data: dict, bonuses: Decimal) -> float:
        for index, item in enumerate(client_data['purchase']['items']):
            new_item_price, bonuses = self._item_withdraw_bonuses(item, bonuses)
            client_data['purchase']['items'][index]['price'] = float(new_item_price)
        new_full_price = reduce(
            lambda amount, item: amount + (item['quantity'] * Decimal(str(item['price']))),
            client_data['purchase']['items'],
            Decimal('0.0')
        )
        discount = Decimal(str(client_data['purchase']['amount'])) - new_full_price
        client_data['purchase']['amount'] = float(new_full_price)
        return float(discount)

    @classmethod
    def sync_many(cls, payments: Iterable[Payment], syncer: SynchronizerType) -> PaymentSyncResultMap:
        return syncer.sync(payments)

    def _item_withdraw_bonuses(self, item: Dict[str, Union[str, float]], bonuses: Decimal) -> Tuple[Decimal, Decimal]:
        quantity = Decimal(str(item['quantity']))

        if bonuses / quantity < Decimal('0.01'):
            return Decimal(str(item['price'])), bonuses

        position_price = Decimal(str(item['price'])) * quantity

        with localcontext(Context(rounding=ROUND_FLOOR)):
            max_position_discount: Decimal = round(position_price * self.BONUS_FACTOR, 2)
        position_discount = min(max_position_discount, bonuses)

        with localcontext(Context(rounding=ROUND_CEILING)):
            new_item_price: Decimal = round((position_price - position_discount) / quantity, 2)

        return new_item_price, bonuses - (position_price - (new_item_price * quantity))


PaymentSystemType = TypeVar('PaymentSystemType', bound=BasePaymentSystem)
