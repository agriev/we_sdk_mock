import datetime
import os
import sys
from datetime import timedelta
from unittest.mock import patch

import dateutil
from dateutil.tz import tzlocal
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.core import mail
from django.core.management import call_command
from django.test import TransactionTestCase, tag
from django.utils.timezone import now

from apps.feed.models import Feed
from apps.games.models import Game, GameStore, Store
from apps.merger import tasks
from apps.users.models import UserGame
from apps.utils.lang import fake_request_by_language
from apps.utils.tasks import send_email


class TasksTestCase(TransactionTestCase):
    fixtures = ['games_platforms_parents', 'games_platforms', 'games_stores']
    language = os.environ.get('LANGUAGE', settings.LANGUAGE_EN)
    email = os.environ.get('TEST_EMAIL', 'current@test.io')
    steam = [{'appid': 6510,
              'img_icon_url': 'ee47315384ece9d549732b5aeaf861507d4226fd',
              'img_logo_url': '70bfcbcbd699999936869547454f5c8845a30635',
              'name': 'Lost Planet: Extreme Condition',
              'playtime_forever': 0},
             {'appid': 4760,
              'img_icon_url': '5dc68565149dc971af6428157bcb600d80690080',
              'img_logo_url': '134817933edf4f8d0665d456889c0315c416fff2',
              'name': 'Rome: Total War',
              'playtime_forever': 0},
             {'appid': 220,
              'has_community_visible_stats': True,
              'img_icon_url': 'fcfb366051782b8ebf2aa297f3b746395858cb62',
              'img_logo_url': 'e4ad9cf1b7dc8475c1118625daf9abd4bdcbcad0',
              'name': 'Half-Life 2',
              'playtime_forever': 26}]
    xbox = [{'currentGamerscore': 190,
             'earnedAchievements': 19,
             'lastUnlock': '2015-11-01T15:56:22.7415718Z',
             'maxGamerscore': 1250,
             'name': 'Halo 5: Guardians',
             'platform': 'Durango',
             'serviceConfigId': '1370999b-fca2-4c53-8ec5-73493bcb67e5',
             'titleId': 219630713,
             'titleType': 'DGame',
             'last_played': dateutil.parser.parse('2015-11-01T15:56:22.7415718Z')},
            {'currentGamerscore': 100,
             'earnedAchievements': 9,
             'lastUnlock': '2015-09-13T14:56:08.9518748Z',
             'maxGamerscore': 1000,
             'name': 'Ori and the Blind Forest',
             'platform': 'Durango',
             'serviceConfigId': '96430100-71ae-4488-8791-79d50fc045ea',
             'titleId': 264259050,
             'titleType': 'DGame',
             'last_played': dateutil.parser.parse('2015-09-13T14:56:08.9518748Z')},
            {'currentGamerscore': 45,
             'earnedAchievements': 7,
             'lastUnlock': '2015-09-12T13:35:46.6512222Z',
             'maxGamerscore': 6000,
             'name': 'Halo: Коллекция Мастер Чифа',
             'platform': 'Durango',
             'serviceConfigId': '77290100-225e-4768-9373-98164430a9f8',
             'titleId': 1144039928,
             'titleType': 'DGame',
             'last_played': dateutil.parser.parse('2015-09-12T13:35:46.6512222Z')},
            {'currentAchievements': 2,
             'currentGamerscore': 30,
             'lastPlayed': '2016-07-10T09:07:58.8070000Z',
             'name': 'RESIDENT EVIL 6',
             'platforms': [1],
             'sequence': 43,
             'titleId': 1128466457,
             'titleType': 1,
             'totalAchievements': 70,
             'totalGamerscore': 1500,
             'last_played': dateutil.parser.parse('2016-07-10T09:07:58.8070000Z')}]
    psn = [{'id': 'NPWR11056_00',
            'last_played': dateutil.parser.parse('2017-09-09T17:45:59Z'),
            'name': 'Destiny 2'},
           {'id': 'NPWR12583_00',
            'last_played': dateutil.parser.parse('2017-09-08T14:57:30Z'),
            'name': 'F1™ 2017'},
           {'id': 'NPWR13363_00',
            'last_played': dateutil.parser.parse('2017-08-24T11:53:27Z'),
            'name': 'Pyre'},
           {'id': 'NPWR06418_00',
            'last_played': dateutil.parser.parse('2017-08-22T07:06:33Z'),
            'name': 'The Last of Us™ Remastered'},
           {'id': 'NPWR10466_00',
            'last_played': dateutil.parser.parse('2017-08-22T07:06:29Z'),
            'name': 'Firewatch'}]
    # raptr = [{'name': 'DOTA 2',
    #           'title': 'DOTA 2 (PC)',
    #           'total_playtime_seconds': '2879138',
    #           'total_playtime_hours': 799.76,
    #           'last_played_timestamp': '1419197998',
    #           'last_played_date': 'Sun, 21 Dec 2014 21:39:58 +0000'},
    #          {'name': 'The Elder Scrolls V: Skyrim',
    #           'title': 'The Elder Scrolls V: Skyrim (PC)',
    #           'total_playtime_seconds': '153748',
    #           'total_playtime_hours': 42.71,
    #           'last_played_timestamp': '1406674845',
    #           'last_played_date': 'Tue, 29 Jul 2014 23:00:45 +0000'},
    #          {'name': 'Mass Effect',
    #           'title': 'Mass Effect (PSN)',
    #           'total_playtime_seconds': '116212',
    #           'total_playtime_hours': 32.28,
    #           'last_played_timestamp': '1357298749',
    #           'last_played_date': 'Fri, 04 Jan 2013 11:25:49 +0000'},
    #          {'name': 'Mass Effect 2',
    #           'title': 'Mass Effect 2 (WEB)',
    #           'total_playtime_seconds': '-116212',
    #           'total_playtime_hours': -32.28,
    #           'last_played_timestamp': '1357298749',
    #           'last_played_date': 'Fri, 04 Jan 2013 11:25:49 +0000'}]
    gog = [
        {'id': '1971477531',
         'name': 'GWENT: The Witcher Card Game',
         'url': '/game/gwent_the_witcher_card_game',
         'achievementSupport': True,
         'image': 'https://images.gog.com/c88332f0d6d98a9c0c6f0e676149a09f128ce78a6f5d69afcde28d6f1f28c15c.png',
         'playtime_forever': 634,
         'last_played': datetime.datetime(2018, 10, 25, 23, 31, 51, tzinfo=tzlocal())},
        {'id': '1686426343',
         'name': 'A Hat in Time',
         'url': '/game/a_hat_in_time',
         'achievementSupport': True,
         'image': 'https://images.gog.com/8d18908bc07e6580a6e478eb09dc1622aeac014ede4c567ab94c76c5f7a6fe63.png',
         'playtime_forever': 1176,
         'last_played': datetime.datetime(2018, 9, 29, 22, 50, 26, tzinfo=tzlocal())},
        {'id': '2098128602',
         'name': 'Furi',
         'url': '/game/furi',
         'achievementSupport': True,
         'image': 'https://images.gog.com/5a4fde164d02c1a7f6529442621d6809d79de5f749593d756ddc29c041d3e362.png',
         'playtime_forever': 774,
         'last_played': datetime.datetime(2018, 8, 31, 18, 59, 30, tzinfo=tzlocal())},
        {'id': '1495134320',
         'name': 'The Witcher 3: Wild Hunt - Game of the Year Edition',
         'url': '/game/the_witcher_3_wild_hunt_game_of_the_year_edition',
         'achievementSupport': True,
         'image': 'https://images.gog.com/7b5017a1e70bde6e4129aeb6770e77bc9798bc2f239cde2432812d0dbdae9fe1.png',
         'playtime_forever': 4439,
         'last_played': datetime.datetime(2018, 8, 31, 17, 34, 4, tzinfo=tzlocal())},
        {'id': '1442827661',
         'name': 'Hard West',
         'url': '/game/hard_west',
         'achievementSupport': True,
         'image': 'https://images.gog.com/bee8b20b5423508e2c3a32b315bfbe9ba556cfb2817bde2675154241cb65df33.png',
         'playtime_forever': 199,
         'last_played': datetime.datetime(2018, 8, 17, 22, 32, 32, tzinfo=tzlocal())},
        {'id': '1823963095',
         'name': 'Tower 57',
         'url': '/game/tower_57',
         'achievementSupport': False,
         'image': 'https://images.gog.com/70be499d30f691530881a893a1827cff02758ad11fdaa03bbd66169cb5471709.png',
         'playtime_forever': 155,
         'last_played': datetime.datetime(2017, 12, 30, 15, 11, 19, tzinfo=tzlocal())},
        {'id': '2114035213',
         'name': 'THE KING OF FIGHTERS 2002',
         'url': '/game/the_king_of_fighters_2002',
         'achievementSupport': False,
         'image': 'https://images.gog.com/bbba2ce5901fe222dc2493997192189215e5c8e3b576dc37ed1c1023764ee995.png',
         'playtime_forever': 0,
         'last_played': None},
    ]

    def setUp(self):
        self.patcher_steam_recently = patch('apps.merger.profiles.steam.get_recently_games')
        self.patcher_steam_achievements = patch('apps.merger.profiles.steam.get_achievements')
        self.patcher_psn_achievements = patch('apps.merger.profiles.psn.get_achievements')
        self.patcher_xbox_achievements = patch('apps.merger.profiles.xbox.get_achievements')

        self.mock_steam_recently = self.patcher_steam_recently.start()
        self.mock_steam_achievements = self.patcher_steam_achievements.start()
        self.mock_psn_achievements = self.patcher_psn_achievements.start()
        self.mock_xbox_achievements = self.patcher_xbox_achievements.start()

        self.mock_steam_recently.return_value = []
        self.mock_steam_achievements.return_value = False, False
        self.mock_psn_achievements.return_value = False
        self.mock_xbox_achievements.return_value = False

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

        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')
        super().setUp()

    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        self.patcher_steam_recently.stop()
        self.patcher_steam_achievements.stop()
        self.patcher_psn_achievements.stop()
        self.patcher_xbox_achievements.stop()
        super().tearDown()

    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.steam.get_games')
    def test_import_games_steam(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = self.steam
        get_id_mock.return_value = 123456
        store = Store.objects.get(slug='steam')
        for game in get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        user = get_user_model().objects.create(username='test', email='test@test.org', steam_id='accujazz')

        tasks.import_games(['steam'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(UserGame.objects.last().game.name, get_games_mock.return_value[-1]['name'])
        self.assertEquals(UserGame.objects.last().playtime, get_games_mock.return_value[-1]['playtime_forever'] * 60)
        self.assertEquals(user.steam_id_status, 'ready')
        self.assertEquals(user.games_count, len(self.steam))
        self.assertEqual(len(mail.outbox), 1)

    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.steam.get_games')
    def test_import_games_steam_empty(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = []
        get_id_mock.return_value = 123456
        user = get_user_model().objects.create(username='test', email='test@test.org', steam_id='accujazz')

        tasks.import_games(['steam'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.steam_id_status, 'error')
        self.assertEquals(user.games_count, 0)
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.steam.get_games')
    def test_import_games_steam_error(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = False
        get_id_mock.return_value = 123456
        user = get_user_model().objects.create(username='test', email='test@test.org', steam_id='accujazz_notfound')

        tasks.import_games(['steam'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.steam_id_status, 'error')
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.xbox.get_games')
    def test_import_games_xbox(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = self.xbox
        get_id_mock.return_value = 123456
        store = Store.objects.get(slug='xbox-store')
        for game in get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        user = get_user_model().objects.create(username='test', email='test@test.org', gamer_tag='accujazz')

        tasks.import_games(['xbox'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(UserGame.objects.last().game.name, get_games_mock.return_value[-1]['name'])
        self.assertEquals(user.gamer_tag_status, 'ready')
        self.assertEquals(user.games_count, len(self.xbox))
        self.assertEqual(len(mail.outbox), 1)

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.xbox.get_games')
    def test_import_games_xbox_empty(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = []
        get_id_mock.return_value = 123456
        user = get_user_model().objects.create(username='test', email='test@test.org', gamer_tag='accujazz')

        tasks.import_games(['xbox'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.gamer_tag_status, 'error')
        self.assertEquals(user.games_count, 0)
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.xbox.get_games')
    def test_import_games_xbox_error(self, get_games_mock, get_id_mock):
        mail.outbox = []
        get_games_mock.return_value = False
        get_id_mock.return_value = 123456
        user = get_user_model().objects.create(username='test', email='test@test.org', gamer_tag='accujazz_notfound')

        tasks.import_games(['xbox'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.gamer_tag_status, 'error')
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.psn.get_games')
    def test_import_games_psn(self, get_games_mock):
        sys.path.append(settings.BASE_DIR)
        from crawlers.utils.clear import clear_name
        mail.outbox = []
        get_games_mock.return_value = self.psn
        store = Store.objects.get(slug='playstation-store')
        for game in get_games_mock.return_value:
            name = clear_name(game['name'], 'playstation')
            obj, _ = Game.objects.get_or_create(name=name, synonyms=[name.lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        user = get_user_model().objects.create(username='test', email='test@test.org', psn_online_id='dozhdevik')

        tasks.import_games(['playstation'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(UserGame.objects.last().game.name, get_games_mock.return_value[-1]['name'])
        self.assertEquals(user.psn_online_id_status, 'ready')
        self.assertEquals(user.games_count, len(self.psn))
        self.assertEqual(len(mail.outbox), 1)

    @patch('apps.merger.profiles.psn.get_games')
    def test_import_games_psn_empty(self, get_games_mock):
        mail.outbox = []
        get_games_mock.return_value = []
        user = get_user_model().objects.create(username='test', email='test@test.org', psn_online_id='dozhdevik')

        tasks.import_games(['playstation'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.psn_online_id_status, 'error')
        self.assertEquals(user.games_count, 0)
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.psn.get_games')
    def test_import_games_psn_error(self, get_games_mock):
        mail.outbox = []
        get_games_mock.return_value = False
        user = get_user_model().objects.create(
            username='test', email='test@test.org', psn_online_id='dozhdevik_notfound'
        )

        tasks.import_games(['playstation'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.psn_online_id_status, 'error')
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.gog.get_games')
    def test_import_games_gog(self, get_games_mock):
        sys.path.append(settings.BASE_DIR)
        from crawlers.utils.clear import clear_name
        mail.outbox = []
        get_games_mock.return_value = self.gog
        store = Store.objects.get(slug='gog')
        for game in get_games_mock.return_value:
            name = clear_name(game['name'], 'gog')
            obj, _ = Game.objects.get_or_create(name=name, synonyms=[name.lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        user = get_user_model().objects.create(
            username='test', email='test@test.org', gog='https://www.gog.com/u/iBarin/games'
        )

        tasks.import_games(['gog'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(UserGame.objects.last().game.name, get_games_mock.return_value[-1]['name'])
        self.assertEquals(user.gog_status, 'ready')
        self.assertEquals(user.games_count, len(self.gog))
        self.assertEqual(len(mail.outbox), 1)

    @patch('apps.merger.profiles.gog.get_games')
    def test_import_games_gog_empty(self, get_games_mock):
        mail.outbox = []
        get_games_mock.return_value = []
        user = get_user_model().objects.create(username='test', email='test@test.org', gog='Sinkler')

        tasks.import_games(['gog'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.gog_status, 'error')
        self.assertEquals(user.games_count, 0)
        self.assertEqual(len(mail.outbox), 0)

    @patch('apps.merger.profiles.gog.get_games')
    def test_import_games_gog_error(self, get_games_mock):
        mail.outbox = []
        get_games_mock.return_value = False
        user = get_user_model().objects.create(
            username='test', email='test@test.org', gog='dozhdevik_notfound'
        )

        tasks.import_games(['gog'], user, fake_request_by_language(settings.LANGUAGE_EN))
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.gog_status, 'error')
        self.assertEqual(len(mail.outbox), 0)

    # def test_import_games_raptr(self):
    #     mail.outbox = []
    #     platform = Platform.objects.get(slug='pc')
    #     store = Store.objects.get(slug='steam')
    #     for game in self.raptr:
    #         obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
    #         GamePlatform.objects.get_or_create(game=obj, platform=platform)
    #         GameStore.objects.get_or_create(game=obj, store=store)
    #     user = get_user_model().objects.create(username='test', email='test@test.org', raptr=self.raptr)
    #     Raptr.objects.create(name='web', platform=platform)
    #
    #     tasks.import_games(['raptr'], user, fake_request_by_language(settings.LANGUAGE_EN))
    #     call_command('import', **self.command_kwargs)
    #
    #     user = get_user_model().objects.get(username='test')
    #     self.assertEquals(UserGame.objects.last().game.name, self.raptr[-1]['name'])
    #     self.assertEquals(UserGame.objects.last().platforms.first().slug, platform.slug)
    #     self.assertEquals(user.raptr_status, 'ready')
    #     self.assertEquals(Raptr.objects.last().name, 'psn')
    #     self.assertEqual(len(mail.outbox), 1)
    #
    # def test_import_games_raptr_error(self):
    #     mail.outbox = []
    #     user = get_user_model().objects.create(username='test', email='test@test.org',
    #                                            raptr={'error': now().isoformat()})
    #
    #     tasks.import_games(['raptr'], user, fake_request_by_language(settings.LANGUAGE_EN))
    #     call_command('import', **self.command_kwargs)
    #
    #     user = get_user_model().objects.get(username='test')
    #     self.assertEquals(user.raptr_status, 'error')
    #     self.assertEqual(len(mail.outbox), 0)

    @tag('mail')
    def test_finish(self):
        user, _ = get_user_model().objects.get_or_create(
            username='test', email=self.email, source_language=self.language
        )
        fields = {
            'steam_id': 'accujazz',
            'steam_id_status': 'ready',
            'gamer_tag': 'accujazz',
            'gamer_tag_status': 'ready',
            'psn_online_id': 'dozhdevik',
            'psn_online_id_status': 'ready',
        }
        self.assertIsNone(tasks.finish(fields, user.id))

    @tag('mail')
    def test_sync_old_finished(self):
        user, _ = get_user_model().objects.get_or_create(
            username='test', email=self.email, source_language=self.language
        )
        context = {
            'username': user.username,
            'services': ['Steam', 'Xbox'],
        }
        send_email(f'merger/email_{self.language}/sync_old_finished', context, [self.email], language=self.language)

    def test_finish_feed_1(self):
        user, _ = get_user_model().objects.get_or_create(username='test', email='test@test.org')
        game, _ = Game.objects.get_or_create(name='test')
        UserGame.objects.create(game=game, user=user, status=UserGame.STATUS_PLAYING)

        before_feeds = Feed.objects.count()
        fields = {
            'steam_id': 'accujazz',
            'steam_id_status': 'ready',
            'steam_id_games': [
                {
                    'game_id': game.id,
                    'status': UserGame.STATUS_PLAYING,
                },
                {
                    'game_id': game.id + 1,
                    'status': UserGame.STATUS_OWNED,
                },
                {
                    'game_id': game.id + 2,
                    'status': UserGame.STATUS_OWNED,
                },
            ],
            'gamer_tag': 'accujazz',
            'gamer_tag_status': 'ready',
            'gamer_tag_games': [
                {
                    'game_id': game.id + 1,
                    'status': UserGame.STATUS_OWNED,
                },
                {
                    'game_id': game.id + 3,
                    'status': UserGame.STATUS_OWNED,
                },
            ],
        }
        tasks.finish(fields, user.id)

        self.assertEqual(Feed.objects.count(), before_feeds)
        self.assertEqual(len(Feed.objects.last().data['statuses'][UserGame.STATUS_PLAYING]), 1)
        self.assertNotIn(UserGame.STATUS_OWNED, Feed.objects.last().data['statuses'])

    def test_finish_feed_2(self):
        user, _ = get_user_model().objects.get_or_create(username='test', email='test@test.org')

        fields = {
            'steam_id': 'accujazz',
            'steam_id_status': 'ready',
            'steam_id_games': [
                {
                    'game_id': 1,
                    'status': UserGame.STATUS_OWNED,
                },
                {
                    'game_id': 2,
                    'status': UserGame.STATUS_OWNED,
                },
            ],
            'gamer_tag': 'accujazz',
            'gamer_tag_status': 'ready',
            'gamer_tag_games': [
                {
                    'game_id': 1,
                    'status': UserGame.STATUS_OWNED,
                },
                {
                    'game_id': 3,
                    'status': UserGame.STATUS_OWNED,
                },
            ],
        }
        tasks.finish(fields, user.id)

        self.assertIsNone(Feed.objects.last())

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.psn.get_games')
    @patch('apps.merger.profiles.xbox.get_games')
    @patch('apps.merger.profiles.steam.get_games')
    def test_sync_daily(self, steam_get_games_mock, xbox_get_games_mock, psn_get_games_mock,
                        steam_get_id_mock, xbox_get_id_mock):
        mail.outbox = []

        steam_get_games_mock.return_value = self.steam
        store = Store.objects.get(slug='steam')
        for game in steam_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        xbox_get_games_mock.return_value = self.xbox
        store = Store.objects.get(slug='xbox-store')
        for game in xbox_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        psn_get_games_mock.return_value = self.psn
        store = Store.objects.get(slug='playstation-store')
        for game in psn_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        steam_get_id_mock.return_value = 123456
        xbox_get_id_mock.return_value = 123456

        # empty
        call_command('sync', '0', **self.command_kwargs)

        # with users
        user = get_user_model().objects.create(username='test', email='test@test.org')
        user.steam_id = 'accujazz'
        user.steam_id_status = 'ready'
        user.gamer_tag = 'accujazz'
        user.gamer_tag_status = 'ready'
        user.psn_online_id = 'dozhdevik'
        user.psn_online_id_status = 'ready'
        user.last_entered = now() - timedelta(days=1)
        user.save()

        user_another = get_user_model().objects.create(username='test_another', email='test_another@test.org')
        user_another.steam_id = 'accujazz'
        user_another.steam_id_status = 'ready'
        user_another.gamer_tag = 'accujazz'
        user_another.gamer_tag_status = 'ready'
        user_another.last_entered = now() - timedelta(days=1)
        user_another.save()

        user_old = get_user_model().objects.create(username='test_old', email='test_old@test.org')
        user_old.steam_id = 'accujazz'
        user_old.steam_id_status = 'ready'
        user_old.gamer_tag = 'accujazz'
        user_old.gamer_tag_status = 'ready'
        user_old.last_entered = now() - timedelta(weeks=3)
        user_old.save()

        call_command('sync', '0', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        user_another = get_user_model().objects.get(username='test_another')
        user_old = get_user_model().objects.get(username='test_old')

        self.assertEquals(user.steam_id_status, 'ready')
        self.assertEquals(user.gamer_tag_status, 'ready')
        self.assertEquals(user.psn_online_id_status, 'ready')
        self.assertEquals(user.games_count, 10)
        self.assertEquals(user_another.steam_id_status, 'ready')
        self.assertEquals(user_another.gamer_tag_status, 'ready')
        self.assertEquals(user_another.psn_online_id_status, '')
        self.assertEquals(user_another.games_count, 7)
        self.assertEquals(user_old.games_count, 0)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(
            UserGame.objects.filter(last_played__year=2017, last_played__month=8, last_played__day=22).count(), 1
        )

        # retry
        last_user_game = UserGame.objects.last()

        call_command('sync', '0', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        user_another = get_user_model().objects.get(username='test_another')
        user_old = get_user_model().objects.get(username='test_old')

        self.assertEquals(user.games_count, 10)
        self.assertEquals(user_another.games_count, 7)
        self.assertEquals(user_old.games_count, 0)
        self.assertEquals(UserGame.objects.last().added, last_user_game.added)
        self.assertEquals(UserGame.objects.last().created, last_user_game.created)
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(
            UserGame.objects.filter(last_played__year=2017, last_played__month=8, last_played__day=22).count(), 1
        )

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.psn.get_games')
    @patch('apps.merger.profiles.xbox.get_games')
    @patch('apps.merger.profiles.steam.get_games')
    def test_sync_weekly(self, steam_get_games_mock, xbox_get_games_mock, psn_get_games_mock,
                         steam_get_id_mock, xbox_get_id_mock):
        mail.outbox = []

        steam_get_games_mock.return_value = self.steam
        store = Store.objects.get(slug='steam')
        for game in steam_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        xbox_get_games_mock.return_value = self.xbox
        store = Store.objects.get(slug='xbox-store')
        for game in xbox_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        psn_get_games_mock.return_value = self.psn
        store = Store.objects.get(slug='playstation-store')
        for game in psn_get_games_mock.return_value:
            obj, _ = Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
            GameStore.objects.get_or_create(game=obj, store=store)
        steam_get_id_mock.return_value = 123456
        xbox_get_id_mock.return_value = 123456

        # empty
        call_command('sync', '1', **self.command_kwargs)

        # with users
        user = get_user_model().objects.create(username='test', email='test@test.org',
                                               subscribe_mail_synchronization=True)
        user.steam_id = 'accujazz'
        user.steam_id_status = 'ready'
        user.gamer_tag = 'accujazz'
        user.gamer_tag_status = 'ready'
        user.psn_online_id = 'dozhdevik'
        user.psn_online_id_status = 'ready'
        user.last_entered = now() - timedelta(weeks=3)
        user.save()

        user_another = get_user_model().objects.create(username='test_another', email='test_another@test.org',
                                                       subscribe_mail_synchronization=True)
        user_another.steam_id = 'accujazz'
        user_another.steam_id_status = 'ready'
        user_another.gamer_tag = 'accujazz'
        user_another.gamer_tag_status = 'ready'
        user_another.last_entered = now() - timedelta(weeks=3)
        user_another.save()

        user_new = get_user_model().objects.create(username='test_new', email='test_new@test.org',
                                                   subscribe_mail_synchronization=True)
        user_new.steam_id = 'accujazz'
        user_new.steam_id_status = 'ready'
        user_new.gamer_tag = 'accujazz'
        user_new.gamer_tag_status = 'ready'
        user_new.save()

        call_command('sync', '1', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        user_another = get_user_model().objects.get(username='test_another')
        user_new = get_user_model().objects.get(username='test_new')

        self.assertEquals(user.steam_id_status, 'ready')
        self.assertEquals(user.gamer_tag_status, 'ready')
        self.assertEquals(user.psn_online_id_status, 'ready')
        self.assertEquals(user.games_count, 10)
        self.assertEquals(user_another.steam_id_status, 'ready')
        self.assertEquals(user_another.gamer_tag_status, 'ready')
        self.assertEquals(user_another.psn_online_id_status, '')
        self.assertEquals(user_another.games_count, 7)
        self.assertEquals(user_new.games_count, 0)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(
            UserGame.objects.filter(last_played__year=2017, last_played__month=8, last_played__day=22).count(), 1
        )

        # retry
        last_user_game = UserGame.objects.last()
        call_command('sync', '1', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        user_another = get_user_model().objects.get(username='test_another')
        user_new = get_user_model().objects.get(username='test_new')

        self.assertEquals(user.games_count, 10)
        self.assertEquals(user_another.games_count, 7)
        self.assertEquals(user_new.games_count, 0)
        self.assertEquals(UserGame.objects.last().added, last_user_game.added)
        self.assertEquals(UserGame.objects.last().created, last_user_game.created)
        self.assertEqual(len(mail.outbox), 2)
        self.assertEqual(
            UserGame.objects.filter(last_played__year=2017, last_played__month=8, last_played__day=22).count(), 1
        )

    def test_import_empty(self):
        user = get_user_model().objects.create(username='test', email='test@test.org')
        tasks.sync_user(user.id)

        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        self.assertEquals(user.games_count, 0)

    @patch('apps.merger.profiles.xbox.get_id')
    @patch('apps.merger.profiles.steam.get_id')
    @patch('apps.merger.profiles.psn.get_games')
    @patch('apps.merger.profiles.xbox.get_games')
    @patch('apps.merger.profiles.steam.get_games')
    def test_check_import(self, steam_get_games_mock, xbox_get_games_mock, psn_get_games_mock,
                          steam_get_id_mock, xbox_get_id_mock):
        mail.outbox = []

        steam_get_games_mock.return_value = self.steam
        for game in steam_get_games_mock.return_value:
            Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
        xbox_get_games_mock.return_value = self.xbox
        for game in xbox_get_games_mock.return_value:
            Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
        psn_get_games_mock.return_value = self.psn
        for game in psn_get_games_mock.return_value:
            Game.objects.get_or_create(name=game['name'], synonyms=[game['name'].lower()])
        steam_get_id_mock.return_value = 123456
        xbox_get_id_mock.return_value = 123456

        user = get_user_model().objects.create(username='test', email='test@test.org')
        user.steam_id = 'accujazz'
        user.steam_id_status = 'unavailable'
        user.steam_id_date = now() - timedelta(hours=2)
        user.gamer_tag = 'accujazz'
        user.gamer_tag_status = 'unavailable'
        user.gamer_tag_date = now() - timedelta(hours=2)
        user.psn_online_id = 'dozhdevik'
        user.psn_online_id_status = 'unavailable'
        user.psn_online_date = now() - timedelta(hours=2)
        user.save()

        user_another = get_user_model().objects.create(username='test_another', email='test_another@test.org')
        user_another.steam_id = 'accujazz'
        user_another.steam_id_status = 'unavailable'
        user_another.steam_id_date = now() - timedelta(hours=2)
        user_another.gamer_tag = 'accujazz'
        user_another.gamer_tag_status = 'unavailable'
        user_another.gamer_tag_date = now() - timedelta(hours=2)
        user_another.save()

        call_command('check_import', **self.command_kwargs)
        call_command('import', **self.command_kwargs)
        call_command('import', **self.command_kwargs)

        user = get_user_model().objects.get(username='test')
        user_another = get_user_model().objects.get(username='test_another')

        self.assertEquals(user.steam_id_status, 'ready')
        self.assertEquals(user.gamer_tag_status, 'ready')
        self.assertEquals(user.psn_online_id_status, 'ready')
        self.assertEquals(user_another.steam_id_status, 'ready')
        self.assertEquals(user_another.gamer_tag_status, 'ready')
        self.assertEquals(user_another.psn_online_id_status, '')
        self.assertEqual(len(mail.outbox), 2)

        feeds = Feed.objects.all()
        self.assertEqual(feeds.count(), 0)
