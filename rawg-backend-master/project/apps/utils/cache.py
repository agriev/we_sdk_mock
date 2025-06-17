import importlib
import inspect
import time

from cacheback.base import Job as OldJob
from django.conf import settings
from django.core.cache import cache
from django.core.cache.backends.base import DEFAULT_TIMEOUT
from django.core.cache.backends.memcached import PyLibMCCache


class Job(OldJob):
    is_warm = False

    def refresh(self, *args, **kwargs):
        result = super().refresh(*args, **kwargs)
        if self.is_warm:
            cache.set(self.expired_key(*args, **kwargs), time.time() + self.lifetime, self.lifetime)
        return result

    def expired_at(self, *args, **kwargs):
        return cache.get(self.expired_key(*args, **kwargs))

    def expired_key(self, *args, **kwargs):
        return '{}:expired'.format(self.key(*args, **kwargs))


def warm_cache(applications=None, invalidate=False):
    if not applications:
        applications = settings.WARM_CACHE_APPS
    for app in applications:
        app_cache = importlib.import_module('apps.{}.cache'.format(app))
        for name, cls in inspect.getmembers(app_cache, inspect.isclass):
            if not getattr(cls, 'is_warm', None):
                continue
            if not getattr(cls, 'warm_keys', None):
                cls.warm_keys = ((),)
            for args in cls.warm_keys:
                expired = cls().expired_at(*args)
                if not expired or time.time() + 60 * 15 >= expired or invalidate:
                    cls().invalidate(*args)


class SilentPyLibMCCache(PyLibMCCache):
    def get(self, key, default=None, version=None):
        try:
            return super().get(key, default, version)
        except Exception:
            return default

    def set(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        try:
            super().set(key, value, timeout, version)
        except Exception:
            return
