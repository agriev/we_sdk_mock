import os
from hashlib import sha1

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.test import TestCase, tag
from django.utils import translation
from django.utils.timezone import now

from apps.games.models import Game
from apps.mailer.management.commands.send_recommendations_email import send_recommendations_email
from apps.mailer.management.commands.send_review_invite_email import send_review_invite_email
from apps.mailer.models import Mail
from apps.users.models import User


class MailerTestCase(TestCase):
    email = os.environ.get('TEST_EMAIL', 'current@test.io')
    language = os.environ.get('LANGUAGE', settings.LANGUAGE_EN)
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self):
        self.user, _ = get_user_model().objects.get_or_create(
            username='current', email=self.email, source_language=self.language
        )
        self.user.set_password('testpassword')
        self.user.subscribe_mail_reviews_invite = True
        self.user.subscribe_mail_recommendations = True
        self.user.save()
        languages = {
            settings.LANGUAGE_EN: ('api.ag.ru', 'ag.ru'),
            settings.LANGUAGE_RU: ('api.ag.ru', 'ag.ru')
        }
        for language, _ in settings.LANGUAGES:
            site, created = Site.objects.get_or_create(
                id=settings.SITE_LANGUAGES[language],
                defaults={'name': languages[language][1], 'domain': languages[language][0]}
            )
            if not created:
                site.domain, site.name = languages[language]
                site.save()
        self.site = Site.objects.get(id=settings.SITE_LANGUAGES[self.language])
        super().setUp()

    @tag('mail')
    def test_review_invite_email(self):
        with translation.override(self.user.source_language):
            send_review_invite_email(
                user=self.user,
                games=(Game.objects.first().id,),
                update_context={
                    'user': {
                        'avatar':
                            'https://media.ag.ru/media/resize/200/-/avatars/7fa/7fabb2f6f9693d336ead69a8252d68ab.jpg'
                    },
                    'game_main': {
                        'image':
                            'https://media.ag.ru/media/resize/600/-/'
                            'screenshots/764/7643d4a66e5c37cd578a208a515902f9.jpg'
                    }
                }
            )
        qs = Mail.objects.filter(user_id=self.user.id)
        self.assertTrue(qs.first().source)
        self.assertEqual(qs.count(), 1)

    @tag('mail')
    def test_recommendations_email(self):
        games = [Game.objects.first().id]
        update_context = {
            'user': {
                'avatar':
                    'https://media.ag.ru/media/resize/200/-/avatars/7fa/7fabb2f6f9693d336ead69a8252d68ab.jpg'
            },
            'games': [
                {
                    'name': 'Shadow of the Tomb Rider',
                    'slug': 'grand-theft-auto-2',
                    'released': now(),
                    'image':
                        'https://media.ag.ru/media/crop/600/400/'
                        'screenshots/764/7643d4a66e5c37cd578a208a515902f9.jpg',
                    'platforms': [
                        {
                            'name': '',
                            'slug': 'atari',
                        },
                        {
                            'name': '',
                            'slug': 'commodore-amiga',
                        },
                        {
                            'name': '',
                            'slug': 'ios',
                        },
                        {
                            'name': '',
                            'slug': 'linux',
                        },
                        {
                            'name': '',
                            'slug': 'mac',
                        },
                        {
                            'name': '',
                            'slug': 'nintendo',
                        },
                    ],
                    'genres': ['Action', 'Singleplayer', 'Multiplayer', 'RPG', 'Funny'],
                },
                {
                    'name': 'Cat Quest',
                    'slug': 'cat-quest',
                    'tba': True,
                    'image':
                        'https://media.ag.ru/media/crop/600/400/'
                        'screenshots/2f2/2f2487cbf82d3bab13b3bf3755f1a346.jpg',
                    'platforms': [
                        {
                            'name': '',
                            'slug': 'sega',
                        },
                        {
                            'name': '',
                            'slug': 'web',
                        },
                        {
                            'name': '',
                            'slug': 'xbox',
                        },
                    ],
                    'genres': ['Action', 'RPG', 'Cats'],
                },
                {
                    'name': 'Grand Theft Auto V',
                    'slug': 'grand-theft-auto-v',
                    'released': now(),
                    'image':
                        'https://api.ag.ru/media/crop/600/400/screenshots/620/62005458e2fbaac1e324050372eb91db.jpg',
                    'platforms': [
                        {
                            'name': '',
                            'slug': 'pc',
                        },
                        {
                            'name': '',
                            'slug': 'playstation',
                        },
                        {
                            'name': '',
                            'slug': '3do',
                        },
                        {
                            'name': '',
                            'slug': 'android',
                        },
                    ],
                    'genres': ['Action', 'Singleplayer', 'Multiplayer', 'Cars'],
                },
            ]
        }
        with translation.override(self.user.source_language):
            send_recommendations_email(self.user, games, games, update_context=update_context)
        qs = Mail.objects.filter(user_id=self.user.id)
        self.assertTrue(qs.first().source)
        self.assertEqual(qs.count(), 1)

    def test_wrong_hash_unsubscribe(self):
        wrong_hash_url = '/api/unsubscribe/1?slug=reviews-invite&hash=some_hash&email=test@test.io'
        response = self.client.get(wrong_hash_url)
        self.assertEqual(response.status_code, 401)

    def test_unsubscribe(self):
        slug = 'review-invite'
        user_hash = sha1('{}.{}'.format(self.user.email, settings.SECRET_KEY).encode('utf-8')).hexdigest()

        response = self.client.get(
            f'/api/unsubscribe/{self.user.id}?slug={slug}&hash={user_hash}&email={self.user.email}'
        )
        self.assertEqual(response.status_code, 200)

        unsubscribe = self.client.patch(
            f'/api/unsubscribe/{self.user.id}/{user_hash}',
            data={'subscribe_mail_reviews_invite': False},
            content_type='application/json',
        )

        self.assertNotEqual(unsubscribe.status_code, 404)
        self.assertNotEqual(unsubscribe.status_code, 403)
        self.assertNotEqual(unsubscribe.status_code, 401)

        self.assertFalse(User.objects.get(id=self.user.id).subscribe_mail_reviews_invite)
