from datetime import timedelta
from time import sleep

from django.contrib.auth import get_user_model
from django.utils.timezone import now

from apps.achievements.models import Achievement, UserAchievement
from apps.merger.models import Network
from apps.merger.profiles import xbox
from apps.merger.tasks.common import get_game_cached, save_games
from apps.utils.api import get_object_or_none


def pause():
    sleep(1)


def xbox_achievements(gamer_uid, user_id, games=None, is_fast=False):
    network, _ = Network.objects.get_or_create(name='Xbox')
    # detect synchronization period
    last_sync = get_user_model().objects.values_list('last_sync_xbox', flat=True).get(id=user_id)
    # iterate games
    for game in games:
        # detect last synchronization date to skip already synchronized games
        compare_date = None
        if is_fast:
            compare_date = now() - timedelta(days=is_fast)
        elif last_sync:
            compare_date = last_sync - timedelta(days=2)
        if compare_date and game['last_played'] and game['last_played'] < compare_date:
            continue
        # get achievements for this game
        achievements = xbox.get_achievements(game['titleId'], gamer_uid, game.get('lastPlayed'))
        if not achievements:
            continue
        # iterate achievements
        game_instance, game_name = get_game_cached(game['titleId'], game['name'], network.slug)
        for achieve in achievements:
            uid = Achievement.get_uid(game['titleId'], achieve['id'])
            achievement = get_object_or_none(Achievement, uid=uid, network=network)
            if not achievement:
                achievement = Achievement.create_or_update(
                    uid, achieve['name'], game_instance, game_name,
                    achieve['description'], achieve['image'], network, achieve['hidden']
                )
            if achieve['earned']:
                UserAchievement.objects.get_or_create(
                    user_id=user_id, achievement=achievement, defaults={'achieved': achieve['earned_time']}
                )
        pause()


def xbox_games(gamer_tag, user_id, is_sync=False, is_fast=False, gamer_uid=None, disable_achievements=False):
    started = now()

    if is_sync and gamer_uid:
        pass
    else:
        gamer_uid = xbox.get_id(gamer_tag, timeout=30)
        get_user_model().objects.filter(id=user_id).update(gamer_tag_uid=gamer_uid or '')

    games = xbox.get_games(gamer_uid, timeout=30)
    if not games:
        return {
            'gamer_tag': gamer_tag,
            'gamer_tag_status': 'error',
            'gamer_tag_date': now(),
            'gamer_tag_duration': (now() - started).seconds,
        }

    is_achievements = is_sync and not disable_achievements
    if is_achievements:
        xbox_achievements(gamer_uid, user_id, games, is_fast)

    return save_games(games, user_id, 'gamer_tag', gamer_tag, is_sync, is_fast, is_achievements, started)
