from django.core.cache import cache

key = 'apps.merger.counters.{}'
lifetime = 60 * 60 * 24


def stores():
    from apps.merger.tasks.common import STORES
    for store in STORES:
        if not store.sync:
            continue
        yield key.format(store.field)


def add(field):
    field_key = key.format(field)
    try:
        cache.incr(field_key)
    except ValueError:
        cache.set(field_key, 1, lifetime)


def get(field=None):
    if not field:
        return cache.get_many([s for s in stores()])
    return cache.get(key.format(field)) or 0


def reset():
    for field_key in stores():
        cache.set(field_key, 0, lifetime)
