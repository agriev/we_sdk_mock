from django.test import TestCase, TransactionTestCase

from apps.games.models import Game, GamePlatform, Platform

from . import GamesBaseTestCase


class PlatformsTestCase(GamesBaseTestCase, TestCase):
    def test_platforms_platform(self):
        platform = Platform.objects.first()
        response = self.client.get('/api/platforms/{}'.format(platform.slug), HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn('description', response_data)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

        platform = Platform.objects.last()
        platform.description = 'seo test'
        platform.image_background = 'https://d.com/images/66acd000-77fe-1000-9115-d802584112a5/screenlg18.jpg'
        platform.image_background_custom = 'platforms-backgrounds/dab76985c670c4e4c5e9316391c41ed2.JPG'
        platform.year_start = 1995
        platform.save()
        response = self.client.get('/api/platforms/{}'.format(platform.slug), HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertTrue(response_data['image_background'].endswith(platform.image_background_custom.name))
        self.assertEqual(response_data['year_start'], platform.year_start)
        self.assertEqual(response_data['year_end'], platform.year_end)
        self.assertIn('description', response_data)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)


class PlatformsTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def test_platforms(self):
        game_1 = Game.objects.create(name='The One I Love')
        game_2 = Game.objects.create(name='All The Best')
        platform_1 = Platform.objects.first()
        platform_2 = Platform.objects.last()

        self.assertEqual(self.client.get('/api/platforms').status_code, 200)

        GamePlatform.objects.create(game=game_1, platform=platform_1)

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/platforms', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            self.assertEqual(row['games_count'], int(platform_1.slug == row['slug']))
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

        game_platform = GamePlatform.objects.create(game=game_1, platform=platform_2)

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/platforms', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            self.assertEqual(
                row['games_count'],
                int(platform_1.slug == row['slug'] or platform_2.slug == row['slug']),
            )

        game_platform = GamePlatform.objects.get(id=game_platform.id)
        game_platform.game = game_2
        game_platform.save()

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/platforms', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            self.assertEqual(
                row['games_count'],
                int(platform_1.slug == row['slug'] or platform_2.slug == row['slug']),
            )

        game_platform = GamePlatform.objects.get(id=game_platform.id)
        game_platform.platform = platform_1
        game_platform.save()

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/platforms', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            self.assertEqual(row['games_count'], 2 if platform_1.slug == row['slug'] else 0)


class ParentPlatformsTestCase(GamesBaseTestCase, TestCase):
    def test_platforms_parents(self):
        self.assertEqual(self.client.get('/api/platforms/parents').status_code, 200)
