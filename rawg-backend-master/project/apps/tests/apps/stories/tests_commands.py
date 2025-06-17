import os
from shutil import copyfile

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from apps.games.models import Game
from apps.stories.models import Clip


class CommandTestCase(TestCase):
    def setUp(self):
        self.command_kwargs = {}
        video = os.path.join(settings.BASE_DIR, 'project', 'apps', 'tests', 'fixtures', 'video_1.mp4')
        self.video = '/tmp/video.jpg'
        copyfile(video, self.video)
        if settings.TESTS_ENVIRONMENT != 'DOCKER':
            self.command_kwargs['stdout'] = open('/dev/null', 'w')

    def test_rebuild_clips_thumbnails(self):
        game = Game.objects.create(name='James Walsh')
        clip_id = Clip.objects.create(game=game, clip=self.video).id
        call_command('rebuild_clips_thumbnails', **self.command_kwargs)
        clip = Clip.objects.get(id=clip_id)
        self.assertTrue(clip.clip_640)
        self.assertTrue(clip.clip_320)
