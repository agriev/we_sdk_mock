from datetime import datetime

import pytz
from django.utils.timezone import now

from apps.merger.tasks.common import save_games
from apps.utils.api import get_object_or_none


def raptr_games(raptr_data, user_id, is_sync=None, disable_achievements=False):
    from apps.merger.models import Raptr

    try:
        if not type(raptr_data) is list:
            raise KeyError

        games = []
        for game in raptr_data:
            name = game['title'].split('(')[0].strip()
            platform = game['title'].split('(').pop().strip(' )').lower().replace(' ', '-')
            raptr = get_object_or_none(Raptr, name=platform)
            if raptr and raptr.platform:
                platform = raptr.platform.slug
            try:
                playtime = abs(int(game['total_playtime_seconds']))
            except ValueError:
                playtime = 0
            try:
                last_played = abs(int(game.get('last_played_timestamp')))
            except ValueError:
                last_played = 0
            games.append({
                'name': name,
                'set_platforms': [platform],
                'playtime': playtime,
                'raptr': True,
                'last_played': datetime.fromtimestamp(last_played).replace(tzinfo=pytz.UTC) if last_played else None
            })

        results = save_games(games, user_id, 'raptr', raptr_data)
        results['raptr_id'] = '<file>'
        del results['raptr']

        return results
    except KeyError:
        return {
            'raptr_id': '<file>',
            'raptr_status': 'error',
            'raptr_date': now()
        }
