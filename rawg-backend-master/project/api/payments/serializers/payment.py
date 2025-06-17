import logging
import typing
from functools import reduce

from django.db import models
from requests.exceptions import HTTPError
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from simplejson import JSONDecodeError

from apps.games.models import Game, PlayerGameSession
from apps.payments.models import CreatedEvent, LoginsLoyaltyProgram, Payment, PaymentConfirmedEvent, PendingEvent, \
    RefundConfirmedEvent
from apps.users.models import AuthenticatedPlayer, PlayerBase
from apps.utils.crypto import check_signature, check_signature_from_message
from apps.utils.payments import InvalidCurrency, PaymentProjectNotConfigured, PaymentSystemManager, \
    PaymentSystemNameNotRegistered, PaymentSystemType
from ..exceptions import ServiceUnavailable
from ..utils import auth_header_signature
from ..validators import player_exists

logger = logging.getLogger(__name__)


class ItemsSerializer(serializers.Serializer):
    name = serializers.CharField()
    quantity = serializers.IntegerField(min_value=1, max_value=99999)
    price = serializers.FloatField(min_value=0)


class PurchaseSerializer(serializers.Serializer):
    currency = serializers.CharField(min_length=3, max_length=3)
    amount = serializers.FloatField(min_value=0)
    description = serializers.CharField(max_length=128)
    items = ItemsSerializer(many=True)

    def validate_items(self, value):
        if not value:
            raise ValidationError('Items list may not be empty.')
        return value


class PaymentCreateSerializer(serializers.Serializer):
    game_sid = serializers.CharField()
    player_id = serializers.UUIDField(format='hex', validators=[player_exists])
    app_id = serializers.IntegerField(min_value=1)
    debug_mode = serializers.BooleanField()
    purchase = PurchaseSerializer()
    custom_parameters = serializers.DictField(
        child=serializers.CharField(), required=False, allow_empty=False, default={}
    )

    def validate_purchase(self, value):
        amount = reduce(lambda amount, item: amount + (item['quantity'] * item['price']), value['items'], 0)
        if amount != value['amount']:
            raise ValidationError('Cost of all purchased items is not equal to the total purchase cost.')
        return value

    def validate(self, data):
        data = super().validate(data)
        try:
            game_session = PlayerGameSession.objects \
                .annotate(game_secret_key=models.F('game__secret_key')) \
                .get(
                    game_sid=data['game_sid'], player_id=data['player_id'], game_id=data['app_id'], game__can_play=True,
                )
        except PlayerGameSession.DoesNotExist:
            raise ValidationError(
                {
                    'game_sid': f"Game session {data['game_sid']} for player "
                                f"{data['player_id']} and game {data['app_id']} not found"
                }
            )
        self._check_signature(self.context['request'], game_session.game_secret_key)
        return data

    def create(self, validated_data):
        payment = Payment.objects.create(
            player_id=validated_data['player_id'],
            game_id=validated_data['app_id'],
            game_session_id=validated_data['game_sid']
        )
        event_instance = CreatedEvent(payment=payment, data=self.validated_data)
        event_instance.save()
        return event_instance.payment

    def _check_signature(self, request, secret_key):
        if not check_signature_from_message(auth_header_signature(request), request.raw_body, secret_key):
            raise PermissionDenied()


class PaymentReadSerializer(serializers.Serializer):
    game_sid = serializers.CharField(source='game_session_id')
    player_id = serializers.UUIDField(format='hex')
    app_id = serializers.IntegerField(source='game_id')
    debug_mode = serializers.BooleanField(source='data.debug_mode', allow_null=True)
    purchase = serializers.JSONField(source='data.purchase')
    custom_parameters = serializers.JSONField(source='data.custom_parameters', default={})
    state = serializers.CharField()
    transaction_id = serializers.IntegerField(source='id')
    token = serializers.CharField()


class PaymentUpdateSerializer(serializers.Serializer):
    state = serializers.CharField()

    def validate_state(self, value):
        if value in (PaymentConfirmedEvent.EVENT_TYPE, RefundConfirmedEvent.EVENT_TYPE) \
                and getattr(self.instance, f'may_change_to_{value}')():
            return value
        raise ValidationError('Invalid state.')

    def validate(self, data):
        self._check_signature(self.context['request'], secret_key=self.instance.secret_key)
        return data

    def update(self, instance, validated_data):
        model = (
            RefundConfirmedEvent
            if validated_data['state'] == RefundConfirmedEvent.EVENT_TYPE
            else PaymentConfirmedEvent
        )
        event = model(payment=instance, data={})
        event.save()
        return event.payment

    def _check_signature(self, request, secret_key):
        if not check_signature_from_message(auth_header_signature(request), request.raw_body, secret_key):
            raise PermissionDenied()


