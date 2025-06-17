from collections import defaultdict
from typing import DefaultDict, Dict, Set, Type

from apps.payments.models import Payment
from .bases import PaymentSystemType
from .const import ANY_CURRENCY
from .exceptions import InvalidCurrency, PaymentSystemNameNotRegistered


class PaymentSystemManager:
    _map_by_names: Dict[str, Type[PaymentSystemType]] = dict()
    _map_by_currencies: DefaultDict[str, Set[Type[PaymentSystemType]]] = defaultdict(set)

    @classmethod
    def register_payment_system(cls, payment_system: Type[PaymentSystemType]):
        cls._map_by_names[payment_system.NAME] = payment_system
        for currency in payment_system.AVAILABLE_CURRENCIES:
            cls._map_by_currencies[currency.capitalize()].add(payment_system)
        return payment_system

    @classmethod
    def payment_system(cls, payment: Payment, name: str = None) -> PaymentSystemType:
        return cls._get_payment_system_class(payment, name)(payment)

    @classmethod
    def payment_system_by_currency(cls, payment: Payment, currency: str, name: str = None) -> PaymentSystemType:
        payment_system_class = cls._get_payment_system_class(payment, name)
        cls._validate_currency(payment_system_class, currency)
        return cls.payment_system(payment, name)

    @classmethod
    def _get_payment_system_class(cls, payment: Payment, name: str = None) -> Type[PaymentSystemType]:
        key = name or payment.payment_system_name
        try:
            return cls._map_by_names[key]
        except KeyError as error:
            raise PaymentSystemNameNotRegistered(f'Payment system is not registered for name {key}') from error

    @classmethod
    def _validate_currency(cls, payment_class: Type[PaymentSystemType], currency: str) -> None:
        if payment_class not in cls._map_by_currencies[currency.capitalize()] | cls._map_by_currencies[ANY_CURRENCY]:
            raise InvalidCurrency(f'Currency ({currency}) is not registered for payment system ({payment_class.NAME})')
