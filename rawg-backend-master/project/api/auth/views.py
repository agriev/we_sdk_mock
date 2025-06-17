import logging

from allauth.account.adapter import get_adapter
from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.providers.openid.provider import OpenIDProvider
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.utils.decorators import method_decorator
from django.utils.encoding import force_text
from django.utils.http import urlsafe_base64_decode
from django.utils.timezone import now
from django.utils.translation import gettext_lazy as _
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from psycopg2 import errorcodes
from rest_auth.registration.views import RegisterView as DefaultRegisterView, SocialLoginView, VerifyEmailView
from rest_auth.views import LoginView, PasswordResetConfirmView as DefaultPasswordResetConfirmView
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.status import HTTP_200_OK, HTTP_204_NO_CONTENT, HTTP_400_BAD_REQUEST
from rest_framework.views import APIView

from api.auth import serializers
from api.auth.permissions import IsSocial
from api.auth.serializers import FacebookLoginSerializer, SteamSerializer, TwitterLoginSerializer, VKLoginSerializer
from apps.users.tasks import ga_auth_login, save_games
from apps.users.views import FacebookOAuth2Adapter, TwitterOAuthAdapter, VKOAuth2Adapter
from apps.utils import facebook, twitter
from apps.utils.ganalytics import get_cid_from_cookie
from apps.utils.request import get_client_ip

logger = logging.getLogger('social')


class LoginMixin(object):
    def login(self):
        super().login()
        self.user.last_login = now()
        self.user.save()
        ratings = self.request.data.get('games_rated', [])
        if ratings:
            save_games.delay(ratings, self.user.pk)
        ga_auth_login.delay(
            self.user.pk,
            get_client_ip(self.request),
            self.request.META.get('HTTP_USER_AGENT'),
            self.request.META.get('HTTP_ACCEPT_LANGUAGE'),
            get_cid_from_cookie(self.request.COOKIES.get('_ga')),
            self.request.LANGUAGE_CODE,
        )


class SocailMixin(object):
    slug = None
    permission_classes = (IsSocial,)
    filter_backends = []

    def dispatch(self, request, *args, **kwargs):
        response = super().dispatch(request, *args, **kwargs)
        if response.status_code != 200:
            logger.info([self.__class__.__name__, self.request.data, response.status_code, response.data])
        return response

    def delete(self, request, *args, **kwargs):
        provider = getattr(self, 'provider', None)
        adapter_class = getattr(self, 'adapter_class', None)
        if not provider and adapter_class:
            provider = adapter_class.provider_id
        try:
            if provider == 'openid':
                social = SocialAccount.objects.filter(provider=provider, user=request.user)
            else:
                app = SocialApp.objects.get_current(provider, request)
                social = SocialAccount.objects.get(user=request.user, socialtoken__app=app)
            social.delete()
        except SocialAccount.DoesNotExist:
            return Response({'details': _('This social account is not connected.')}, HTTP_400_BAD_REQUEST)
        return Response(status=HTTP_204_NO_CONTENT)

    def get_response(self):
        response = super().get_response()
        if 'key' in response.data:
            if self.request.user.is_authenticated:
                if Token.objects.get(key=response.data['key']).user_id != self.request.user.id:
                    return Response({
                        'key': False,
                        'error': _('This social account is already connected to another AG account.')
                    }, HTTP_400_BAD_REQUEST)
            user = Token.objects.get(key=response.data['key']).user
            response.data['new'] = not bool(user.last_entered)
            if self.slug == 'steam' and self.request.user.is_authenticated:
                response.data['steam_id'] = getattr(self.request, 'steam_id', None)
            return Response(response.data, HTTP_200_OK)
        return response

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        ratings = self.request.data.get('games_rated', [])
        if ratings:
            save_games.delay(ratings, self.user.pk)
        return response


class UpdateTokenMixin:
    def update_token(self, user):
        with transaction.atomic():
            Token.objects.filter(user=user).delete()
            Token.objects.create(user=user)


class RegisterView(DefaultRegisterView):
    serializer_class = serializers.RegisterSerializer


class EmailLoginView(LoginMixin, LoginView):
    serializer_class = serializers.EmailLoginSerializer


class FacebookLoginView(SocailMixin, LoginMixin, SocialLoginView):
    serializer_class = FacebookLoginSerializer
    adapter_class = FacebookOAuth2Adapter


class TwitterLoginView(SocailMixin, LoginMixin, LoginView):
    serializer_class = TwitterLoginSerializer
    adapter_class = TwitterOAuthAdapter


