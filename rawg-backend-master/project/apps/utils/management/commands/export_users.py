import logging
import random
import re
import secrets
import time
from collections import defaultdict
from urllib.error import URLError

from allauth.account.models import EmailAddress
from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth.hashers import UNUSABLE_PASSWORD_SUFFIX_LENGTH
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand
from django.core.paginator import Paginator
from django.db import connection
from django.db.models import OuterRef, Q, Subquery
from django.db.utils import IntegrityError
from django.utils.crypto import get_random_string
from papi import API, PAPIValidationError

from apps.users.models import User

papi_conf = settings.PAPI_IMPORT_CONFIG
api = API(papi_conf['API_URL'], papi_conf['APP_ID'], papi_conf['SECRET'])

logger = logging.getLogger('commands')


def get_pages(objects, page_size):
    paginator = Paginator(objects, page_size)
    for page_number in paginator.page_range:
        yield paginator.page(page_number)


def validate_user_data(user):
    name_match = re.compile(r'^[\w\.\-\+\@ ]+$', re.U)
    email_pattern = re.compile(
        r'^[-_\.\+]*[a-zA-Z0-9][-_\.\+a-zA-Z0-9]*@[a-zA-Z0-9](?:[-\.]?[a-zA-Z0-9])*?\.[a-zA-Z]{2,6}$',
    )
    try:
        assert user._email, 'no email'
        assert email_pattern.match(user._email), 'wrong email format'
        assert len(user._email) <= 75, 'email longer than 75'
    except AssertionError as error:
        raise ValidationError(str(error))
    else:
        if not name_match.match(user.username):
            user.username = ''.join(re.findall(r'[\w\.\-\+\@ ]+', user.username))
        if len(user.username) > 26:
            user.username = user.username[:26]
        if user.full_name and (not name_match.match(user.full_name) or len(user.full_name) > 26):
            user.full_name = user.username
        return user


def make_request_data(users, source_app):
    users_info = defaultdict(list)
    for user in users:
        users_info['logins'].append(user.username)
        users_info['usernames'].append(user.full_name or user.username)
        users_info['emails'].append(user._email)
        users_info['passwords'].append(user.password or f'!{get_random_string(UNUSABLE_PASSWORD_SUFFIX_LENGTH)}')
        users_info['password_formats'].append('PBKDF2_SHA256SALTED')
        users_info['c_times'].append(str(int(user.date_joined.timestamp())))
        users_info['la_dts'].append(str(int(
            user.last_login.timestamp() if user.last_login else user.date_joined.timestamp()))
        )
        users_info['c_app_ids'].append(str(source_app))
        users_info['is_confirmed'].append(str(int(user.is_confirmed)))
        users_info['a_vks'].append(str(user._vk_id or ''))

    _users_info = defaultdict(str)
    for field, values in users_info.items():
        _users_info[field] = ','.join(values)
    return _users_info


def make_unique(user):
    prefix = secrets.token_urlsafe(8)
    username_length = User.username_max_length - len(prefix)
    user.username = user.username[:username_length] + prefix
    user.save_slug()
    return user


def export_to_papisrv(users_info):
    response = api.user.import_users(**users_info)
    papisrv_users = response.get('users')
    assert isinstance(papisrv_users, list)
    return papisrv_users


