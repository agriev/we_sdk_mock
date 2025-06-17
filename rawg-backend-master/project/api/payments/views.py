import logging

from django.db import models, transaction
from django_filters import utils
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed, ParseError, PermissionDenied
from rest_framework.generics import get_object_or_404
from rest_framework.mixins import CreateModelMixin, ListModelMixin, UpdateModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.settings import api_settings
from rest_framework.views import APIView, exception_handler
from rest_framework.viewsets import GenericViewSet

from apps.payments.models import LoginsLoyaltyProgram, Payment
from apps.users.models import PlayerBase
from apps.utils.crypto import check_signature
from apps.utils.rest_framework import MultiPermissionsViewSetMixin, MultiQuerysetViewSetMixin, \
    MultiSerializerViewSetMixin
from .exceptions import InvalidJSONError, InvalidParameterError, ServiceUnavailable, WebhookException
from .filters import PaymentFilterSet
from .paginations import JSONPageNumberPagination
from .parsers import JSONRawBodyParser
from .permissions import UkassaIpPermission, XsollaIpPermission
from .serializers import GetTransactionSerializer, ListTransactionQueryParamsSerializer, \
    ListTransactionRequestBodySerializer, LoginLoyaltyProgramSerializer, MultiSerializersByDataMixin, \
    PaymentCreateSerializer, PaymentReadSerializer, PaymentUpdateSerializer, PaymentWebhookSerializer, \
    PendingEventSerializer, RefundWebhookSerializer, ShortPaymentSerializer, UkassaPaymentCanceledSerializer, \
    UkassaPaymentSucceededWebhookSerializer, UkassaRefundWebhookSerializer, UserValidationWebhookSerializer
from .utils import auth_header_signature

logger = logging.getLogger('payment')


def webhook_exception_handler(exc, context) -> Response:
    if isinstance(exc, WebhookException):
        return Response(
            {'error': {'code': exc.code, 'message': exc.message}},
            status=status.HTTP_400_BAD_REQUEST
        )
    if isinstance(exc, ParseError):
        logger.error(str(exc))
        return Response(
            {'error': {'code': InvalidJSONError.code, 'message': InvalidJSONError.message}},
            status=status.HTTP_400_BAD_REQUEST
        )
    if isinstance(exc, serializers.ValidationError):
        logger.error(f"Unexpected data from xsolla, errors:\n{exc}")
        return Response(
            {'error': {'code': InvalidParameterError.code, 'message': InvalidParameterError.message}},
            status=status.HTTP_400_BAD_REQUEST
        )
    return exception_handler(exc, context)


class WebhookView(MultiSerializersByDataMixin, APIView):
    parser_classes = (JSONRawBodyParser,)
    permission_classes = (XsollaIpPermission,)
    serializer_classes = [
        UserValidationWebhookSerializer,
        PaymentWebhookSerializer,
        RefundWebhookSerializer
    ]

    def post(self, request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        with transaction.atomic():
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def get_exception_handler(self):
        return webhook_exception_handler


class UkassaWebhookView(MultiSerializersByDataMixin, APIView):
    parser_classes = (JSONRawBodyParser,)
    permission_classes = (UkassaIpPermission,)
    serializer_classes = [
        UkassaPaymentSucceededWebhookSerializer,
        UkassaRefundWebhookSerializer,
        UkassaPaymentCanceledSerializer
    ]

    def post(self, request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        with transaction.atomic():
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return Response(status=status.HTTP_200_OK)

    def get_exception_handler(self):
        def handler(exc, context):
            logger.error(f'Ukassa webhook error: {exc}')
            return exception_handler(exc, context)
        return handler


class PaymentViewSet(MultiSerializerViewSetMixin, MultiQuerysetViewSetMixin, MultiPermissionsViewSetMixin,
                     CreateModelMixin, ListModelMixin, UpdateModelMixin, GenericViewSet):
    parser_classes = (JSONRawBodyParser,)
    authentication_classes = ()
    permission_classes = ()
    permission_action_classes = {
        'by_token': (IsAuthenticated,),
        'token': (IsAuthenticated,),
    }
    filter_backends = (DjangoFilterBackend,)
    filterset_class = PaymentFilterSet
    lookup_field = 'id'

    queryset = Payment.objects.exclude_initial()
    queryset_actions = {
        'by_token': queryset.only('id', 'player_id'),
        'partial_update': queryset.annotate(secret_key=models.F('game__secret_key')),
        'token': queryset.join_and_lock_balance()
    }

    serializer_action_classes = {
        'create': PaymentCreateSerializer,
        'list': PaymentReadSerializer,
        'filter': PaymentReadSerializer,
        'partial_update': PaymentUpdateSerializer,
        'token': PendingEventSerializer,
        'by_token': ShortPaymentSerializer,
    }

    def list(self, request, *args, **kwargs):
        param_serializer = ListTransactionQueryParamsSerializer(data=request.query_params, context={'request': request})
        param_serializer.is_valid(raise_exception=True)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['POST'], pagination_class=JSONPageNumberPagination)
    def filter(self, request, *args, **kwargs):
        serializer = ListTransactionRequestBodySerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        filterset = self.filterset_class(data=serializer.validated_data, queryset=self.get_queryset(), request=request)
        if not filterset.is_valid():
            raise utils.translate_validation(filterset.errors)
        queryset = filterset.qs
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        if self.action == 'update':
            raise MethodNotAllowed(request.method)
        self.filterset_class = ()
        return super().update(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = serializer.save()
        return Response(dict(transaction_id=payment.id, token=payment.token), status=status.HTTP_200_OK)

    @action(detail=False, methods=['POST'], authentication_classes=api_settings.DEFAULT_AUTHENTICATION_CLASSES)
    @transaction.atomic
    def token(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['GET'], authentication_classes=api_settings.DEFAULT_AUTHENTICATION_CLASSES,
            url_path=r'by_token/(?P<token>[-.~\w]+)', filterset_class=None)
    def by_token(self, request, token):
        queryset = self.filter_queryset(self.get_queryset())
        payment = get_object_or_404(queryset, token=token, player_id=PlayerBase.from_request(request).id)
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    def get_exception_handler(self):
        handler = super().get_exception_handler()

        def payment_exception_handler(exc, context):
            if isinstance(exc, ServiceUnavailable):
                return Response(data={'error': exc.default_detail}, status=exc.status_code)
            return handler(exc, context)

        return payment_exception_handler


class TransactionView(APIView):
    parser_classes = (JSONRawBodyParser,)
    serializer_class = GetTransactionSerializer
    authentication_classes = ()

    def get(self, request: Request, *args, **kwargs):
        serializer = self.serializer_class(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        queryset = Payment.objects.exclude_initial().annotate(secret_key=models.F('game__secret_key'))
        transaction = get_object_or_404(queryset, id=serializer.validated_data['transaction_id'])
        self.check_signature(request, transaction.secret_key)
        return Response(PaymentReadSerializer(transaction).data)

    def check_signature(self, request, secret_key: str):
        if not check_signature(auth_header_signature(request), map(str, request.query_params.values()), secret_key):
            raise PermissionDenied()


class LoginLoyaltyProgramView(APIView):
    serializer_class = LoginLoyaltyProgramSerializer
    permission_classes = (IsAuthenticated,)
    queryset = LoginsLoyaltyProgram.objects.not_accepted().select_related('config')

    def get(self, request: Request, *args, **kwargs):
        loyalty_program = get_object_or_404(self.queryset, user=request.user)
        return Response(self.serializer_class(loyalty_program).data)

    def post(self, request: Request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_200_OK)
