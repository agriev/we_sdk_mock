import os
import stat

from django.conf import settings
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **options):
        count = len(settings.RUN_IMPORTS)
        for i, values in enumerate(settings.RUN_IMPORTS):
            env = ['{}="{}"'.format(key, value) for key, value in values.items()]
            env = ' '.join(env)
            service = '#!/bin/sh\n\n{} python /app/project/manage.py import -n={} -l={}\n'.format(env, i, count)
            folder = '/etc/service/import{}'.format(i)
            try:
                os.mkdir(folder)
            except FileExistsError:
                pass
            file = '{}/run'.format(folder)
            with open(file, 'w') as f:
                f.write(service)
            st = os.stat(file)
            os.chmod(file, st.st_mode | stat.S_IEXEC)
        self.stdout.write(self.style.SUCCESS('Services are written down!'))
