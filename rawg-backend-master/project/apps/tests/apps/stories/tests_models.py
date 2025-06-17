from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.games.models import Game
from apps.stories.models import Clip, GameStory, Story, UserStory


class ModelTestCase(TestCase):
    fixtures = [
        'games_platforms_parents', 'games_platforms', 'games_stores', 'games_developers',
        'games_publishers', 'games_genres', 'games_tags', 'games_games', 'games_esrbratings',
    ]

    def setUp(self):
        self.story = Story.objects.create(name='Story 1')
        self.user_1, _ = get_user_model().objects.get_or_create(username='nick', email='nick@test.io')

    def test_check_ready_without_game_stories(self):
        self.story.check_ready()
        self.assertFalse(self.story.is_ready)
        self.assertTrue(self.story.hidden)

    def test_check_ready_with_game_stories(self):
        game = Game.objects.get(name='Grand Theft Auto: Vice City')
        clip = Clip.objects.create(game=game)
        GameStory.objects.create(game=game, story=self.story, clip=clip)
        self.story.check_ready()
        self.assertEqual(Story.objects.get(id=self.story.id).background, game.background_image)
        self.assertTrue(Story.objects.get(id=self.story.id).is_ready)

    def test_get_many_context(self):
        UserStory.objects.create(user=self.user_1, story=self.story)
        user_stories = list(UserStory.objects.filter(
            user=self.user_1,
            story__in=[story.pk for story in [self.story]]
        ).values_list('story_id', flat=True))
        self.assertIn(self.story.id, user_stories)
