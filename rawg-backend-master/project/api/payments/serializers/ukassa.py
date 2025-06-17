from logging import getLogger

from django.db.models import Prefetch
from rest_framework import serializers

from api.validators import equals
from apps.payments.models import CanceledEvent, PaidEvent, Payment, RefundedEvent
from apps.users.models import AuthenticatedPlayer
from apps.utils.payments import UkassaPaymentSystem
from .bases import AbstractSerializerMetaclass, AbstractWebhookSerializer

logger = getLogger(__name__)


class _UkassaAmountSerializer(serializers.Serializer):
    value = serializers.FloatField(min_value=0)
    currency = serializers.CharField(min_length=3, max_length=3)


class _UkassaRefundSerializer(serializers.Serializer):
    id = serializers.CharField()
    payment_id = serializers.CharField()
    status = serializers.CharField(validators=[equals('succeeded')])
    created_at = serializers.DateTimeField()
    amount = _UkassaAmountSerializer()
    description = serializers.CharField(required=False)


class _UkassaRecipientSerializer(serializers.Serializer):
    account_id = serializers.CharField()
    gateway_id = serializers.CharField()


class _UkassaCardMethodSerializer(serializers.Serializer):
    first6 = serializers.IntegerField(required=False, max_value=999999, min_value=0)
    last4 = serializers.IntegerField(min_value=0, max_value=9999)
    expiry_year = serializers.IntegerField()
    expiry_month = serializers.IntegerField(min_value=1, max_value=12)
    card_type = serializers.ChoiceField(
        [
            'MasterCard', 'Visa', 'Mir', 'UnionPay', 'JCB', 'AmericanExpress', 'DinersClub', 'DiscoverCard',
            'InstaPayment', 'InstaPaymentTM', 'Laser', 'Dankort', 'Solo', 'Switch', 'Unknown'
        ]
    )
    issuer_country = serializers.CharField(required=False, min_length=2, max_length=2)
    issuer_name = serializers.CharField(required=False)
    source = serializers.CharField(required=False)


class _UkassaPayerBankDetailsSerializer(serializers.Serializer):
    full_name = serializers.CharField()
    short_name = serializers.CharField()
    address = serializers.CharField()
    inn = serializers.CharField()
    bank_name = serializers.CharField()
    bank_branch = serializers.CharField()
    bank_bik = serializers.CharField()
    account = serializers.CharField()
    kpp = serializers.CharField(required=False)


class _UkassaVatSerializer(serializers.Serializer):
    type = serializers.ChoiceField(['untaxed', 'calculated', 'mixed'])
    amount = _UkassaAmountSerializer(required=False)  # calculated, mixed
    rate = serializers.CharField(required=False)  # calculated


class _UkassaPaymentMethodSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=[
            'alfabank', 'mobile_balance', 'bank_card', 'installments', 'cash', 'sbp', 'b2b_sberbank', 'tinkoff_bank',
            'yoo_money', 'apple_pay', 'google_pay', 'qiwi', 'sberbank', 'wechat', 'webmoney'
        ]
    )
    id = serializers.CharField()
    saved = serializers.BooleanField()
    title = serializers.CharField(required=False)

    login = serializers.CharField(required=False)  # alfabank
    payer_bank_details = _UkassaPayerBankDetailsSerializer(required=False)  # b2b_sberbank
    payment_purpose = serializers.CharField(required=False)  # b2b_sberbank
    vat_data = _UkassaVatSerializer(required=False)  # b2b_sberbank
    account_number = serializers.CharField(required=False)  # yoo_money
    card = _UkassaCardMethodSerializer(required=False)  # bank_card, sberbank
    phone = serializers.CharField(required=False)  # sberbank


class _UkassaCancelationDetailsSerializer(serializers.Serializer):
    party = serializers.ChoiceField(['yoo_money', 'payment_network', 'merchant'])
    reason = serializers.CharField()

    def validate_party(self, value):
        if value == 'merchant':
            logger.error(f'Invalid initiator of payment cancellation: {value}')
        return value


