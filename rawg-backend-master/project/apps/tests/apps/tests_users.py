import os
import random
import uuid

from allauth.account.models import EmailAddress, EmailConfirmationHMAC
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.core.exceptions import ValidationError
from django.test import TestCase, tag

from apps.common.cache import CommonContentType
from apps.games.models import Collection, Game, GamePlatform, Platform
from apps.users.adapter import CustomAccountAdapter
from apps.users.models import AuthenticatedPlayer, UserFollowElement, UserGame
from apps.utils.lang import fake_request_by_language


class AdapterTestCase(TestCase):
    email = os.environ.get('TEST_EMAIL', 'test@test.org')
    email_new = os.environ.get('TEST_EMAIL_SECOND', 'test+new@test.org')
    language = os.environ.get('LANGUAGE', settings.LANGUAGE_EN)

    def setUp(self):
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
        fake_request = fake_request_by_language(self.language)
        self.adapter = CustomAccountAdapter(fake_request)
        self.user, _ = get_user_model().objects.get_or_create(
            username='test', email=self.email, source_language=self.language
        )
        super().setUp()

    @tag('mail')
    def test_confirm_email(self):
        email = EmailAddress()
        email.user = self.user
        email.email = self.email
        email.verified = True
        email.primary = True
        email.save()
        email = EmailAddress()
        email.user = self.user
        email.email = self.email_new
        email.save()
        fake_request = fake_request_by_language(self.language)
        self.assertIsNone(self.adapter.confirm_email(fake_request, email))

    @tag('mail')
    def test_change_password_email(self):
        self.assertIsNone(self.adapter.change_password_email(self.user))

    @tag('mail')
    def test_reset_password_email(self):
        self.assertIsNone(self.adapter.reset_password_email(self.email, {
            'uid': 'uid',
            'token': 'token',
        }))

    @tag('mail')
    def test_send_confirmation_mail(self):
        email = EmailAddress()
        email.user = self.user
        email.email = self.email
        email.save()
        confirm = EmailConfirmationHMAC(email)
        fake_request = fake_request_by_language(self.language)
        self.assertIsNone(self.adapter.send_confirmation_mail(fake_request, confirm, True))
        self.assertIsNone(self.adapter.send_confirmation_mail(fake_request, confirm, False))


class ModelsTestCase(TestCase):
    email = os.environ.get('TEST_EMAIL', 'test@test.org')
    fixtures = ['games_platforms_parents', 'games_platforms', 'games_stores']

    def test_check_user_game_create_user_game(self):
        game, _ = Game.objects.get_or_create(name='Grand Theft Auto V')
        platform = Platform.objects.get(slug='macos')
        GamePlatform.objects.get_or_create(game=game, platform=platform)
        user, _ = get_user_model().objects.get_or_create(username='test', email=self.email)
        UserGame.create_user_game(game, user, ['pc', 'macos', 'linux'])
        user_games = UserGame.objects.filter(user=user, game=game)
        self.assertEquals(user_games.count(), 1)
        self.assertEquals(list(user_games.first().platforms.values_list('slug', flat=True)), ['macos'])

    def test_check_user_save_slug(self):
        user = get_user_model().objects.create(username='test', email='test1@test.org')
        self.assertEqual(user.slug, 'test')

        user = get_user_model().objects.create(username='123', email='test2@test.org')
        self.assertNotEqual(user.slug, '123')
        self.assertEqual(user.slug, 'user-123')

        get_user_model().objects.create(username='user-1234', email='test3@test.org')
        user = get_user_model().objects.create(username='1234', email='test4@test.org')
        self.assertNotEqual(user.slug, '1234')
        self.assertEqual(user.slug, 'user-1234-2')

    def test_get_sitemap_paths(self):
        user = get_user_model().objects.create(username='kan', email='kan@test.org')
        user.followers_count = 1
        user.reviews_count = 1
        user.save()

        lang = settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3

        self.assertEqual(len(user.get_sitemap_paths(get_user_model().get_sitemap_additional_data(), lang)), 2)

        UserFollowElement.objects.create(
            user=user,
            object_id=Collection.objects.create(name='Phantasmagoria, Vol. 1').id,
            content_type=CommonContentType().get(Collection)
        )
        UserGame.objects.create(
            user=user,
            game=Game.objects.create(name='Hold Me Close'),
            status=UserGame.STATUS_TOPLAY
        )

        self.assertEqual(len(user.get_sitemap_paths(get_user_model().get_sitemap_additional_data(), lang)), 4)


class PlayerTestCase(TestCase):
    def test_player_get_by_id(self):
        user = get_user_model().objects.create(username='test', email='test1@test.org')
        player = AuthenticatedPlayer.get_by_uid(user.player_id)
        same_player = AuthenticatedPlayer(user)
        self.assertIsInstance(player, AuthenticatedPlayer)
        self.assertEqual(player.user, user)
        self.assertEqual(player, same_player)

    def test_player_get_by_id_not_exist(self):
        self.assertRaises(
            AuthenticatedPlayer.DoesNotExist,
            lambda: AuthenticatedPlayer.get_by_uid(AuthenticatedPlayer.generate_id())
        )
        self.assertRaises(
            AuthenticatedPlayer.InvalidIdError,
            lambda: AuthenticatedPlayer.get_by_uid('not a valid UUID')
        )

    def test_validate_id_valid(self):
        _uuid = AuthenticatedPlayer.generate_id()
        for _repr in (_uuid, str(_uuid), _uuid.hex, _uuid.int):
            self.assertIsInstance(AuthenticatedPlayer.validate_id(_repr), uuid.UUID)

    def test_validate_id_invalid(self):
        randint = random.randint(1, 10**32)
        for _repr in (uuid.uuid3(uuid.uuid4(), name='name'), randint, hex(randint), bytes(str(randint), 'utf8'), None, '', 0):
            self.assertRaises(AuthenticatedPlayer.InvalidIdError, lambda: AuthenticatedPlayer.validate_id(_repr))
