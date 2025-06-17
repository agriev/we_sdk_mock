import hashlib
from logging import getLogger

from django.db.models import Prefetch
from rest_framework import serializers

from api.validators import equals, greater, validate_fields, wrap_validation_error
from apps.payments.models import PaidEvent, Payment, PaymentProject, RefundedEvent
from apps.users.models import AuthenticatedPlayer
from apps.utils.payments import XsollaPaymentSystem
from .bases import AbstractSerializerMetaclass, AbstractWebhookSerializer
from ..exceptions import IncorrectAmountError, InvalidParameterError, InvalidProjectError, InvalidSignatureError, \
    InvalidUserError
from ..validators import player_exists

logger = getLogger(__name__)


class _PlayerSerializer(serializers.Serializer):
    id = serializers.CharField(validators=[wrap_validation_error(player_exists, InvalidUserError)])
    ip = serializers.IPAddressField(required=False)
    phone = serializers.CharField(required=False)
    email = serializers.EmailField(required=False)
    name = serializers.CharField(required=False)
    country = serializers.CharField(required=False)
    zip = serializers.CharField(required=False)

    def fail(self, key, **kwargs):
        wrap_validation_error(super().fail, InvalidUserError)(key, **kwargs)


class _TransactionPlayerSerializer(_PlayerSerializer):
    '''Returns AuthenticatedPlayer instance after validation'''
    id = serializers.CharField()

    def validate(self, data):
        '''Adds AuthenticatedPlayer instance to validated_data['player']'''
        data = super().validate(data)
        player_id = data['id']
        try:
            data['player'] = AuthenticatedPlayer.get_by_uid(AuthenticatedPlayer.validate_id(player_id))
        except AuthenticatedPlayer.InvalidIdError:
            logger.error(f'Xsolla Transaction invalid player UID "{player_id}"')
            raise InvalidUserError
        except AuthenticatedPlayer.DoesNotExist:
            logger.error(f'Xsolla Transaction player with UID "{player_id}" does not exist ')
            raise InvalidUserError
        return data


class _SettingsSerializer(serializers.Serializer):
    project_id = serializers.IntegerField()
    merchant_id = serializers.IntegerField()

    def validate(self, data):
        '''Adds PaymentProject instance to validated_data['project'] and validates request signature'''
        data = super().validate(data)
        project_id = data['project_id']
        try:
            project = PaymentProject.objects.get(id=project_id, payment_system_name=Payment.XSOLLA)
        except PaymentProject.DoesNotExist:
            logger.error(f'No PaymentProject found with id {project_id}')
            raise InvalidProjectError
        request = self.context['request']
        try:
            scheme, request_signature = request.headers['Authorization'].split()
        except KeyError:
            logger.error('Xsolla Authorization header missing')
            raise InvalidSignatureError
        except ValueError:
            logger.error(f"Xsolla Authorization header malformed: {request.headers['Authorization']}")
            raise InvalidSignatureError
        if not scheme == 'Signature':
            logger.error(f'Xsolla Authorization header wrong scheme: {scheme}')
            raise InvalidSignatureError
        # request.raw_body set by parser
        check_signature = hashlib.sha1(request.raw_body + project.secret_key.encode('ascii')).hexdigest()
        if check_signature != request_signature:
            logger.error(f'Xsolla signature mismatch: "{request_signature}" vs "{check_signature}"')
            raise InvalidSignatureError
        data['project'] = project
        return data


class _TransactionSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)
    external_id = serializers.IntegerField()
    dry_run = serializers.IntegerField(required=False)
    agreement = serializers.IntegerField(required=False)

    def validate_external_id(self, value):
        if not Payment.objects.filter(id=value).exists():
            raise serializers.ValidationError()
        return value


class _PaymentTransactionSerializer(_TransactionSerializer):
    payment_date = serializers.DateTimeField(required=False)
    payment_method = serializers.IntegerField(required=False)
    payment_method_name = serializers.CharField(required=False)
    payment_method_order_id = serializers.CharField(required=False)


class _PaymentSerializer(serializers.Serializer):
    currency = serializers.CharField()
    amount = serializers.FloatField()


class _TaxSerializer(_PaymentSerializer):
    amount = serializers.FloatField()
    percent = serializers.FloatField()


class _SubscriptionSerializer(_PaymentSerializer):
    plan_id = serializers.CharField()
    subscription_id = serializers.IntegerField()
    product_id = serializers.CharField()
    tags = serializers.ListField(
       child=serializers.CharField()
    )
    date_create = serializers.DateTimeField()
    date_next_charge = serializers.DateTimeField()


