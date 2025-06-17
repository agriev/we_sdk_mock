import os
from datetime import timedelta

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import translation
from django.utils.timezone import now

from apps.credits.models import Person
from apps.games.models import Collection, Developer, Game, Genre, Platform, Publisher, Tag
from apps.reviews.models import Review
from apps.utils.lang import get_site_by_language

LANGUAGE = os.environ.get('LANGUAGE', settings.MODELTRANSLATION_DEFAULT_LANGUAGE)


class Command(BaseCommand):
    urls = [
        '/',
        '/welcome',
        '/welcome-back',
        '/tldr',
        '/terms',
        '/privacy_policy',
        '/apidocs',
        '/leaderboard',
        '/signup',
        '/login',
        '/games',
        '/games/browse',
        '/platforms',
        '/genres',
        '/tags',
        '/creators',
        '/developers',
        '/publishers',
        '/video-game-releases',
        '/games/charts',
        '/collections/popular',
        '/collections',
        '/reviews/popular',
        '/reviews',
        '/rate/thebest',
    ]
    qs = [
        Platform.objects.all().only('slug'),
        Genre.objects.visible().only('slug'),
        Tag.objects.visible().only('slug').order_by('-games_added')[0:100],
        Person.objects.visible().only('slug').order_by('-games_added')[0:100],
        Developer.objects.visible().only('slug').order_by('-games_added')[0:100],
        Publisher.objects.visible().only('slug').order_by('-games_added')[0:100],
        Game.objects.only('slug').order_by('-added')[0:1000],
        Game.objects.only('slug').filter(updated__gt=now() - timedelta(hours=3)),
        Review.objects.only('id').filter(is_text=True, created__gt=now() - timedelta(hours=3)),
        Collection.objects.indexed().only('slug').filter(created__gt=now() - timedelta(hours=3)),
    ]

    def handle(self, *args, **options):
        with open('/tmp/update_cache.txt', 'w') as f, translation.override(LANGUAGE):
            site = get_site_by_language(LANGUAGE)
            for item in self.urls:
                f.write(f'{settings.SITE_PROTOCOL}://{site.name}{item}\n')
            for qs in self.qs:
                for item in qs:
                    f.write(item.get_absolute_url() + '\n')
        self.stdout.write(self.style.SUCCESS('OK'))
