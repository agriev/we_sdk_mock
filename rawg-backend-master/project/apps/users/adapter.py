from http.client import RemoteDisconnected
from urllib.error import HTTPError
from urllib.request import urlopen

from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.models import EmailAddress
from allauth.account.utils import user_field
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.socialaccount.providers.base import AuthProcess
from django.contrib.auth import get_user_model
from django.core.files import File
from django.core.files.storage import default_storage
from django.core.files.temp import NamedTemporaryFile

from apps.common.cache import CommonContentType
from apps.pusher.models import Notification
from apps.users.models import User, UserFollowElement, UserReferer
from apps.utils import facebook, steam, twitter
from apps.utils.ganalytics import get_cid_from_cookie
from apps.utils.lang import get_site_by_language
from apps.utils.request import get_client_ip
from apps.utils.tasks import send_email


def generate_unique_username(txts, regex=None):
    from django.core.validators import ValidationError
    from allauth.account.adapter import get_adapter
    from allauth.account.utils import filter_users_by_username
    from allauth.utils import _generate_unique_username_base
    from allauth.utils import generate_username_candidates

    adapter = get_adapter()
    basename = _generate_unique_username_base(txts, regex)
    candidates = generate_username_candidates(basename)
    existing_users = filter_users_by_username(*candidates).values_list('username', flat=True)
    existing_users = [u.lower() for u in existing_users]  # lower case
    for candidate in candidates:
        if candidate.lower() not in existing_users:  # check also in lower case
            try:
                return adapter.clean_username(candidate, shallow=True)
            except ValidationError:
                pass

    raise NotImplementedError('Unable to find a unique username')


class CustomAccountAdapter(DefaultAccountAdapter):
    def confirm_email(self, request, email_address):
        user = email_address.user
        old_primary = EmailAddress.objects.get_primary(user)
        email_address.verified = True
        email_address.set_as_primary()
        email_address.save()
        if old_primary and old_primary.verified:
            send_email.delay(
                f'account/email_{request.LANGUAGE_CODE}/email_changed', {}, [old_primary.email],
                language=request.LANGUAGE_CODE
            )
            old_primary.delete()
        User.objects.filter(id=user.id).update(is_confirmed=True)
        Notification.objects.create(
            user=user,
            action='email-confirm',
            data={'email': email_address.email, 'status': 'ready'}
        )

    def change_password_email(self, user):
        send_email.delay(
            f'account/email_{self.request.LANGUAGE_CODE}/password_changed', {}, [user.real_email],
            language=self.request.LANGUAGE_CODE
        )

    def reset_password_email(self, email, context):
        if context.get('user'):
            del context['user']
        send_email.delay(
            f'account/email_{self.request.LANGUAGE_CODE}/password_reset', context, [email],
            language=self.request.LANGUAGE_CODE
        )

    def get_login_redirect_url(self, request):
        return 'https://{}/confirm_email/login'.format(get_site_by_language(request.LANGUAGE_CODE).name)

    def get_email_confirmation_url(self, request, emailconfirmation):
        return 'https://{}/confirm_email/{}'.format(
            get_site_by_language(request.LANGUAGE_CODE).name, emailconfirmation.key
        )

    def send_confirmation_mail(self, request, emailconfirmation, signup):
        ctx = {
            'user': emailconfirmation.email_address.user,
            'activate_url': self.get_email_confirmation_url(request, emailconfirmation),
            'current_site': get_site_by_language(request.LANGUAGE_CODE),
            'key': emailconfirmation.key,
            'language': request.LANGUAGE_CODE,
        }
        if signup:
            email_template = f'account/email_{request.LANGUAGE_CODE}/email_confirmation_signup'
        else:
            email_template = f'account/email_{request.LANGUAGE_CODE}/email_confirmation'
        self.send_mail(email_template, emailconfirmation.email_address.email, ctx)

    def send_mail(self, template_prefix, email, context):
        del context['current_site']
        if context.get('user'):
            context['user'] = context['user'].username
        send_email.delay(template_prefix, context, [email], language=context['language'])

    def populate_username(self, request, user):
        self.request = request
        super().populate_username(request, user)

    def generate_unique_username(self, txts, regex=None):
        if hasattr(self.request, 'original_username') and self.request.original_username:
            txts = [self.request.original_username] + list(txts)
        return generate_unique_username(txts, regex)

    def save_user(self, request, user, form, commit=True):
        user = super().save_user(request, user, form, commit=False)
        user.referer = request.META.get('HTTP_REFERER_REFERER', '')[0:500]
        user.save()

        referer_trp = request.META.get('HTTP_REFERER_TRP', '')
        if referer_trp and get_user_model().objects.filter(id=referer_trp).exists():
            UserReferer.objects.create(user=user, referer_id=referer_trp)

        return user

    def new_user(self, request):
        user = super().new_user(request)
        user.ip = get_client_ip(request)
        user.ua = request.META.get('HTTP_USER_AGENT')
        user.al = request.META.get('HTTP_ACCEPT_LANGUAGE')
        user.cid = get_cid_from_cookie(request.COOKIES.get('_ga'))
        user.source_language = request.LANGUAGE_CODE
        return user

    # all actions with sessions must be disabled

    def login(self, request, user):
        pass

    def stash_verified_email(self, request, email):
        pass

    def unstash_verified_email(self, request):
        pass

    def stash_user(self, request, user):
        pass

    def unstash_user(self, request):
        pass

    def add_message(self, request, level, message_template, message_context=None, extra_tags=''):
        pass


class CustomDefaultSocialAccountAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        if request.user.is_authenticated:
            sociallogin.state = {'process': AuthProcess.CONNECT}

    def is_auto_signup_allowed(self, request, sociallogin):
        return True

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)
        user_field(user, 'full_name', '{} {}'.format(user.first_name, user.last_name).strip())
        return user

    def save_user(self, request, sociallogin, form=None):
        users = get_user_model().objects.filter(email=sociallogin.user.email)
        if sociallogin.user.email and len(users):
            user = users.first()
            sociallogin.user = user
            sociallogin.save(request, True)
            self.friends(sociallogin)
            return user
        user = super().save_user(request, sociallogin, form)

        self.avatar(sociallogin, user)
        self.friends(sociallogin)

        return user

    def avatar(self, sociallogin, user):
        avatar = None

        if sociallogin.account.provider == 'twitter':
            avatar = (sociallogin.account.extra_data.get('profile_image_url_https') or '').replace('_normal', '')
        elif sociallogin.account.provider == 'facebook':
            fb = (sociallogin.account.extra_data.get('picture') or {}).get('data') or {}
            if fb and not fb.get('is_silhouette'):
                avatar = fb.get('url')
        elif sociallogin.account.provider == 'steam':
            avatar = sociallogin.account.extra_data.get('avatarfull')

        if avatar:
            try:
                img_temp = NamedTemporaryFile(delete=True)
                img_temp.write(urlopen(avatar).read())
                img_temp.flush()
                avatar_url = default_storage.save(avatar.split('?')[0].split('/').pop(), File(img_temp))
                User.objects.filter(id=user.id).update(avatar=avatar_url)
            except (HTTPError, RemoteDisconnected, ConnectionResetError, ValueError):
                pass

    def friends(self, sociallogin):
        friends = []

        if sociallogin.account.provider == 'twitter':
            friends = twitter.friends(sociallogin.user.id, sociallogin.user.source_language)
        elif sociallogin.account.provider == 'facebook':
            friends = facebook.friends(sociallogin.user.id, sociallogin.user.source_language)
        elif sociallogin.account.provider == 'steam':
            friends = steam.friends(sociallogin.user.id)

        for user_id in friends:
            UserFollowElement.objects.get_or_create(
                user_id=sociallogin.user.id, object_id=user_id, content_type=CommonContentType().get(get_user_model())
            )