class _UkassaThreeDSecureSerializer(serializers.Serializer):
    applied = serializers.BooleanField(required=True)


class _UkassaAuthorizationDetailsSerializer(serializers.Serializer):
    rrn = serializers.CharField(required=False)
    auth_code = serializers.CharField(required=False)
    three_d_secure = _UkassaThreeDSecureSerializer()


class _UkassaPaymentSerializer(serializers.Serializer):
    id = serializers.CharField()
    status = serializers.ChoiceField(['pending', 'waiting_for_capture', 'succeeded', 'canceled'])
    amount = _UkassaAmountSerializer()
    income_amount = _UkassaAmountSerializer(required=False)
    description = serializers.CharField(required=False, max_length=128)
    recipient = _UkassaRecipientSerializer()
    payment_method = _UkassaPaymentMethodSerializer(required=False)
    captured_at = serializers.DateTimeField(required=False)
    created_at = serializers.DateTimeField()
    expires_at = serializers.DateTimeField(required=False)
    test = serializers.BooleanField()
    refunded_amount = _UkassaAmountSerializer(required=False)
    paid = serializers.BooleanField()
    refundable = serializers.BooleanField()
    metadata = serializers.DictField(child=serializers.CharField(), required=True, allow_empty=False)
    cancellation_details = _UkassaCancelationDetailsSerializer(required=False)
    authorization_details = _UkassaAuthorizationDetailsSerializer(required=False)
    merchant_customer_id = serializers.CharField(required=False)


class UkassaWebhookSerializerBase(AbstractWebhookSerializer, metaclass=AbstractSerializerMetaclass):
    determinative_field = 'event'

    type = serializers.CharField(validators=[equals('notification')])
    event: serializers.CharField

    def validate(self, data):
        data = super().validate(data)
        try:
            data['payment'] = self.get_payment(data)
        except Payment.DoesNotExist as error:
            logger.error(f'Ukassa sent a non-existent id. Data: {data}, error: {error}')
            raise serializers.ValidationError()
        except KeyError as error:
            logger.error(f'Wrong data format, can\'t get payment. Data: {data}, error: {error}')
            raise serializers.ValidationError()
        return data

    def get_payment(self, data):
        raise NotImplementedError()


class UkassaPaymentSucceededWebhookSerializer(UkassaWebhookSerializerBase):
    object = _UkassaPaymentSerializer()
    event = serializers.CharField(validators=[equals('payment.succeeded')])

    def create(self, validated_data):
        payment: Payment = validated_data['payment']
        UkassaPaymentSystem.set_payment_system_name(payment)
        discount = UkassaPaymentSystem.get_discount(validated_data)
        if discount and not payment.payment_events.exists():
            player = AuthenticatedPlayer(payment.player)
            player.balance.safe_withdraw_bonuses(discount)
        return PaidEvent.objects.create(payment=payment, data=self.context['request'].data)

    def get_payment(self, data):
        return Payment.objects.join_and_lock_balance() \
            .prefetch_related(Prefetch('payment_events', queryset=PaidEvent.objects.all())) \
            .get(id=data['object']['metadata']['external_id'])


class UkassaPaymentCanceledSerializer(UkassaWebhookSerializerBase):
    object = _UkassaPaymentSerializer()
    event = serializers.CharField(validators=[equals('payment.canceled')])

    def create(self, validated_data):
        return CanceledEvent.objects.create(payment=validated_data['payment'], data=self.context['request'].data)

    def get_payment(self, data):
        return Payment.objects.get(id=data['object']['metadata']['external_id'])


class UkassaRefundWebhookSerializer(UkassaWebhookSerializerBase):
    object = _UkassaRefundSerializer()
    event = serializers.CharField(validators=[equals('refund.succeeded')])

    def create(self, validated_data):
        return RefundedEvent.objects.create(payment=validated_data['payment'], data=self.context['request'].data)

    def get_payment(self, data):
        return Payment.objects.get(payment_events__data__id=data['object']['payment_id'])
