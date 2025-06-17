import os

from django.conf import settings
from django.core.management import call_command

from apps.celery import app as celery


@celery.task(time_limit=180, ignore_result=True)
def update_reddit(game_id, old, new, clean):
    from apps.external.models import Reddit
    if not new.startswith('https://'):
        new = settings.REDDIT_URL.format(new)
    if new != old or clean:
        Reddit.objects.filter(game_id=game_id).delete()
    with open(os.devnull, 'w') as f:
        call_command('reddit', game_id=game_id, stdout=f)


@celery.task(time_limit=180, ignore_result=True)
def update_metacritic(game_id):
    if settings.ENVIRONMENT == 'TESTS':
        return
    with open(os.devnull, 'w') as f:
        call_command('metacritic', game_id=game_id, stdout=f)


@celery.task(time_limit=180, ignore_result=True)
def update_twitch(game_id):
    if settings.ENVIRONMENT == 'TESTS':
        return
    with open(os.devnull, 'w') as f:
        call_command('twitch', game_id=game_id, stdout=f)


@celery.task(time_limit=180, ignore_result=True)
def update_youtube(game_id):
    if settings.ENVIRONMENT == 'TESTS':
        return
    with open(os.devnull, 'w') as f:
        call_command('youtube', game_id=game_id, stdout=f)


@celery.task(time_limit=180, ignore_result=True)
def update_imgur(game_id):
    if settings.ENVIRONMENT == 'TESTS':
        return
    with open(os.devnull, 'w') as f:
        call_command('imgur', game_id=game_id, stdout=f)


@celery.task(time_limit=180, ignore_result=True)
def update_wiki(game_id):
    if settings.ENVIRONMENT == 'TESTS':
        return
    with open(os.devnull, 'w') as f:
        call_command('wiki', game_id=game_id, stdout=f)
