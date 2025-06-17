from django.conf import settings

from apps.celery import app as celery
from apps.games.models import Game


@celery.task(time_limit=60, ignore_result=True, acks_late=True, reject_on_worker_lost=True)
def update_discussions_totals(game_id):
    game = Game.objects.only('id').get(id=game_id)
    game.discussions_count_all = game.discussions.visible().count()
    counts = {}
    for lang, _ in settings.LANGUAGES:
        lang_iso3 = settings.LANGUAGES_2_TO_3[lang]
        counts[lang_iso3] = game.discussions.visible().filter(language=lang_iso3).count()
    game.discussions_counts = counts
    game.save(update_fields=['discussions_count_all', 'discussions_counts'])
