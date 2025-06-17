from allauth.account.models import EmailAddress
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils.timezone import now
from django_bulk_update.helper import bulk_update
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    def handle(self, *args, **options):
        if settings.ENVIRONMENT == 'PRODUCTION':
            return

        # emails and tokens
        qs = get_user_model().objects.exclude(email__endswith='@steam.com')
        count = qs.count()
        data = []
        for user in qs.only('id', 'is_staff', 'is_superuser', 'email').iterator():
            if user.is_staff and 'community editors' not in set(g.name.lower().strip() for g in user.groups.all()):
                user.is_superuser = True
            elif not user.is_superuser:
                user.email = '{}@steam.com'.format(user.id)
            user.last_entered = now()
            data.append(user)
            if len(data) == 2000:
                bulk_update(data, update_fields=['email', 'is_superuser', 'last_entered'])
                data = []
        if data:
            bulk_update(data, update_fields=['email', 'is_superuser', 'last_entered'])

        data = []
        for email in EmailAddress.objects.only('id', 'email').iterator():
            email.email = 'email{0}@steam.com'.format(email.id)
            data.append(email)
            if len(data) == 2000:
                bulk_update(data, update_fields=['email'])
                data = []
        if data:
            bulk_update(data, update_fields=['email'])

        Token.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('Users: {}'.format(count)))
