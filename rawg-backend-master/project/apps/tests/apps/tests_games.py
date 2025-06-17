import random
from unittest import mock

from bs4 import BeautifulSoup
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Model
from django.test import TestCase, TransactionTestCase

from apps.games.esrb import ESRBConverter
from apps.games.models import Collection, CollectionFeed, CollectionGame, ESRBRating, Game, InGameNewsBase, MadWorldNews
from apps.users.models import UserGame


class GameTestCase(TransactionTestCase):
    def test_get_sitemap_paths(self):
        game = Game.objects.create(name='Kan Wakan')
        game.movies_count = 1
        game.screenshots_count = 2
        game.persons_count = 3
        game.save()

        self.assertEqual(len(game.get_sitemap_paths(settings.MODELTRANSLATION_DEFAULT_LANGUAGE_ISO3)), 2)


class GameTransactionTestCase(TransactionTestCase):
    def test_playtime(self):
        game = Game.objects.create(name='Game')
        user_1 = get_user_model().objects.create(username='test1', email='test1@test.io')
        user_2 = get_user_model().objects.create(username='test2', email='test2@test.io')
        user_3 = get_user_model().objects.create(username='test3', email='test3@test.io')
        user_4 = get_user_model().objects.create(username='test4', email='test4@test.io')
        UserGame.objects.create(game=game, user=user_1, playtime=3123)
        UserGame.objects.create(game=game, user=user_2, playtime=7256)
        UserGame.objects.create(game=game, user=user_3, playtime=120340)

        self.assertEqual(Game.objects.get(id=game.id).playtime, 34)

        self.assertIsNotNone(Game.objects.get(id=game.id).synonyms)

        UserGame.objects.create(game=game, user=user_4, playtime=85241)

        self.assertEqual(Game.objects.get(id=game.id).playtime, 24)


class CollectionFeedTestCase(TestCase):
    def setUp(self):
        self.collection = Collection.objects.create(name='Collection 1')
        game = Game.objects.create(name='Game 1')
        self.collection_game = CollectionGame.objects.create(game=game, collection=self.collection)
        self.content_type = ContentType.objects.get(model='collectiongame')

    def test_add_img_attribute(self):
        collection_feed = CollectionFeed.objects.create(
            collection=self.collection,
            content_type=self.content_type,
            object_id=self.collection_game.id,
        )
        img_tag_1 = '<img src="https://devmedia.ag.ru/pic1.jpg">'
        img_tag_2 = '<img src="https://devmedia.ag.ru/pic2.jpg">'

        collection_feed.text = '{} {}'.format(img_tag_1, img_tag_2)
        collection_feed.save()

        soup = BeautifulSoup(collection_feed.text_safe, 'html.parser')
        tags = soup.find_all('img')

        alt1 = 'Game 1 in Collection 1 - 1'
        alt2 = 'Game 1 in Collection 1 - 2'

        title1 = 'Game 1 AG in Collection 1 - 1'
        title2 = 'Game 1 AG in Collection 1 - 2'

        self.assertEqual(tags[0]['alt'], alt1)
        self.assertEqual(tags[0]['title'], title1)

        self.assertEqual(tags[1]['alt'], alt2)
        self.assertEqual(tags[1]['title'], title2)


class ESRBTestCase(TestCase):
    def setUp(self):
        ESRBRating.objects.create(name='Everyone', short_name='E')
        ESRBRating.objects.create(name='Teen', short_name='T')
        ESRBRating.objects.create(name='Mature', short_name='M')
        self.game = Game.objects.create(name='Game 1')

        self.converter = ESRBConverter()

    def test_convert(self):
        func = self.converter.convert
        self.assertEqual(func('Everyone'), 'E')
        self.assertEqual(
            func('ESRB Rating: Teen (with Violence, Blood), USK Rating: Approved for children aged 16 and above'), 'M'
        )
        self.assertEqual(func('ESRB Rating: Mature (with Animated Blood and Gore)'), 'M')
        self.assertEqual(func('Adults only 18+'), 'AO')
        self.assertEqual(func('TEEN'), 'T')
        self.assertEqual(func('0'), 'E')

    def test_get_esrb_rating_mapping(self):
        func = self.converter._get_esrb_rating_mapping
        self.assertEqual(func(0), 'E')
        self.assertEqual(func(12), 'T')
        self.assertEqual(func(17), 'M')
        self.assertEqual(func(21), 'AO')

    def test_retrieve_age_from_str(self):
        func = self.converter._retrieve_age_from_str
        self.assertEqual(func('Everyone'), None)
        self.assertEqual(func('Adults only 18+'), 'AO')
        self.assertEqual(func('0'), 'E')


class InGameNewsTestCase(TestCase):
    def setUp(self):
        self.news = [InGameNewsBase() for _ in range(10)]

    @mock.patch.object(Model, 'save', return_value=None)
    def test_save(self, mocked_save):
        for news_item in self.news:
            self.assertIsNone(news_item.published)

            news_item.save()
            self.assertIsNone(news_item.published)

            news_item.is_active = True
            news_item.save()
            self.assertIsNotNone(news_item.published)


class MadWorldNewsTestCase(TestCase):
    def test_save(self):
        for i in range(10):
            for index, (board, _) in enumerate(MadWorldNews.BOARDS):
                news_item = MadWorldNews(subject=f'subject_{i}_{board}', content='content', board=board)
                self.assertIsNone(news_item.published)
                self.assertIsNone(news_item.wr_id)

                news_item.save()
                self.assertIsNone(news_item.published)
                self.assertIsNone(news_item.wr_id)

                count_published = MadWorldNews.objects.active().filter(board=board).count()

                news_item.is_active = True
                news_item.save()

                self.assertIsNotNone(news_item.published)
                self.assertEqual(news_item.wr_id, count_published + 1)
