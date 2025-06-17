from django.db.models import Count

from apps.celery import app as celery
from apps.files import models
from apps.games.models import Game


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_games_counters(game_id):
    Game.objects.filter(id=game_id).update(files_count={
        'demos': models.File.objects.filter(game_id=game_id, category=models.File.CATEGORY_1).count(),
        'patches': models.File.objects.filter(game_id=game_id, category=models.File.CATEGORY_2).count(),
        'cheats': models.CheatCode.objects.filter(game_id=game_id).count(),
        'cheats_categories': dict(
            models.CheatCode.objects.filter(game_id=game_id)
            .values_list('category').annotate(count=Count('id')).order_by('-count')
        ),
    })
