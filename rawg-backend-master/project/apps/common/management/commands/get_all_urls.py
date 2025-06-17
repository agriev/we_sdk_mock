import os

from django.conf import settings
from django.contrib.sites.requests import RequestSite
from django.core.management.base import BaseCommand
from django.core.paginator import EmptyPage
from django.test import RequestFactory
from django.utils import translation

from apps.common.sitemap import sitemaps

LANGUAGE = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)


class Command(BaseCommand):
    def handle(self, *args, **options):
        with open('/tmp/update_cache.txt', 'w') as f, translation.override(LANGUAGE):
            rs = RequestSite(RequestFactory().get('/', SERVER_NAME=settings.STATICSITEMAPS_MOCK_SITE_NAME))
            for name, cls in sitemaps.items():
                i = 1
                while True:
                    try:
                        for item in cls.get_urls(i, rs, settings.STATICSITEMAPS_MOCK_SITE_PROTOCOL):
                            f.write(f'{item["location"]}\n')
                        self.stdout.write(self.style.SUCCESS(f'{name} - {i}'))
                    except EmptyPage:
                        break
                    i += 1
                self.stdout.write(self.style.SUCCESS(f'{name} - ok'))
        self.stdout.write(self.style.SUCCESS('OK'))
