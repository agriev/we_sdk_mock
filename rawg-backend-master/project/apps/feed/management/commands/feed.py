import signal
from time import sleep

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connections
from django.utils.timezone import now

from apps.feed.feed import process_queue
from apps.feed.models import FeedQueue
from apps.utils.exceptions import capture_exception


class Command(BaseCommand):
    is_sync = False
    is_exit = False
    pause = 10
    iterations = 0
    process_num = 0
    processes = 0
    old = False

    def add_arguments(self, parser):
        parser.add_argument('-n', '--num', action='store', dest='num', default=0, type=int)
        parser.add_argument('-l', '--len', action='store', dest='len', default=1, type=int)
        parser.add_argument('--old', action='store_true', dest='old', default=False)

    def handle(self, *args, **options):
        signal.signal(signal.SIGINT, self.exit_handler)
        signal.signal(signal.SIGTERM, self.exit_handler)

        self.process_num = options['num']
        self.processes = options['len']
        self.old = options['old']

        self.stdout.write(self.style.SUCCESS('Process {} | Hello!'.format(self.process_num)))

        while not self.is_exit:
            try:
                result = self.process()
                self.iterations += 1
                if settings.ENVIRONMENT == 'TESTS' and self.iterations == 2:
                    break
                if not result and settings.ENVIRONMENT != 'TESTS':
                    if self.old:
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

    def exit(self):
        self.stdout.write(self.style.SUCCESS('Process {} | Bye!'.format(self.process_num)))

    def process(self):
        instance = FeedQueue.feed_qs(self.processes, self.process_num, self.old).first()
        if instance:
            message = '{{:%Y-%m-%d %H:%M:%S}} | Process {} | Feed #{} model `{}` action {} is {{}}' \
                .format(self.process_num, instance.id, instance.content_type, instance.get_action_display())

            started = now()
            instance.status = FeedQueue.STARTED
            instance.save(update_fields=['status'])
            self.stdout.write(self.style.SUCCESS(message.format(started, 'Started')))

            try:
                delete = not process_queue(instance, self.process_num)
            except Exception as e:
                capture_exception(e)
                instance.status = FeedQueue.ERROR
                instance.save(update_fields=['status'])
                self.stdout.write(self.style.ERROR(str(e)))
                self.stdout.write(self.style.ERROR(message.format(now(), 'error')))
                return

            duration = (now() - started).seconds
            if not delete:
                instance.duration = duration
                instance.save(update_fields=['duration'])
            text = '{} - {} sec'.format(instance.get_status_display(), duration)
            style = self.style.WARNING if instance.status == FeedQueue.DELAY else self.style.SUCCESS
            self.stdout.write(style(message.format(now(), text)))
            return True
        return False
