import os
import shutil
import typing
from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime as dt, timedelta
from importlib import import_module
from unittest.mock import MagicMock, patch

import gender_predictor
from django.conf import settings
from django.contrib.auth import user_logged_in
from django.core.cache import cache
from django.http import HttpRequest
from django.test.runner import DiscoverRunner
from django.test.utils import _TestState
from knbauth import CONFIG, api
from knbauth.utils import get_or_create_user
from papi.exceptions import PAPIUserNotFoundError, PAPIWrongPasswordError
from rest_framework.test import APIClient as drf_APIClient, APITestCase as drf_APITestCase, APITransactionTestCase as drf_APITransactionTestCase


@contextmanager
def changed_date(offset: typing.Union[int, float]) -> typing.Generator[MagicMock, None, None]:
    new_date = dt.now() + timedelta(days=offset)
    patcher = patch('time.time', return_value=new_date.timestamp())
    try:
        yield patcher.start()
    finally:
        patcher.stop()


class TestRunner(DiscoverRunner):
    def setup_test_environment(self, **kwargs):
        super().setup_test_environment(**kwargs)
        if os.environ.get('TESTS_ENVIRONMENT') in ('MAIL', 'LOCAL_MAIL'):
            settings.EMAIL_BACKEND = _TestState.saved_data.email_backend

    def run_tests(self, test_labels, extra_tests=None, **kwargs):
        # todo move to BaseTestClass
        with patch.object(gender_predictor.GenderPredictor, 'classify') as mock_classify,\
                patch.object(gender_predictor.GenderPredictor, 'train_and_test') as mock_train_and_test, \
                patch.object(gender_predictor.GenderPredictor, '__init__') as mock_init:
            mock_init.return_value = None
            mock_train_and_test.return_value = None
            mock_classify.return_value = 'u'
            return super().run_tests(test_labels, extra_tests, **kwargs)


def haystack_test_config(index):
    conf = deepcopy(settings.HAYSTACK_CONNECTIONS)
    conf['default']['INDEX_NAME'] = index.replace('.', '_').lower()
    return {'HAYSTACK_CONNECTIONS': conf}


def cache_test_config(index):
    tmp_folder = f'/tmp/{index}'
    shutil.rmtree(tmp_folder, ignore_errors=True)
    return {
        'CACHES': {
            'default': {
                'BACKEND': 'django.core.cache.backends.filebased.FileBasedCache',
                'LOCATION': tmp_folder,
            }
        }
    }


class APIClient(drf_APIClient):
    def login(self, username, password):
        try:
            user = api.user.auth_by_login(login=username, password=password)
        except (PAPIUserNotFoundError, PAPIWrongPasswordError):
            return False
        session = api.session.create_by_uid(uid=user['uid'],
                                            ttl=60 * 60 * 24 * 30)

        self.cookies[CONFIG['COOKIE_NAME']] = session['sid']
        cookie_data = {
            'max-age': None,
            'path': '/',
            'expires': None,
        }
        self.cookies[CONFIG['COOKIE_NAME']].update(cookie_data)
        auth_user = get_or_create_user(session['user'])
        if auth_user and 'django.contrib.sessions' in settings.INSTALLED_APPS:
            engine = import_module(settings.SESSION_ENGINE)
            # Create a fake request to store login details.
            request = HttpRequest()
            if self.session:
                request.session = self.session
            else:
                request.session = engine.SessionStore()
            request.user = auth_user
            user_logged_in.send(sender=user.__class__, request=request,
                                user=auth_user)

            request.session.save()

            # Set the cookie to represent the session.
            session_cookie = settings.SESSION_COOKIE_NAME
            self.cookies[session_cookie] = request.session.session_key
            cookie_data = {
                'max-age': None,
                'path': '/',
                'domain': settings.SESSION_COOKIE_DOMAIN,
                'secure': settings.SESSION_COOKIE_SECURE or None,
                'expires': None,
            }
            self.cookies[session_cookie].update(cookie_data)
        return True


class APITestCleanupMixin:
    @classmethod
    def _clear(cls):
        cache.clear()
        api.cleanup()
        # api.db.persist()

    @classmethod
    def setUpClass(cls):
        cls._clear()
        super(APITestCleanupMixin, cls).setUpClass()

    @classmethod
    def tearDownClass(cls):
        cls._clear()
        super(APITestCleanupMixin, cls).tearDownClass()


class APITestCase(APITestCleanupMixin, drf_APITestCase):
    client_class = APIClient


class APITransactionTestCase(APITestCleanupMixin, drf_APITransactionTestCase):
    client_class = APIClient
