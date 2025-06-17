from copy import deepcopy
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

from apps.payments.models import PaidEvent, Payment, RefundedEvent
from .bases import BaseUkassaSynchronizer, BaseXsollaSynchronizer
from .exceptions import InvalidPaymentSystemResponse


class XsollaPaymentSynchronizer(BaseXsollaSynchronizer):
    POSTFIX = 'payment'

    def need_to_check(self, payment: Payment) -> bool:
        return not PaidEvent.objects.filter(payment=payment).exists()

    def has_updates(self, payment: Payment, response) -> bool:
        try:
            return response['transaction_details']['status'] in ['done', 'canceled']
        except KeyError as error:
            raise InvalidPaymentSystemResponse('Invalid response format from xsolla') from error

    def update(self, payment: Payment, response) -> None:
        event_data = self._prepare_event_data(payment, response)
        PaidEvent.objects.create(payment=payment, event_data=event_data)

    def _prepare_event_data(self, payment: Payment, response) -> dict:
        event_data = super()._prepare_event_data(payment, response)
        event_data['transaction'].update(
            payment_date=response['transaction_details']['payment_date'],
            payment_method=response['transaction_details']['payment_method'],
            payment_method_name=response['transaction_details']['payment_method_name']
        )
        event_data['notification_type'] = 'payment'
        return event_data


class XsollaRefundSynchronizer(BaseXsollaSynchronizer):
    POSTFIX = 'refund'

    def need_to_check(self, payment: Payment) -> bool:
        return not RefundedEvent.objects.filter(payment=payment).exists()

    def has_updates(self, payment: Payment, response) -> bool:
        try:
            return response['transaction_details']['status'] in ['canceled']
        except KeyError as error:
            raise InvalidPaymentSystemResponse('Invalid response format from xsolla') from error

    def update(self, payment: Payment, response) -> None:
        event_data = self._prepare_event_data(payment, response)
        RefundedEvent.objects.create(payment=payment, event_data=event_data)

    def _prepare_event_data(self, payment: Payment, response) -> dict:
        event_data = super()._prepare_event_data(payment, response)
        event_data['refund_details'] = dict(reason=response['transaction_details']['refund_reason'])
        event_data['notification_type'] = 'refund'
        return event_data


class UkassaPaymentSynchronizer(BaseUkassaSynchronizer):
    POSTFIX = 'payment'
    BASE_URL = 'https://api.yookassa.ru/v3/payments/'

    _not_refundable_methods = ('b2b_sberbank', 'cash')

    def need_to_check(self, payment: Payment) -> bool:
        return not PaidEvent.objects.filter(payment=payment).exists()

    def has_updates(self, payment: Payment, response) -> bool:
        try:
            return response['status'] == 'succeeded'
        except KeyError as error:
            raise InvalidPaymentSystemResponse('Invalid response format from ukassa') from error

    def update(self, payment: Payment, response) -> None:
        event_data = self._prepare_event_data(response)
        PaidEvent.objects.create(payment=payment, data=event_data)

    def get_url(self, transaction_id: str) -> str:
        return urljoin(self.BASE_URL, transaction_id)

    def _prepare_event_data(self, response):
        ret = {
            "type": "notification",
            "event": "payment.succeeded",
            "object": deepcopy(response)
        }

        if ret['object']['payment_method']['type'] not in self._not_refundable_methods:
            ret['object']['refundable'] = True

        return ret


class UkassaRefundSynchronizer(BaseUkassaSynchronizer):
    POSTFIX = 'refund'
    BASE_URL = 'https://api.yookassa.ru/v3/refunds/'

    def need_to_check(self, payment: Payment) -> bool:
        return not RefundedEvent.objects.filter(payment=payment).exists()

    def has_updates(self, payment: Payment, response) -> bool:
        try:
            return bool(response['items'])
        except KeyError as error:
            raise InvalidPaymentSystemResponse('Invalid response format from ukassa') from error

    def update(self, payment: Payment, response) -> None:
        for refund_info in response['items']:
            RefundedEvent.objects.create(payment=payment, data=self._prepare_event_data(refund_info))

    def get_url(self, transaction_id: str) -> str:
        parsed_url = list(urlparse(self.BASE_URL))
        query = dict(parse_qsl(parsed_url[4]), status='succeeded', payment_id=transaction_id)
        parsed_url[4] = urlencode(query)
        return urlunparse(parsed_url)

    def _prepare_event_data(self, response):
        return {
            "type": "notification",
            "event": "refund.succeeded",
            "object": deepcopy(response)
        }
