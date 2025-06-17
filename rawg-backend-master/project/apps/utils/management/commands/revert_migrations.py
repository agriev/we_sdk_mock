import sys

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **options):
        result = {}
        for line in sys.stdin:
            row = line.strip('\n')
            if row[0] != '[':
                continue
            app, name = row.split().pop().split('.', maxsplit=2)
            result[app] = name
        for app, migration in result.items():
            call_command('migrate', app, migration)
