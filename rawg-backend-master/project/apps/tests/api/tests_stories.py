from django.contrib.auth import get_user_model
from django.test import Client, TestCase
from rest_framework.authtoken.models import Token

from apps.games.models import Game
from apps.stories import models


class StoriesTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        game_0 = Game.objects.create(name='Peter Buck')
        game_1 = Game.objects.create(name='Mike Mills')
        self.story_0 = models.Story.objects.create(name='Story 1', hidden=False, first={'game_id': game_0.id})
        self.story_1 = models.Story.objects.create(name='Story test', hidden=False, first={'game_id': game_1.id})
        self.story_2 = models.Story.objects.create(name='Story 2 hidden', hidden=True, first={'game_id': game_1.id})

        models.GameStory.objects.create(
            story=self.story_0,
            game=game_0,
            clip=models.Clip.objects.create(
                game=game_0,
                video=models.Video.objects.create(youtube_id='123', game=game_0)
            )
        )
        models.GameStory.objects.create(
            story=self.story_1,
            game=game_1,
            clip=models.Clip.objects.create(
                game=game_1,
                video=models.Video.objects.create(youtube_id='234', game=game_1)
            )
        )
        self.user_1, _ = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')
        self.token_1 = Token.objects.get_or_create(user=self.user_1)[0].key
        kwargs = {'HTTP_TOKEN': 'Token {}'.format(self.token_1)}
        self.client_auth = Client(**kwargs)
        super().setUp()

    def test_stories(self):
        with self.assertNumQueries(6):
            response = self.client.get('/api/stories')
        self.assertEqual(response.json()['results'][0]['name'], self.story_0.name)
        self.assertTrue(response.json()['results'][0]['has_new_games'])

        with self.assertNumQueries(2):
            response = self.client.get(f'/api/stories/{self.story_2.slug}')
        self.assertEqual(response.json()['name'], self.story_2.name)

    def test_stories_viewed(self):
        self.client_auth.patch(
            '/api/stories/viewed',
            data={'story_id': self.story_0.id},
            content_type='application/json',
        )
        with self.assertNumQueries(13):
            response = self.client_auth.get('/api/stories').json()
        self.assertFalse(response['results'][1]['has_new_games'])

        game = Game.objects.create(name='Ken Walkan')
        models.GameStory.objects.create(
            story=self.story_0,
            game=game,
            clip=models.Clip.objects.create(
                game=game,
                video=models.Video.objects.create(youtube_id='345', game=game)
            )
        )
        models.UserStory.objects.filter(user=self.user_1, story=self.story_0).delete()

        with self.assertNumQueries(13):
            response = self.client_auth.get('/api/stories').json()
        self.assertTrue(response['results'][0]['has_new_games'])
        self.assertFalse(response['results'][0]['videos'][0]['new'])
        self.assertTrue(response['results'][0]['videos'][1]['new'])
        self.assertTrue(response['results'][1]['has_new_games'])

        self.client_auth.patch(
            '/api/stories/viewed',
            data={'story_id': self.story_0.id},
            content_type='application/json',
        )

        with self.assertNumQueries(13):
            response = self.client_auth.get('/api/stories').json()
        self.assertTrue(response['results'][0]['has_new_games'])
        self.assertFalse(response['results'][1]['has_new_games'])
        self.assertFalse(response['results'][1]['videos'][0]['new'])
        self.assertFalse(response['results'][1]['videos'][1]['new'])

    def test_stories_viewed_ids(self):
        response = self.client_auth.patch(
            '/api/stories/viewed',
            data={'story_id': self.story_0.id},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        viewed_ids = list(models.UserStory.objects.filter(user=self.user_1).values_list('story_id', flat=True))
        self.assertIn(self.story_0.id, viewed_ids)

    def test_stories_sorting(self):
        response = self.client_auth.patch(
            '/api/stories/viewed',
            data={'story_id': self.story_0.id},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        with self.assertNumQueries(13):
            response = self.client_auth.get('/api/stories').json()
        self.assertEqual(response['results'][0]['name'], self.story_1.name)
        self.assertTrue(response['results'][0]['has_new_games'])
        self.assertFalse(response['results'][1]['has_new_games'])

    def test_stories_only_new(self):
        response = self.client_auth.patch(
            '/api/stories/viewed',
            data={'story_id': self.story_0.id},
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 200)
        with self.assertNumQueries(13):
            response = self.client_auth.get('/api/stories', {'only_new': True})
        self.assertEqual(response.json()['count'], 1)
        self.assertEqual(response.json()['results'][0]['name'], self.story_1.name)

    def test_stories_short(self):
        with self.assertNumQueries(2):
            response = self.client.get('/api/stories', {'short': True})
        self.assertEqual(response.json()['count'], 2)
        with self.assertNumQueries(6):
            response = self.client_auth.get('/api/stories', {'short': True})
        self.assertEqual(response.json()['count'], 2)

    def test_stories_random_partners(self):
        with self.assertNumQueries(2):
            response = self.client.get('/api/stories', {'short': True, 'random_partners': True})
        self.assertEqual(response.json()['count'], 2)
        with self.assertNumQueries(6):
            response = self.client_auth.get('/api/stories', {'short': True, 'random_partners': True})
        self.assertEqual(response.json()['count'], 2)