class _PaymentDetailsSerializer(serializers.Serializer):
    payment = _PaymentSerializer(
        validators=[
            validate_fields(
                amount=[wrap_validation_error(greater(0), IncorrectAmountError)]
            )
        ],
        required=False
    )
    payment_method_sum = _PaymentSerializer(required=False)
    xsolla_balance_sum = _PaymentSerializer(required=False)
    payout = _PaymentSerializer(required=False)
    vat = _TaxSerializer(required=False)
    payout_currency_rate = serializers.CharField(required=False)
    xsolla_fee = _PaymentSerializer(required=False)
    payment_method_fee = _PaymentSerializer(False)
    sales_tax = _TaxSerializer(required=False)
    direct_wht = _TaxSerializer(required=False)
    repatriation_commission = _PaymentSerializer(required=False)

    def validate_payout_currency_rate(self, value):
        try:
            return float(value)
        except (ValueError, TypeError):
            raise InvalidParameterError


class _GiftSerializer(serializers.Serializer):
    giver_id = serializers.CharField()
    receiver_id = serializers.CharField()
    receiver_email = serializers.EmailField()
    message = serializers.CharField()
    hide_giver_from_receiver = serializers.CharField()


class _PromotionsSerializer(serializers.Serializer):
    technical_name = serializers.CharField()
    id = serializers.IntegerField()


class _CouponSerializer(serializers.Serializer):
    coupon_code = serializers.CharField()
    campaign_code = serializers.CharField()


class _PurchaseSerializer(serializers.Serializer):
    total = _PaymentSerializer()
    checkout = _PaymentSerializer(required=False)
    subscription = _SubscriptionSerializer(required=False)
    gift = _GiftSerializer(required=False)
    promotions = serializers.ListField(child=_PromotionsSerializer(), required=False)
    coupon = _CouponSerializer(required=False)


class _RefundDetailsSerializer(serializers.Serializer):
    code = serializers.IntegerField()
    reason = serializers.CharField()
    author = serializers.CharField()


class TransactionSerializerBase(AbstractWebhookSerializer, metaclass=AbstractSerializerMetaclass):
    determinative_field = 'notification_type'

    notification_type: serializers.CharField
    transaction: serializers.Serializer
    user = _TransactionPlayerSerializer()
    settings = _SettingsSerializer()
    payment_details = _PaymentDetailsSerializer()
    purchase = _PurchaseSerializer()
    custom_parameters = serializers.DictField(required=False)

    def validate(self, data):
        data = super().validate(data)
        try:
            data['payment'] = self.get_payment(data)
        except Payment.DoesNotExist as error:
            logger.error(f'Xsolla sent a non-existent id. Data: {data}, error: {error}')
            raise InvalidParameterError
        return data

    def get_payment(self, data) -> Payment:
        raise NotImplementedError()


# Actual serializers

class UserValidationWebhookSerializer(AbstractWebhookSerializer):
    determinative_field = 'notification_type'

    notification_type = serializers.CharField(validators=[equals('user_validation')])
    user = _PlayerSerializer()
    settings = _SettingsSerializer()


class PaymentWebhookSerializer(TransactionSerializerBase):
    notification_type = serializers.CharField(validators=[equals('payment')])
    transaction = _PaymentTransactionSerializer()
    purchase = _PurchaseSerializer()

    def create(self, validated_data):
        payment: Payment = validated_data['payment']
        XsollaPaymentSystem.set_payment_system_name(payment)
        discount = XsollaPaymentSystem.get_discount(validated_data)
        if discount and not payment.payment_events.exists():
            player = AuthenticatedPlayer(payment.player)
            player.balance.safe_withdraw_bonuses(discount)
        return PaidEvent.objects.create(payment=payment, data=self.context['request'].data)

    def get_payment(self, data) -> Payment:
        return Payment.objects.join_and_lock_balance() \
            .prefetch_related(Prefetch('payment_events', queryset=PaidEvent.objects.all())) \
            .get(id=data['transaction']['external_id'])


class RefundWebhookSerializer(TransactionSerializerBase):
    notification_type = serializers.CharField(validators=[equals('refund')])
    transaction = _TransactionSerializer()
    refund_details = _RefundDetailsSerializer(required=False)

    def create(self, validated_data):
        return RefundedEvent.objects.create(payment=validated_data['payment'], data=self.context['request'].data)

    def get_payment(self, data) -> Payment:
        return Payment.objects.get(id=data['transaction']['external_id'])
