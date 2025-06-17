import multiprocessing
import signal
from datetime import timedelta
from time import sleep

from django.conf import settings
from django.core.cache import cache
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import DatabaseError, connections
from django.utils.timezone import now

from apps.merger import tasks
from apps.merger.models import Import
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    is_sync = False
    is_exit = False
    pause = 10
    pause_import = 1
    pause_check = 360
    iterations = 0
    process_num = 0
    processes = 0

    def add_arguments(self, parser):
        parser.add_argument('-s', '--sync', action='store_true', dest='sync', default=False)
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)

    def handle(self, *args, **options):
        signal.signal(signal.SIGINT, self.exit_handler)
        signal.signal(signal.SIGTERM, self.exit_handler)
        signal.signal(signal.SIGALRM, self.timeout_handler)

        self.is_sync = options['sync']
        self.process_num = options['num']
        self.processes = options['len']

        self.stdout.write(self.style.SUCCESS('Process {} | Hello!'.format(self.process_num)))

        while not self.is_exit:
            try:
                self.process()
                self.iterations += 1
                if settings.ENVIRONMENT == 'TESTS':
                    break
                connections.close_all()
                sleep(self.pause)
                if settings.DEBUG:
                    self.stdout.write(self.style.SUCCESS('Process {} | Tick!'.format(self.process_num)))
            except KeyboardInterrupt:
                break

        self.exit()

    def exit_handler(self, *args, **kwargs):
        self.is_exit = True

    def timeout_handler(self, *args, **kwargs):
        raise TimeoutException

    def exit(self):
        self.stdout.write(self.style.SUCCESS('Process {} | Bye!'.format(self.process_num)))

    def process(self):
        instance = Import.import_qs(self.processes, self.process_num, self.is_sync).first()
        if instance:
            instance.is_started = True
            instance.save(update_fields=['is_started'])
            message = '{{:%Y-%m-%d %H:%M:%S}} | Process {} | ' \
                      'Import #{} for user {} is {{}}'.format(self.process_num, instance.id, instance.user)
            delay = False

            self.stdout.write(self.style.SUCCESS(message.format(now(), 'started')))

            results = self.run_processes(instance)
            restart = []
            for result in results:
                if result.get('restart'):
                    restart.append(result['store'])
                if result.get('unavailable'):
                    delay = True
                    del result['unavailable']

            if restart:
                self.exit_handler()
                self.stdout.write(self.style.ERROR(message.format(now(), 'timeout: {}'.format(', '.join(restart)))))
                instance.retries += 1
                instance.date = now() + timedelta(minutes=2) * instance.retries
                try:
                    instance.save(update_fields=['date', 'retries'])
                except DatabaseError:
                    pass
                return

            if results:
                tasks.finish(results, instance.user.id, instance.is_sync, instance.is_old, instance.is_manual)

            if delay:
                instance.retries += 1
                instance.date = now() + timedelta(minutes=10) * instance.retries
                try:
                    instance.save(update_fields=['date', 'retries'])
                except DatabaseError:
                    pass
                self.stdout.write(self.style.WARNING(message.format(now(), 'delayed')))
            else:
                # it was needed for the token programm
                # if instance.is_fast and not Import.objects.filter(is_fast=True).exclude(id=instance.id).count():
                #     call_command('achievements_percents')
                instance.delete()
                if not self.is_sync:
                    tasks.import_queue(self.processes, self.process_num)
                self.stdout.write(self.style.SUCCESS(message.format(now(), 'finished')))

            if results:
                sleep(self.pause_import)
        if settings.ENVIRONMENT == 'TESTS':
            return
        if not self.process_num and not self.is_sync and not self.iterations % self.pause_check:
            call_command('check_import')

    def run_processes(self, instance):
        params = []

        for store in tasks.STORES:
            # sync conditions
            if instance.is_sync:
                if not store.sync or getattr(instance.user, store.field_status) != 'ready':
                    continue
            # import conditions
            elif getattr(instance.user, store.field_status) not in ('process', 'unavailable'):
                continue
            args = [getattr(instance.user, store.field), instance.user.id, instance.is_sync, instance.is_fast]
            if instance.is_sync:
                if store.field_uid:
                    args.append(getattr(instance.user, store.field_uid))
                args.append(not instance.is_fast)
            params.append((tasks.NETWORKS_TASKS[store.network_slug], args, store, instance.is_sync))

        if not params:
            return []

        if settings.ENVIRONMENT == 'TESTS':
            results = []
            for param in params:
                results.append(process(*param))
        else:
            connections.close_all()
            cache._cache.disconnect_all()
            pool = multiprocessing.Pool(len(params))
            results = pool.starmap(process, params)
            pool.close()

        return results


class TimeoutException(Exception):
    pass


def process(func, args, store, is_sync):
    if not is_sync:
        signal.alarm(900)
    try:
        result = func(*args)
    except TimeoutException as e:
        capture_exception(e, raise_on_debug=True, raise_on_tests=False)
        return {'restart': True, 'store': store.title}
    except Exception as e:
        capture_exception(e)
        if is_sync:
            return {'unavailable': True}
        result = {
            store.field: args[0],
            store.field_status: 'unavailable',
            store.field_date: now(),
            'unavailable': True,
        }
    if not is_sync:
        signal.alarm(0)
    connections.close_all()
    return result