class Command(BaseCommand):
    def add_arguments(self, parser):
        help_text = 'Application where users have registered'
        parser.add_argument(
            '-a', '--app', nargs=1, required=True, dest='source_app', help=help_text
        )
        help_text = 'Number of requested users in one SQL query. Minimum 1.'
        parser.add_argument(
            '-s', '--ag_batch_size', nargs=1, default=[1000], dest='ag_batch_size', type=int, help=help_text
        )
        help_text = 'Number of users imported into papisrv per one POST request (from 1 to 100).'
        parser.add_argument(
            '-b', '--papi_batch_size', nargs=1, default=[100], dest='papi_batch_size', type=int, help=help_text
        )
        parser.add_argument(
            '-p', '--pks', nargs='*', dest='pks', type=int, help='Filter users to export by pk'
        )
        parser.add_argument(
            '-e', '--emails', nargs='*', dest='emails', help='Filter users to export by email'
        )
        parser.add_argument(
            '-j', '--vk_only', nargs=1, default=[False], dest='vk_only', help='Export users with vk accounts only'
        )

    def handle(self, *args, **kwargs):
        start = time.time()
        source_app = kwargs.get('source_app')[0]
        ag_batch_size = kwargs.get('ag_batch_size')[0]
        papi_batch_size = kwargs.get('papi_batch_size')[0]
        users_pks, users_emails = kwargs.get('pks'), kwargs.get('emails')
        vk_only = kwargs.get('vk_only')[0]
        query_size = '999' if connection.vendor == 'sqlite' else None
        if not 1 <= papi_batch_size <= 100 or ag_batch_size < 1:
            raise ValueError('Invalid argument value')
        if users_pks and users_emails:
            qs_filter = [Q(pk__in=users_pks) | Q(emailaddress__email__in=users_emails)]
        elif users_pks:
            qs_filter = [Q(pk__in=users_pks)]
        elif users_emails:
            qs_filter = [Q(emailaddress__email__in=users_emails)]
        else:
            qs_filter = []
        if vk_only:
            qs_filter.append(Q(socialaccount__provider='vk'))

        email_annotate = Subquery(EmailAddress.objects.filter(user=OuterRef('pk'), primary=True).values('email'))
        vk_id_annotate = Subquery(SocialAccount.objects.filter(user=OuterRef('pk'), provider='vk').values('uid'))
        fields = ('username', 'password', 'date_joined', 'last_login', 'is_confirmed', 'slug', 'is_active')
        queryset = User.objects.only(*fields).filter(*qs_filter).annotate(_email=email_annotate, _vk_id=vk_id_annotate)

        for page_from_db in get_pages(queryset, ag_batch_size):
            logger.info(f'Start {page_from_db} from db')
            invalid = []
            vk_accounts = []
            for page_to_papi in get_pages(page_from_db, papi_batch_size):
                logger.info(f'Start {page_to_papi} to papi')
                valid = []
                for user in page_to_papi:
                    try:
                        valid.append(validate_user_data(user))
                    except ValidationError:
                        user.is_active = False
                        invalid.append(make_unique(user))
                if not valid:
                    continue
                users_info = make_request_data(valid, source_app)
                exported_by_email = {}
                exported_by_vk = {}
                try:
                    exported_users = export_to_papisrv(users_info)
                    for exported_user in exported_users:
                        exported_by_email[exported_user['email'].lower()] = exported_user
                        for vk_id in exported_user['a_vk']:
                            exported_by_vk[vk_id] = exported_user
                except (URLError, KeyError, AssertionError, PAPIValidationError) as error:
                    logger.info(f'Error when import users to papisrv:\n{error}')
                    logger.info(f'Cant import users with PKs: {[user.pk for user in valid]}')
                else:
                    success_exported, not_exported = [], []
                    for user in valid:
                        if user._email.lower() in exported_by_email and 'uid' in exported_by_email[user._email.lower()]:
                            info = exported_by_email[user._email.lower()]
                            if info['a_vk']:
                                SocialAccount.objects.exclude(user=user).filter(provider='vk', uid__in=info['a_vk']).delete()
                                vk_accounts.append(SocialAccount(user=user, provider='vk', uid=info['a_vk'][0]))
                        elif user._vk_id and user._vk_id in exported_by_vk and 'uid' in exported_by_vk[user._vk_id]:
                            info = exported_by_vk[user._vk_id]
                        else:
                            not_exported.append(str(user.pk))
                            continue
                        user.sync(info)
                        user.is_active = True
                        user.save_slug()
                        success_exported.append(user)
                    if not_exported:
                        logger.info(f'Users with pks send, but not in response from papisrv: {", ".join(not_exported)}')
                    fields_to_update = [
                        'gid', 'username', 'first_name', 'last_name', 'email', 'avatar', 'is_confirmed', 'slug'
                    ]
                    try:
                        User.objects.bulk_update(success_exported, fields=fields_to_update, batch_size=query_size)
                    except IntegrityError as error:
                        logger.info(f'Cant update exported users:\n{error}')
                        try:
                            resolve_conflicts(success_exported)
                        except IntegrityError as error:
                            logger.info(f'Cant change duplicates:\n{error}')
                        else:
                            try:
                                User.objects.bulk_update(
                                    success_exported, fields=fields_to_update, batch_size=query_size
                                )
                            except IntegrityError as error:
                                logger.info(f'Cant update user even after changing duplicates:\n{error}')
            if invalid:
                User.objects.bulk_update(invalid, ['username', 'slug', 'is_active'], batch_size=query_size)
            if vk_accounts:
                SocialAccount.objects.bulk_create(vk_accounts, batch_size=query_size, ignore_conflicts=True)
            time.sleep(random.randrange(1, 4))
        delta = time.time() - start
        logger.info(f'Export was performed: {int(delta // 60)} minutes, {int(delta % 60)} seconds')


def resolve_conflicts(presaved_users):
    logger.info('Started fixing conflicts')
    users_by_slug, slugs, pks, resolved_users = {}, [], [], []
    for user in presaved_users:
        users_by_slug[user.slug] = user
        slugs.append(user.slug)
        pks.append(user.pk)
    for duplicate in User.objects.filter(slug__in=slugs).exclude(pk__in=pks):
        if duplicate.slug in users_by_slug:
            resolved_users.append(make_unique(duplicate))
            logger.info('Conflict resolved.')
    User.objects.bulk_update(resolved_users, fields=['username', 'slug'])
