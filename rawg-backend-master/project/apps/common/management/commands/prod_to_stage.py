from django.conf import settings
from django.contrib.sites.models import Site
from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    def handle(self, *args, **options):
        if settings.ENVIRONMENT == 'PRODUCTION':
            return

        call_command('remove_sensitive_data')

        # site
        site = Site.objects.get(id=settings.SITE_LANGUAGES[settings.LANGUAGE_RU])
        site.domain = 'devapi.ag.ru'
        site.name = 'dev.ag.ru'
        site.save()
        site = Site.objects.get(id=settings.SITE_LANGUAGES[settings.LANGUAGE_EN])
        site.domain = 'featureapi.ag.ru'
        site.name = 'feature.ag.ru'
        site.save()