class ListTransactionQueryParamsSerializer(serializers.Serializer):
    app_id = serializers.IntegerField(required=True)
    player_id = serializers.UUIDField(required=False, format='hex')
    game_sid = serializers.CharField(required=False)
    transaction_id = serializers.IntegerField(required=False)
    state = serializers.CharField(required=False)
    page = serializers.IntegerField(required=False)

    def validate(self, data):
        try:
            secret_key = Game.objects.filter(id=data['app_id']).values_list('secret_key', flat=True).get()
        except Game.DoesNotExist:
            raise PermissionDenied()
        self._check_signature(self.context['request'], secret_key=secret_key)
        return super().validate(data)

    def _check_signature(self, request, secret_key):
        if not check_signature(auth_header_signature(request), map(str, request.query_params.values()), secret_key):
            raise PermissionDenied()


class ListTransactionRequestBodySerializer(ListTransactionQueryParamsSerializer):
    def _check_signature(self, request, secret_key):
        if not check_signature_from_message(auth_header_signature(request), request.raw_body, secret_key):
            raise PermissionDenied()


class GetTransactionSerializer(serializers.Serializer):
    transaction_id = serializers.IntegerField(min_value=1)


class PendingEventSerializer(serializers.Serializer):
    token = serializers.CharField()
    payment_system = serializers.CharField()

    def validate(self, data):
        validated_data = super().validate(data)

        try:
            payment = self.context['view'].get_queryset().get(token=validated_data['token'])
            if payment.player_id.hex != PlayerBase.from_request(self.context['request']).id.hex:
                raise ValidationError({'error': 'invalid_user'})
            if not payment.can_pay:
                raise ValidationError({'error': 'invalid_payment_state'})
        except Payment.DoesNotExist:
            raise ValidationError({'token': 'token_not_found'})

        currency = payment.data['purchase']['currency']

        try:
            payment_system = PaymentSystemManager.payment_system_by_currency(
                payment, currency, name=validated_data['payment_system']
            )
        except PaymentSystemNameNotRegistered:
            logger.error(f'The selected payment system is not registered (name: {validated_data["payment_system"]}).')
            raise ValidationError({'payment_system': 'not_registered'})
        except PaymentProjectNotConfigured:
            logger.error(f'The selected payment system is not configured for this game (app_id: {payment.game_id}).')
            raise ValidationError({'payment_system': 'not_configured'})
        except InvalidCurrency:
            raise ValidationError({'payment_system': 'invalid_currency'})

        validated_data['payment_system'] = payment_system
        validated_data['payment'] = payment
        validated_data['player'] = AuthenticatedPlayer(payment.player)
        return validated_data

    def create(self, validated_data):
        payment: Payment = validated_data['payment']
        payment_system: PaymentSystemType = validated_data['payment_system']
        player: AuthenticatedPlayer = validated_data['player']

        try:
            return PendingEvent.objects.get(payment=payment, data__payment_system_name=payment_system.NAME)
        except PendingEvent.DoesNotExist:

            try:
                response = payment_system.send_data(payment.data, player=player)
            except HTTPError as error:
                try:
                    logger.error(f'Payment token request error: {error}, response: {error.response.json()}, '
                                 f'client data: {self.context["request"].data}')
                except JSONDecodeError:
                    logger.error(f'Payment token request error: {error}, client data: {self.context["request"].data}')
                raise ServiceUnavailable()

            response.update(payment_system_name=payment_system.NAME)
            return PendingEvent.objects.create(payment=payment, data=response)

    def to_representation(self, instance):
        payment_system = PaymentSystemManager.payment_system(instance.payment)
        return payment_system.token(instance.data)


class ShortPaymentSerializer(serializers.Serializer):
    player_id = serializers.UUIDField(format='hex')
    transaction_id = serializers.IntegerField(source='id')


class LoginLoyaltyProgramSerializer(serializers.Serializer):
    duration = serializers.IntegerField(read_only=True, source='config.full_duration')
    completed_days = serializers.IntegerField(read_only=True)
    base_bonus = serializers.FloatField(read_only=True)
    full_bonus = serializers.FloatField(read_only=True)
    amount_hot_streak_days = serializers.SerializerMethodField(read_only=True)
    hot_streak_bonus = serializers.FloatField(read_only=True)
    lives = serializers.IntegerField(read_only=True)
    can_accept = serializers.BooleanField(read_only=True)
    logins = serializers.SerializerMethodField()

    def get_logins(self, obj: LoginsLoyaltyProgram) -> typing.List[typing.Dict[str, bool]]:
        result = [
            dict(is_visited=is_visited, hot_streak=False, used_save=False)
            for is_visited in obj.logins_as_bits_array[:obj.completed_days]
        ]

        for index in obj.hot_streak_days:
            result[index]['hot_streak'] = True
        for date in obj.saved_days:
            result[(date - obj.start_date).days]['used_save'] = True
        return result

    def get_amount_hot_streak_days(self, obj: LoginsLoyaltyProgram) -> int:
        return len(obj.hot_streak_days)

    def validate(self, data):
        try:
            instance = LoginsLoyaltyProgram.accept(self.context['request'].user.id)
        except LoginsLoyaltyProgram.CannotAccept:
            raise ValidationError('Loyalty program is not over yet.')
        except LoginsLoyaltyProgram.DoesNotExist:
            raise ValidationError('Loyalty program has not started yet.')
        data['instance'] = instance
        return data

    def create(self, validated_data):
        return validated_data['instance']
