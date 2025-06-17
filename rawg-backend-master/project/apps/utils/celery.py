from contextlib import contextmanager
from time import monotonic

from celery.exceptions import Retry
from django.core.cache import cache
from django.db import transaction


@contextmanager
def lock(lock_id, oid, expire=600):
    timeout_at = monotonic() + expire - 3
    status = cache.add(lock_id, oid, expire)
    try:
        yield status
    finally:
        if monotonic() < timeout_at:
            cache.delete(lock_id)


@contextmanager
def lock_transaction(lock_id, oid, expire=600):
    status = cache.add(lock_id, oid, expire)
    timeout_at = monotonic() + expire - 3
    is_retry = False

    def on_commit():
        if not is_retry and monotonic() < timeout_at:
            cache.delete(lock_id)

    with transaction.atomic():
        transaction.on_commit(on_commit)
        try:
            yield status
        except Retry:
            is_retry = True
        except Exception:
            if monotonic() < timeout_at:
                cache.delete(lock_id)
            raise
