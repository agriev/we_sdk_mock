from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.template.defaultfilters import linebreaksbr, urlize
from django.test import override_settings

from apps.users import tasks
from apps.utils.dates import yesterday


class Command(BaseCommand):
    help = 'Rebuild the users fields'

    def add_arguments(self, parser):
        parser.add_argument('-i', '--user_id', action='store', dest='user_id', default=0, type=int)
        parser.add_argument('-r', '--recent', action='store_true', dest='recent', default=False)

    @override_settings(USERS_STATISTICS_LIMIT=False)
    def handle(self, *args, **options):
        qs = get_user_model().objects
        if options['user_id']:
            qs = qs.filter(id=options['user_id'])
        if options['recent']:
            qs = qs.filter(last_entered__gte=yesterday())
        for user in qs.only('id', 'bio').order_by('id'):
            with transaction.atomic():
                user.bio_html = urlize(linebreaksbr(user.bio))
                user.save(update_fields=['bio_html'])
                tasks.update_user_followers(user.id)
                tasks.update_user_statistics(user.id, None)
                tasks.because_you_completed(user.id)
                tasks.save_user_platforms(user.id)
        self.stdout.write(self.style.SUCCESS('OK'))
