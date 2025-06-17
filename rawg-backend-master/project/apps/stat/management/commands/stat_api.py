import subprocess
from datetime import datetime
from os import walk
from time import strptime

from django.core.management.base import BaseCommand
from django.utils.timezone import now

from apps.stat.models import APIByIPAndUserAgentVisit, APIByIPVisit, APIByUserAgentVisit, APIByUserVisit


class Command(BaseCommand):
    FOLDER = '/tmp/access-logs/'
    BY_IP = "awk -F\\\" '{split($1, a, \" \"); print a[2]}'"
    BY_USER_AGENT = "awk -F\\\" '{print $6}'"
    BY_BOTH = "awk -F\\\" '{split($1, a, \" \"); print $6 \"|\" a[2]}'"
    BY_USER = "awk -F\\\" '{split($7, a, \" \"); print a[4]}'"
    SORT_COMMAND = '| sort | uniq -c | sort -rn'
    DATE_FORMAT = '%Y%m%d'

    def add_arguments(self, parser):
        parser.add_argument('-t', '--type', action='store', dest='target', default='today', type=str)

    def handle(self, *args, **options):
        files = []
        if options['target'] == 'all':
            for (_, _, filenames) in walk(self.FOLDER):
                files.extend(filter(lambda row: row.endswith('.gz'), filenames))
                break
        else:
            files = [f'access.log-{now().strftime(self.DATE_FORMAT)}']

        for log in files:
            file_date = datetime(*strptime(log.split('-').pop().split('.').pop(0), self.DATE_FORMAT)[:6])
            command = 'gunzip -c' if log.endswith('.gz') else 'cat'
            subprocess.run(
                f'{command} {self.FOLDER}{log} | grep api.ag.ru | grep "/api/" '
                f'> {self.FOLDER}temp_full.log',
                shell=True,
                check=True,
            )
            subprocess.run(
                f'cat {self.FOLDER}temp_full.log | grep -v "Mozilla/" '
                f'> {self.FOLDER}temp.log',
                shell=True,
                check=True,
            )
            for model, fields, config, file_name in (
                (
                    APIByIPVisit,
                    ({'field': 'ip', 'length': 45},),
                    self.BY_IP,
                    'temp.log',
                ),
                (
                    APIByUserAgentVisit,
                    ({'field': 'user_agent', 'length': 200},),
                    self.BY_USER_AGENT,
                    'temp.log',
                ),
                (
                    APIByIPAndUserAgentVisit,
                    ({'field': 'user_agent', 'length': 200}, {'field': 'ip', 'length': 45}),
                    self.BY_BOTH,
                    'temp.log',
                ),
                (
                    APIByUserVisit,
                    ({'field': 'user_id', 'length': 10},),
                    self.BY_USER,
                    'temp_full.log',
                ),
            ):
                save_data = []
                output = subprocess.run(
                    '{} {} {}'.format(config, f'{self.FOLDER}{file_name}', self.SORT_COMMAND),
                    shell=True,
                    check=True,
                    capture_output=True,
                ).stdout.decode('utf-8')
                for line in output.split('\n'):
                    line = line.strip()
                    if not line:
                        continue
                    count, *values = line.replace(' ', '|', 1).split('|')
                    try:
                        instance = model(count=count, date=file_date)
                        for i, field in enumerate(fields):
                            setattr(instance, field['field'], values[i][:field['length']])
                        save_data.append(instance)
                    except IndexError:
                        pass
                model.objects.filter(date=file_date).delete()
                model.objects.bulk_create(save_data)

        subprocess.check_call(['rm', '-rf', f'{self.FOLDER}temp.log'])
        subprocess.check_call(['rm', '-rf', f'{self.FOLDER}temp_full.log'])
