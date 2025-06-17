import multiprocessing
from datetime import timedelta
from time import sleep

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management.base import BaseCommand
from django.db import connections
from django.utils.timezone import now

from apps.merger import counters, tasks
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('is_weekly', type=int)
        parser.add_argument('-u', '--user_id', action='store', dest='user_id', default=0, type=int)

    def handle(self, *args, **options):
        is_weekly = options['is_weekly']
        user_id = options['user_id']
        try:
            self.process(is_weekly, user_id)
        except KeyboardInterrupt:
            print('Bye!')

    def process(self, is_weekly, user_id):
        params = []
        for store in tasks.STORES:
            if not store.sync:
                continue
            args = [store, is_weekly]
            if user_id:
                args.append(user_id)
            params.append(args)

        counters.reset()

        if settings.ENVIRONMENT == 'TESTS':
            results_all = []
            for param in params:
                results_all.append(process(*param))
        else:
            connections.close_all()
            cache._cache.disconnect_all()
            pool = multiprocessing.Pool(len(params))
            results_all = pool.starmap(process, params)
            pool.close()

        union = {}
        for results in results_all:
            for user_id, result in results.items():
                fields = union.get(user_id, {})
                fields.update(result)
                union[user_id] = fields

        for user_id, fields in union.items():
            tasks.finish(fields, user_id, True, is_weekly)

        self.stdout.write(self.style.SUCCESS('OK {}'.format(counters.get())))


def process(store, is_weekly, user_id=None, results=None, id__gte=0, retries=10):
    is_print = settings.TESTS_ENVIRONMENT == 'DOCKER'

    if is_print:
        print(
            '{:%Y-%m-%d %H:%M:%S} | {} started, retries: {}, requests was: {}'
            .format(now(), store.title, retries, counters.get(store.field))
        )

    kwargs = {
        store.field_status: 'ready'
    }
    today = now().replace(hour=0, minute=0, second=0, microsecond=0)
    if is_weekly:
        kwargs['last_entered__lt'] = today - timedelta(days=today.weekday(), weeks=1)
    else:
        kwargs['last_entered__gte'] = today - timedelta(days=today.weekday(), weeks=1)
    if id__gte:
        kwargs['id__gte'] = id__gte
    if user_id:
        kwargs = {'id': user_id}

    if not results:
        results = {}
    qs = get_user_model().objects.filter(**kwargs).order_by('id')
    total = qs.count()
    for i, user in enumerate(qs):
        try:
            sleep(2)
            start = now()
            try:
                results[user.id] = process_user(user, store)
            except get_user_model().DoesNotExist:
                continue
            if is_print:
                print(
                    '{:%Y-%m-%d %H:%M:%S} | {}: {} from {}, {} seconds'
                    .format(now(), store.title, i, total, (now() - start).seconds)
                )
        except Exception as e:
            n = now()
            if n.minute > 35:
                until = n.replace(hour=(n + timedelta(hours=1)).hour, minute=1, second=0, microsecond=0)
            else:
                until = n.replace(minute=n.minute + 15, second=0, microsecond=0)
            capture_exception(e)
            print('{:%Y-%m-%d %H:%M:%S} | ERROR: {}'.format(now(), e))
            if retries:
                print(
                    '{:%Y-%m-%d %H:%M:%S} | {} synchronization is paused until {}, retries: {}, '
                    'requests was: {}'.format(now(), store.title, until, retries, counters.get(store.field))
                )
                connections.close_all()
                sleep((until - n).seconds)
                return process(store, is_weekly, user_id, results, user.id, retries - 1)
            else:
                break

    if is_print:
        print(
            '{:%Y-%m-%d %H:%M:%S} | {} finished, requests was: {}'
            .format(now(), store.title, counters.get(store.field))
        )
    connections.close_all()
    return results


def process_user(user, store):
    args = [getattr(user, store.field), user.id, True, False]
    if store.field_uid:
        args.append(getattr(user, store.field_uid))
    return tasks.NETWORKS_TASKS[store.network_slug](*args)
