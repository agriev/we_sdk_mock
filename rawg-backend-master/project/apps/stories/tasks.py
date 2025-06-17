from django.db import transaction

from apps.celery import app as celery
from apps.stories import models
from apps.stories.stories import StoryDownloader, StoryGenerator
from apps.utils.tasks import send_slack


@celery.task(time_limit=1800, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def make_clip(game_story_id, game_id):
    try:
        game_story = models.GameStory.objects.get(id=game_story_id)
    except models.GameStory.DoesNotExist:
        return
    StoryGenerator(game_story, game_id)
    if not game_story.is_error:
        with transaction.atomic():
            models.UserGameStory.objects.filter(game_story_id=game_story_id).delete()
            models.UserStory.objects.filter(story_id=game_story.story_id).delete()


@celery.task(time_limit=1800, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def make_download(story_id, clip_length, clips_count):
    try:
        story = models.Story.objects.get(id=story_id)
    except models.Story.DoesNotExist:
        return
    downloader = StoryDownloader(story, clip_length, clips_count)
    send_slack.delay(downloader.link, 'Stories Generator', ':video_camera:', '#content')
