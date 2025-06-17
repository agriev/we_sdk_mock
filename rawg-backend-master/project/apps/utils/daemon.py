import signal
from time import sleep

from django.conf import settings
from django.db import connections


class DaemonMixin:
    is_exit = False
    pause = 3 if settings.DEBUG else 60
    iterations = 0

    def handle(self, *args, **options):
        signal.signal(signal.SIGINT, self.exit_handler)
        signal.signal(signal.SIGTERM, self.exit_handler)

        self.process_num = options.get('num', 0)

        self.stdout.write(self.style.SUCCESS('Process {} | Hello!'.format(self.process_num)))

        while not self.is_exit:
            try:
                result = super().handle(*args, **options)
                self.iterations += 1
                if settings.ENVIRONMENT == 'TESTS' and self.iterations == 2:
                    break
                if not result and settings.ENVIRONMENT != 'TESTS':
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
        self.stdout.write(self.style.SUCCESS('Bye!'))
