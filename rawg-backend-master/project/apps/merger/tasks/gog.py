from django.utils.timezone import now

from apps.merger.profiles import gog
from apps.merger.tasks.common import save_games


def gog_games(gog_id, user_id, is_sync=False, is_fast=False, disable_achievements=False):
    started = now()

    games = gog.get_games(gog_id, timeout=30)
    if not games:
        return {
            'gog': gog_id,
            'gog_status': 'error',
            'gog_date': now(),
            'gog_duration': (now() - started).seconds,
        }

    is_achievements = is_sync and not disable_achievements
    if is_achievements:
        pass

    return save_games(games, user_id, 'gog', gog_id, is_sync, is_fast, is_achievements, started)