class VKLoginView(SocailMixin, LoginMixin, SocialLoginView):
    serializer_class = VKLoginSerializer
    adapter_class = VKOAuth2Adapter


@method_decorator(name='post', decorator=swagger_auto_schema(
    operation_summary='Login or connect a Steam account.',
    operation_description='[How to run an import after account connecting.]'
    '(docs/users.md#how-to-run-a-steam-import-after-steam-account-connecting)',
))
class SteamLoginView(SocailMixin, LoginMixin, LoginView):
    serializer_class = SteamSerializer
    provider = OpenIDProvider.id
    slug = 'steam'


class ConfirmEmailView(VerifyEmailView):
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except IntegrityError as e:
            if (
                e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION
                or e.__cause__.diag.constraint_name != 'users_user_email_key'
            ):
                raise
            return Response({'details': get_adapter(request).error_messages['email_taken']}, HTTP_400_BAD_REQUEST)


class PasswordResetConfirmView(DefaultPasswordResetConfirmView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        uid = force_text(urlsafe_base64_decode(request.data['uid']))
        user = get_user_model().objects.get(pk=uid)
        try:
            email_address = user.emailaddress_set.get(email=user.email)
        except EmailAddress.DoesNotExist:
            email_address = EmailAddress()
            email_address.user = user
            email_address.email = user.email
        confirmation = EmailConfirmationHMAC(email_address)
        confirmation.confirm(request)
        return response


class ChangePasswordView(UpdateTokenMixin, APIView):
    permission_classes = (IsAuthenticated,)
    response_docs = {
        200: openapi.Response(
            '{"details": "Password was changed", "token": "user_auth_token"}',
            serializers.ChangePasswordSerializer,
        )
    }

    @swagger_auto_schema(
        operation_summary='Change password',
        request_body=serializers.ChangePasswordSerializer,
        responses=response_docs,
    )
    def patch(self, request):
        serializer_class = serializers.ChangePasswordSerializer
        if not request.user.has_usable_password():
            serializer_class = serializers.ChangePasswordSimpleSerializer
        serializer = serializer_class(instance=self.request.user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            self.update_token(request.user)
            return Response({'details': 'Password was changed', 'token': request.user.auth_token.key})
        return Response(serializer.errors, HTTP_400_BAD_REQUEST)


class ChangeEmailView(UpdateTokenMixin, APIView):
    permission_classes = (IsAuthenticated,)
    response_docs = {
        200: openapi.Response(
            '{"details": "Confirmation e-mail sent to test@test.io", "token": "user_auth_token"}',
            serializers.ChangeEmailSerializerPassword,
        )
    }

    @swagger_auto_schema(
        operation_summary='Change email',
        request_body=serializers.ChangeEmailSerializerPassword,
        responses=response_docs,
    )
    def patch(self, request):
        serializer_class = serializers.ChangeEmailSerializerPassword
        if not self.request.user.real_email:
            serializer_class = serializers.ChangeEmailSerializer
        serializer = serializer_class(instance=self.request.user, data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            self.update_token(request.user)
            return Response({
                'details': 'Confirmation e-mail sent to {}'.format(serializer.validated_data['new_email']),
                'token': request.user.auth_token.key,
            })
        return Response(serializer.errors, HTTP_400_BAD_REQUEST)


class RequestConfirmEmailView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        email = EmailAddress.objects.get_primary(request.user)
        if email and email.verified:
            return Response({'details': 'Your e-mail {} had been confirmed'.format(email.email)}, HTTP_400_BAD_REQUEST)
        if not email:
            email = EmailAddress.objects.add_email(request, request.user, request.user.email, True, False)
            email.set_as_primary()
        elif not email.verified:
            if cache.get(self.key(email)):
                return Response({'details': 'Please wait 5 minutes'}, HTTP_400_BAD_REQUEST)
            if not cache.get(self.key(email)):
                email.send_confirmation(request)
        cache.add(self.key(email), True, 60 * 5)
        return Response({
            'details': 'Confirmation e-mail sent to {}'.format(email.email)
        })

    def key(self, email):
        return 'api.auth.views.RequestConfirmEmailView.{}'.format(email.id)


class CheckSocialWritePermission(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response({
            'facebook': facebook.check_write_permissions(request.user.id, request.user.source_language),
            'twitter': twitter.check_write_permissions(request.user.id, request.user.source_language),
        })
