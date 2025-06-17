from django.conf import settings
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('user_id', type=int)

    def handle(self, *args, **options):
        if settings.ENVIRONMENT == 'PRODUCTION':
            return
        key = Token.objects.get_or_create(user_id=options['user_id'])[0].key
        self.stdout.write(self.style.SUCCESS('Token {}'.format(key)))
