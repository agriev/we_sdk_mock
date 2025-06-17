from allauth.account.adapter import get_adapter
from allauth.account.forms import AddEmailForm
from allauth.account.models import EmailAddress
from allauth.socialaccount.adapter import get_adapter as get_social_adapter
from allauth.socialaccount.helpers import complete_social_login
from allauth.socialaccount.models import SocialAccount, SocialLogin, SocialToken
from allauth.socialaccount.providers.openid.views import OpenIDProvider
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import PasswordResetForm as DefaultPasswordResetForm
from django.contrib.sites.shortcuts import get_current_site
from django.core import exceptions
from django.db import IntegrityError
from django.utils.decorators import method_decorator
from django.utils.translation import gettext_lazy as _
from psycopg2 import errorcodes
from rest_auth.registration.serializers import RegisterSerializer as DefaultRegisterSerializer, SocialLoginSerializer
from rest_auth.serializers import LoginSerializer, PasswordResetSerializer as DefaultPasswordResetSerializer
from rest_auth.social_serializers import TwitterLoginSerializer as Twitter
from rest_framework import serializers

from apps.merger.profiles.steam import get_profile
from apps.users.tasks import save_games


def integrity_error(func):
    def inner(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except IntegrityError as e:
            if (
                e.__cause__.pgcode != errorcodes.UNIQUE_VIOLATION
                or e.__cause__.diag.constraint_name not in ('users_user_email_key', 'account_emailaddress_email_key')
            ):
                raise
            raise serializers.ValidationError(get_adapter().error_messages['email_taken'])
    return inner


class RegisterSerializer(DefaultRegisterSerializer):
    email = serializers.EmailField(required=settings.ACCOUNT_EMAIL_REQUIRED, error_messages={
        'required': _("Don't forget to add your email."),
        'invalid': _("That doesn't look like a valid email address.")
    })
    password = serializers.CharField(write_only=True)
    password1 = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)
    games_rated = serializers.ListField(required=False)

    def validate_password(self, password):
        return self.validate_password1(password)

    def validate(self, data):
        return data

    def get_cleaned_data(self):
        return {
            'username': self.validated_data.get('username', ''),
            'password1': self.validated_data.get('password', ''),
            'email': self.validated_data.get('email', ''),
            'games_rated': self.validated_data.get('games_rated', [])
        }

    def save(self, request):
        ratings = request.data.get('games_rated', [])
        user = super().save(request)
        save_games.delay(ratings, user.pk)
        return user


class EmailLoginSerializer(LoginSerializer):
    email = serializers.EmailField()


class ValidateSocialMixin:
    def validate_social(self):
        request = self._get_request()
        view = self.context.get('view')
        adapter = getattr(view, 'adapter_class', None)(request)
        app = adapter.get_provider().get_app(request)
        if SocialToken.objects.filter(account__user_id=request.user.id, app=app).count():
            raise serializers.ValidationError(_('You already connected this social provider.'))


class TwitterLoginSerializer(ValidateSocialMixin, Twitter):
    access_secret = serializers.CharField()
    token_secret = serializers.CharField(required=False)

    @method_decorator(integrity_error)
    def validate(self, attrs):
        self.validate_social()
        attrs['token_secret'] = attrs['access_secret']
        return super().validate(attrs)


class FacebookLoginSerializer(ValidateSocialMixin, SocialLoginSerializer):
    @method_decorator(integrity_error)
    def validate(self, attrs):
        self.validate_social()
        return super().validate(attrs)


class VKLoginSerializer(ValidateSocialMixin, SocialLoginSerializer):
    @method_decorator(integrity_error)
    def validate(self, attrs):
        self.validate_social()
        return super().validate(attrs)

    def get_social_login(self, adapter, app, token, response):
        request = self._get_request()
        social_login = adapter.complete_login(
            request, app, token, response=response, email=self.context['request'].data.get('email')
        )
        social_login.token = token
        return social_login


