from django.test import TransactionTestCase

from apps.games.models import Game, Genre

from . import GamesBaseTestCase


class GenresTestCase(GamesBaseTestCase, TransactionTestCase):
    def test_genres_genre(self):
        genre = Genre.objects.create(name='Music Shooter', hidden=False)
        response = self.client.get('/api/genres/{}'.format(genre.slug), HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn('description', response_data)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

        genre = Genre.objects.create(name='Movie Adventure', hidden=False)
        genre.description = 'seo test'
        genre.save()
        response = self.client.get('/api/genres/{}'.format(genre.slug), HTTP_X_API_CLIENT='website')
        self.assertEqual(response.status_code, 200)
        response_data = response.json()
        self.assertIn('description', response_data)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)


class GenresTransactionTestCase(GamesBaseTestCase, TransactionTestCase):
    def test_genres(self):
        game_1 = Game.objects.create(name='The One I Love')
        game_2 = Game.objects.create(name='All The Best')
        genre_1 = Genre.objects.create(name='Music Shooter', hidden=False)
        genre_2 = Genre.objects.create(name='Movie Adventure', hidden=False)

        self.assertEqual(self.client.get('/api/genres').status_code, 200)

        game_1.genres.add(genre_1)

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/genres', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            if genre_1.slug == row['slug']:
                self.assertEqual(row['games_count'], 1)
        self.assertIn('seo_title', response_data)
        self.assertIn('seo_description', response_data)
        self.assertIn('seo_h1', response_data)

        game_2.genres.add(genre_2)

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/genres', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            if genre_1.slug == row['slug'] or genre_2.slug == row['slug']:
                self.assertEqual(row['games_count'], 1)

        game_2.genres.remove(genre_2)
        game_2.genres.add(genre_1)

        with self.assertNumQueries(4):
            response_data = self.client.get('/api/genres', HTTP_X_API_CLIENT='website').json()
        for row in response_data['results']:
            if genre_1.slug == row['slug']:
                self.assertEqual(row['games_count'], 2)
            if genre_2.slug == row['slug']:
                self.assertEqual(row['games_count'], 0)
