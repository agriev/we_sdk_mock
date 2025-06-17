import os
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import translation
from django.utils.timezone import now

from apps.games.models import Collection, Game
from apps.reviews.models import Review

LANGUAGE = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)


class Command(BaseCommand):
    qs = [
        Game.objects.only('slug').filter(updated__gt=now() - timedelta(minutes=5)),
        Review.objects.only('id').filter(is_text=True, created__gt=now() - timedelta(minutes=5)),
        Collection.objects.only('slug').filter(created__gt=now() - timedelta(minutes=5)),
    ]

    def handle(self, *args, **options):
        with open('/tmp/update_cache.txt', 'w') as f, translation.override(LANGUAGE):
            for qs in self.qs:
                for item in qs:
                    f.write(item.get_absolute_url() + '\n')
        self.stdout.write(self.style.SUCCESS('OK'))
