import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.test import TestCase

from apps.common import sitemap
from apps.credits.models import Person
from apps.discussions.models import Discussion
from apps.games.models import Collection, Game, GameStore, Genre, ScreenShot, Store
from apps.reviews.models import Review
from apps.suggestions.models import Suggestion


class SitemapTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games',
    ]

    def setUp(self):
        self.user = get_user_model().objects.create(
            username='Joe Cocker', email='joe@test.io', games_count=100, reviews_text_count=10
        )
        super().setUp()

    def test_static(self):
        cls = sitemap.StaticSitemap()
        with self.assertNumQueries(0):
            self.assertTrue(cls.items()[0])

    def test_games(self):
        Game.objects.all().update(description='Description' * 100, added=15)
        cls = sitemap.GamesSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_games_filters(self):
        cls = sitemap.GamesFiltersSitemap()
        for i, genre in enumerate(Genre.objects.all()):
            if not i:
                continue
            genre.hidden = True
            genre.save(update_fields=['hidden'])
        store_id = None
        for i, store in enumerate(Store.objects.all()):
            if not i:
                store_id = store.id
                continue
            store.delete()
        for i in range(0, 10):
            Game.objects.create(name=f'Bulk Game {i}')
        data = []
        for game_id in Game.objects.values_list('id', flat=True):
            data.append(GameStore(game_id=game_id, store_id=store_id))
        GameStore.objects.bulk_create(data)
        with self.assertNumQueries(5):
            self.assertTrue(cls.items()[0])

    def test_collections(self):
        Collection.objects.create(
            name='Stereophonics', creator=self.user, games_count=21, language=settings.LANGUAGE_ENG
        )
        cls = sitemap.CollectionsSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_reviews(self):
        Review.objects.create(
            text='Good Very' * 100, rating=Review.RATING_RECOMMENDED, game=Game.objects.first(), user=self.user,
            language=settings.LANGUAGE_ENG
        )
        cls = sitemap.ReviewsSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_discussions(self):
        Discussion.objects.create(
            text='I Am Kloot' * 100, game=Game.objects.first(), user=self.user, language=settings.LANGUAGE_ENG
        )
        cls = sitemap.DiscussionsSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_persons(self):
        Person.objects.create(name='John Bramwell', games_count=30)
        cls = sitemap.PersonsSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_users(self):
        cls = sitemap.UsersSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_suggestions(self):
        Suggestion.objects.create(name='Nazareth')
        cls = sitemap.SuggestionsSitemap()
        with self.assertNumQueries(1):
            self.assertTrue(cls.items()[0])

    def test_images(self):
        Site.objects.clear_cache()
        screen = ScreenShot.objects.create(game=Game.objects.first(), source='https://google.com/image.jpg')
        image = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'image_1.jpg')
        with open(image, 'rb') as f:
            screen.image.save('image.jpg', f)
        cls = sitemap.ImagesSitemap()
        with self.assertNumQueries(6):
            self.assertTrue(cls.items()[0])
