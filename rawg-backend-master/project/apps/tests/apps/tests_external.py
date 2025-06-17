import json
from unittest.mock import patch

import feedparser
from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from apps.credits.models import Person, Position
from apps.external.management.commands import twitch, wiki
from apps.external.models import Imgur, Reddit, Twitch, Youtube
from apps.games.models import Game, Platform


class BaseTestCase(TestCase):
    def setUp(self):
        self.command_kwargs = {}
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')
        super().setUp()

    def tearDown(self):
        if 'stdout' in self.command_kwargs:
            self.command_kwargs['stdout'].close()
        super().tearDown()


class RedditTestCase(BaseTestCase):
    @patch('apps.external.management.commands.reddit.get_feed')
    def test_command(self, get_feed_mock):
        get_feed_mock.return_value = feedparser.parse('file:///app/project/apps/tests/fixtures/reddit.rss')
        game = Game.objects.create(name='My game', reddit_url='uncharted')

        call_command('reddit', **self.command_kwargs)

        game = Game.objects.get(id=game.id)
        self.assertEqual(game.reddit_url, 'https://www.reddit.com/r/uncharted/')
        self.assertEqual(game.reddit_name, 'Uncharted Subreddit')
        self.assertEqual(game.reddit_description, 'This subreddit is for discussing and sharing anything relating to '
                                                  'Naughty Dog\'s Uncharted series of video games on Playstation '
                                                  'consoles and/or the bonus adventures in other mediums.')
        self.assertEqual(game.reddit_logo, 'https://b.thumbs.redditmedia.com/'
                                           'F3d0w20HPKzEiMxcP50eU4cYaaC0Nt4bJQPA1ixUBYo.png')
        self.assertEqual(Reddit.objects.count(), 27)

        empty = Reddit.objects.get(url='https://www.reddit.com/r/uncharted/comments/7fh20m/'
                                       'how_would_you_rank_the_uncharted_games/')
        self.assertEqual(empty.username, '')
        self.assertEqual(get_feed_mock.call_count, 1)


class MetacriticTestCase(BaseTestCase):
    def setUp(self):
        self.metacritic_url = 'http://www.metacritic.com/game/playstation-4/the-witcher-3-wild-hunt'
        self.game = Game.objects.create(
            name='My game',
            metacritic_url=self.metacritic_url,
        )
        Platform.objects.create(name='PC')
        Platform.objects.create(name='PlayStation 4')
        Platform.objects.create(name='Xbox One')
        super().setUp()

    @patch('apps.external.metacritic.MetacriticParser.get')
    @patch('apps.external.metacritic.MetacriticParser.get_metascore')
    def test_command(self, get_metascore_mock, get_mock):
        get_metascore_mock.return_value = [('PC', 100, self.metacritic_url)]
        get_mock.return_value = '<html></html>'

        self.command_kwargs.update({'game_id': self.game.id})
        call_command('metacritic', **self.command_kwargs)

        self.assertEqual(Game.objects.get(id=self.game.id).metacritic, 100)

        get_mock.assert_called_once()
        get_metascore_mock.assert_called_once()


class TwitchTestCase(BaseTestCase):
    @patch.object(twitch.Command, 'get_id')
    @patch.object(twitch.Command, 'get_videos')
    def test_command(self, get_videos_mock, get_id_mock):
        get_id_mock.return_value = 123456
        with open('/app/project/apps/tests/fixtures/twitch.json', 'r') as fp:
            get_videos_mock.return_value = json.load(fp)['data']
        game = Game.objects.create(name='My game', added=settings.POPULAR_GAMES_MIN_ADDED)

        call_command('twitch', **self.command_kwargs)

        game = Game.objects.get(id=game.id)
        self.assertEqual(game.twitch_id, get_id_mock.return_value)
        self.assertEqual(Twitch.objects.count(), len(get_videos_mock.return_value))
        get_videos_mock.assert_called_once_with(get_id_mock.return_value)


class YoutubeTestCase(BaseTestCase):
    @patch('apps.external.management.commands.youtube.get_videos')
    def test_command(self, get_videos_mock):
        with open('/app/project/apps/tests/fixtures/youtube.json', 'r') as fp:
            get_videos_mock.return_value = json.load(fp), 53, None
        game = Game.objects.create(name='My game', added=settings.POPULAR_GAMES_MIN_ADDED)

        call_command('youtube', **self.command_kwargs)

        game = Game.objects.get(id=game.id)
        self.assertEqual(Youtube.objects.count(), len(get_videos_mock.return_value[0]))
        self.assertEqual(
            game.youtube_counts[settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3],
            get_videos_mock.return_value[1]
        )
        get_videos_mock.assert_called_once_with(
            query=game.name, relevanceLanguage=settings.MODELTRANSLATION_DEFAULT_LANGUAGE
        )


class ImgurTestCase(BaseTestCase):
    @patch('apps.external.management.commands.imgur.get_images')
    def test_command(self, get_images_mock):
        with open('/app/project/apps/tests/fixtures/imgur.json', 'r') as fp:
            get_images_mock.return_value = json.load(fp)
        game = Game.objects.create(name='My game', added=settings.POPULAR_GAMES_MIN_ADDED)

        call_command('imgur', **self.command_kwargs)

        game = Game.objects.get(id=game.id)
        self.assertEqual(Imgur.objects.count(), len(get_images_mock.return_value))
        self.assertEqual(get_images_mock.call_count, 1)


class WikiTestCase(BaseTestCase):
    def test_write(self):
        game = Game.objects.create(name='My game')
        cmd = wiki.Command()
        cmd.stdout = open('/dev/null', 'w')
        cmd.options = {'without_persons': False}

        self.assertEqual(Position.objects.count(), 0)
        self.assertEqual(Person.objects.count(), 0)

        cmd.write({
            'Composer': {
                'wikibase_id': '123',
                'persons': {
                    'Jimi': {
                        'name': 'Jimi',
                        'wikibase_id': '123',
                    }
                }
            }
        }, game)

        self.assertEqual(Position.objects.count(), 1)
        self.assertEqual(Person.objects.count(), 1)

        cmd.write({
            'Prgrammer': {
                'wikibase_id': '234',
                'persons': {
                    'Joseph': {
                        'name': 'Joseph',
                        'wikibase_id': '234',
                    }
                }
            }
        }, game)

        self.assertEqual(Position.objects.count(), 2)
        self.assertEqual(Person.objects.count(), 2)

        person = Person.objects.get(name='Jimi')
        person.add_synonym('JIM')
        person.save()

        cmd.write({
            'Designer': {
                'wikibase_id': '123',
                'persons': {
                    'Jim': {
                        'name': 'Jim',
                        'wikibase_id': '123',
                    }
                }
            }
        }, game)

        self.assertEqual(Position.objects.count(), 3)
        self.assertEqual(Person.objects.count(), 2)