class SteamSerializer(serializers.Serializer):
    open_id = serializers.CharField()
    key = serializers.CharField()

    @method_decorator(integrity_error)
    def validate(self, attrs):
        if settings.ENVIRONMENT == 'PRODUCTION' and attrs.get('key') != settings.STEAM_API_KEY:
            raise serializers.ValidationError('Invalid key')

        request = self.context.get('request')

        extra_data = get_profile(attrs.get('open_id').split('/').pop(), False)
        if not extra_data:
            raise serializers.ValidationError(_('Steam user is not found.'))

        old_social_accounts = SocialAccount.objects.filter(user_id=request.user.id, provider=OpenIDProvider.id)
        if old_social_accounts.count():
            # because user can connect new account without disconnecting
            old_social_accounts.delete()

        email = '{}@steam.com'.format(extra_data['steamid'])
        adapter = get_social_adapter(request)
        social_account = SocialAccount(extra_data=extra_data, uid=extra_data['steamid'], provider=OpenIDProvider.id)
        login = SocialLogin(
            account=social_account,
            email_addresses=[EmailAddress(email=email, verified=True, primary=True)]
        )
        login.user = adapter.new_user(request, login)
        login.user.set_unusable_password()
        login.user.steam_id = extra_data['profileurl']
        if request.user.is_authenticated:
            request.steam_id = extra_data['profileurl']
        adapter.populate_user(request, login, {
            'username': extra_data['personaname'],
            'email': email,
        })
        request.original_username = login.user.username
        complete_social_login(request, login)

        attrs['user'] = login.account.user
        return attrs


class ChangePasswordSimpleSerializer(serializers.Serializer):
    new_password = serializers.CharField()
    verify_password = serializers.CharField()
    result = {
        'new_password': True,
        'verify_password': True,
    }

    def validate(self, attributes):
        if attributes['new_password'] != attributes['verify_password']:
            raise serializers.ValidationError({
                'verify_password': _('Verify password does not equals to new password.')
            })
        return attributes

    def validate_new_password(self, value):
        user = self.context['request'].user
        try:
            get_adapter().clean_password(value, user)
        except exceptions.ValidationError as exception:
            raise serializers.ValidationError(exception.messages)
        return value

    def update(self, instance, validated_data):
        instance.set_password(validated_data['new_password'])
        instance.save()
        get_adapter(self.context['request']).change_password_email(instance)
        return self.result


class ChangePasswordSerializer(ChangePasswordSimpleSerializer):
    old_password = serializers.CharField()
    result = {
        'new_password': True,
        'verify_password': True,
        'old_password': True,
    }

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(_('Old password does not match.'))
        return value


class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField()
    verify_email = serializers.EmailField()

    def validate(self, attributes):
        if attributes['new_email'] != attributes['verify_email']:
            raise serializers.ValidationError({
                'verify_email': _('Verify email does not match to new e-mail.')
            })
        return attributes

    def validate_new_email(self, value):
        email = EmailAddress.objects.get_primary(self.context['request'].user)
        if not email or not email.verified:
            raise serializers.ValidationError(_('Your current e-mail is not confirmed.'))
        self.form = AddEmailForm(self.context['request'].user, {'email': value})
        if not self.form.is_valid():
            errors = []
            for f, e in dict(self.form.errors).items():
                errors += [e.message[:-1] if e.message[-1] == '.' else e.message for e.message in e]
            raise serializers.ValidationError(errors)
        return self.form.cleaned_data['email']

    def update(self, instance, validated_data):
        self.form.save(self.context['request'])
        return {
            'new_email': True,
            'verify_email': True,
        }


class ChangeEmailSerializerPassword(ChangeEmailSerializer):
    password = serializers.CharField()

    def validate_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError(_('Password does not match.'))
        return value

    def update(self, instance, validated_data):
        data = super().update(instance, validated_data)
        data['password'] = True
        return data


class PasswordResetForm(DefaultPasswordResetForm):
    def save(self, *args, **kwargs):
        kwargs['domain_override'] = get_current_site(kwargs['request']).name
        self.request = kwargs['request']
        super().save(*args, **kwargs)

    def send_mail(
        self, subject_template_name, email_template_name, context, from_email, to_email,
        html_email_template_name=None
    ):
        get_adapter(self.request).reset_password_email(to_email, context)

    def get_users(self, email):
        return get_user_model()._default_manager.filter(**{
            '%s__iexact' % get_user_model().get_email_field_name(): email,
            'is_active': True,
        })


class PasswordResetSerializer(DefaultPasswordResetSerializer):
    password_reset_form_class = PasswordResetForm
